/**
 * Idempotent seed script: `npm run seed`
 *
 * - Upserts one account per role with the documented credentials (re-running resets
 *   those passwords to the known values).
 * - Creates demo borrowers and, only for a demo borrower that has no loans yet, one demo
 *   loan in a given lifecycle stage. Existing loans and payments are never modified or
 *   deleted, so re-running is safe.
 * - Refuses to run with NODE_ENV=production unless `--allow-production` is passed.
 */
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import { User, IUser } from '../models/User.model.js';
import { Loan, ILoan } from '../models/Loan.model.js';
import { Payment } from '../models/Payment.model.js';
import { ROLES } from '../constants/roles.js';
import { LOAN_STATUS } from '../constants/loanStatus.js';
import { EMPLOYMENT_MODE } from '../constants/loanConfig.js';
import { calculateLoanDetails, roundMoney } from '../services/loanCalculator.js';
import { historyEntry } from '../services/loanHistory.js';
import { uploadDir } from '../middleware/upload.js';
import { BCRYPT_ROUNDS } from '../modules/auth/auth.service.js';

export const SEED_ACCOUNTS = [
  { name: 'System Admin', email: 'admin@lms.com', password: 'Admin@123', role: ROLES.ADMIN },
  { name: 'Sales Executive', email: 'sales@lms.com', password: 'Sales@123', role: ROLES.SALES },
  { name: 'Sanction Officer', email: 'sanction@lms.com', password: 'Sanction@123', role: ROLES.SANCTION },
  { name: 'Disbursement Manager', email: 'disbursement@lms.com', password: 'Disburse@123', role: ROLES.DISBURSEMENT },
  { name: 'Collection Agent', email: 'collection@lms.com', password: 'Collect@123', role: ROLES.COLLECTION },
  { name: 'Primary Borrower', email: 'borrower@lms.com', password: 'Borrower@123', role: ROLES.BORROWER },
] as const;

const DEMO_BORROWER_PASSWORD = 'Borrower@123';
const DEMO_SLIP_NAME = 'demo-salary-slip.pdf';
// File name referenced by demo loans created by an earlier version of this script.
const LEGACY_DEMO_SLIP_NAME = 'demo_salary_slip.pdf';
const DAY_MS = 24 * 60 * 60 * 1000;

type DemoStage = 'REGISTERED' | 'PROFILE_SAVED' | 'SLIP_UPLOADED' | 'APPLIED' | 'SANCTIONED' | 'DISBURSED' | 'CLOSED' | 'REJECTED';

const DEMO_BORROWERS: Array<{ name: string; email: string; pan: string; stage: DemoStage }> = [
  { name: 'Ananya Roy', email: 'ananya.roy@example.com', pan: 'ANANR1234A', stage: 'REGISTERED' },
  { name: 'Neha Iyer', email: 'neha.iyer@example.com', pan: 'NEHAI4321N', stage: 'PROFILE_SAVED' },
  { name: 'Arjun Nair', email: 'arjun.nair@example.com', pan: 'ARJUN6789N', stage: 'SLIP_UPLOADED' },
  { name: 'Amit Verma', email: 'amit.verma@example.com', pan: 'AMITV5432P', stage: 'APPLIED' },
  { name: 'Priya Sharma', email: 'priya.sharma@example.com', pan: 'PRIYA2345S', stage: 'APPLIED' },
  { name: 'Vikram Mehta', email: 'vikram.mehta@example.com', pan: 'VIKRM9876M', stage: 'SANCTIONED' },
  { name: 'Sneha Patel', email: 'sneha.patel@example.com', pan: 'SNEHA1234K', stage: 'DISBURSED' },
  { name: 'Rohan Gupta', email: 'rohan.gupta@example.com', pan: 'ROHAN5432G', stage: 'CLOSED' },
  { name: 'Karan Kapoor', email: 'karan.kapoor@example.com', pan: 'KARAN9876R', stage: 'REJECTED' },
];

/** A tiny but valid one-page PDF so "View slip" works for seeded loans. */
function ensureDemoSlipFile(): number {
  const target = path.join(uploadDir, DEMO_SLIP_NAME);
  const legacyTarget = path.join(uploadDir, LEGACY_DEMO_SLIP_NAME);
  if (!fs.existsSync(target)) {
    const pdf = [
      '%PDF-1.4',
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 420 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
      '4 0 obj << /Length 64 >> stream',
      'BT /F1 16 Tf 40 110 Td (Demo salary slip - seed data only) Tj ET',
      'endstream endobj',
      '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      'trailer << /Root 1 0 R >>',
      '%%EOF',
    ].join('\n');
    fs.writeFileSync(target, pdf);
  }
  if (!fs.existsSync(legacyTarget)) fs.copyFileSync(target, legacyTarget);
  return fs.statSync(target).size;
}

async function upsertUser(name: string, email: string, password: string, role: ROLES): Promise<IUser> {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.findOneAndUpdate(
    { email },
    { $set: { name, email, passwordHash, role, isActive: true } },
    { upsert: true, new: true, runValidators: true }
  );
  return user!;
}

interface Staff {
  sanction: IUser;
  disbursement: IUser;
  collection: IUser;
}

function buildDemoLoan(borrower: IUser, pan: string, stage: DemoStage, slipSize: number, staff: Staff): Partial<ILoan> | null {
  if (stage === 'REGISTERED') return null;

  const now = Date.now();
  const borrowerId = borrower._id.toString();
  const personalDetails = {
    fullName: borrower.name,
    pan,
    dob: new Date(Date.UTC(1992, 5, 15)),
    monthlySalary: 65000,
    employmentMode: EMPLOYMENT_MODE.SALARIED,
  };
  const salarySlip = {
    originalName: 'salary-slip.pdf',
    storedName: DEMO_SLIP_NAME,
    mimeType: 'application/pdf',
    size: slipSize,
    uploadedAt: new Date(now - 6 * DAY_MS),
  };
  const draftEntry = historyEntry(LOAN_STATUS.DRAFT, borrowerId, 'Eligibility check passed', new Date(now - 7 * DAY_MS));

  if (stage === 'PROFILE_SAVED') {
    return { borrower: borrower._id, personalDetails, status: LOAN_STATUS.DRAFT, statusHistory: [draftEntry] };
  }
  if (stage === 'SLIP_UPLOADED') {
    return { borrower: borrower._id, personalDetails, salarySlip, status: LOAN_STATUS.DRAFT, statusHistory: [draftEntry] };
  }

  const terms = calculateLoanDetails(stage === 'CLOSED' ? 50000 : 150000, stage === 'CLOSED' ? 90 : 180);
  const appliedAt = new Date(now - 5 * DAY_MS);
  const base: Partial<ILoan> = {
    borrower: borrower._id,
    personalDetails,
    salarySlip,
    ...terms,
    totalPaid: 0,
    outstandingBalance: terms.totalRepayment,
    status: LOAN_STATUS.APPLIED,
    appliedAt,
    statusHistory: [draftEntry, historyEntry(LOAN_STATUS.APPLIED, borrowerId, undefined, appliedAt)],
  };
  if (stage === 'APPLIED') return base;

  if (stage === 'REJECTED') {
    const rejectedAt = new Date(now - 4 * DAY_MS);
    const reason = 'Salary credits in bank statement do not match the declared income.';
    return {
      ...base,
      status: LOAN_STATUS.REJECTED,
      rejectionReason: reason,
      rejectedBy: staff.sanction._id,
      rejectedAt,
      statusHistory: [...base.statusHistory!, historyEntry(LOAN_STATUS.REJECTED, staff.sanction._id.toString(), reason, rejectedAt)],
    };
  }

  const sanctionedAt = new Date(now - 4 * DAY_MS);
  const sanctioned: Partial<ILoan> = {
    ...base,
    status: LOAN_STATUS.SANCTIONED,
    sanctionedBy: staff.sanction._id,
    sanctionedAt,
    statusHistory: [...base.statusHistory!, historyEntry(LOAN_STATUS.SANCTIONED, staff.sanction._id.toString(), undefined, sanctionedAt)],
  };
  if (stage === 'SANCTIONED') return sanctioned;

  const disbursedAt = new Date(now - 3 * DAY_MS);
  const disbursed: Partial<ILoan> = {
    ...sanctioned,
    status: LOAN_STATUS.DISBURSED,
    disbursedBy: staff.disbursement._id,
    disbursedAt,
    statusHistory: [...sanctioned.statusHistory!, historyEntry(LOAN_STATUS.DISBURSED, staff.disbursement._id.toString(), undefined, disbursedAt)],
  };
  if (stage === 'DISBURSED') return disbursed;

  const closedAt = new Date(now - 1 * DAY_MS);
  return {
    ...disbursed,
    status: LOAN_STATUS.CLOSED,
    totalPaid: terms.totalRepayment,
    outstandingBalance: 0,
    closedAt,
    statusHistory: [
      ...disbursed.statusHistory!,
      historyEntry(LOAN_STATUS.CLOSED, staff.collection._id.toString(), 'Auto-closed on full repayment (UTR SEEDCLOSED0001)', closedAt),
    ],
  };
}

async function seed() {
  if (env.NODE_ENV === 'production' && !process.argv.includes('--allow-production')) {
    console.error('Refusing to seed demo accounts with NODE_ENV=production (pass --allow-production to override).');
    process.exit(1);
  }

  await connectDB();
  const slipSize = ensureDemoSlipFile();

  const accounts: Partial<Record<ROLES, IUser>> = {};
  for (const account of SEED_ACCOUNTS) {
    accounts[account.role] = await upsertUser(account.name, account.email, account.password, account.role);
  }
  const staff: Staff = {
    sanction: accounts[ROLES.SANCTION]!,
    disbursement: accounts[ROLES.DISBURSEMENT]!,
    collection: accounts[ROLES.COLLECTION]!,
  };

  let createdLoans = 0;
  for (const demo of DEMO_BORROWERS) {
    const borrower = await upsertUser(demo.name, demo.email, DEMO_BORROWER_PASSWORD, ROLES.BORROWER);
    if (await Loan.exists({ borrower: borrower._id })) continue; // never touch existing loans

    const loanData = buildDemoLoan(borrower, demo.pan, demo.stage, slipSize, staff);
    if (!loanData) continue;

    const loan = await Loan.create(loanData);
    createdLoans++;

    // Payments for the repayment-stage demos (UTRs are unique; skip if already present).
    const payments =
      demo.stage === 'DISBURSED'
        ? [{ utr: 'SEEDPARTIAL0001', amount: 50000 }]
        : demo.stage === 'CLOSED'
          ? [{ utr: 'SEEDCLOSED0001', amount: loan.totalRepayment }]
          : [];
    for (const p of payments) {
      if (await Payment.exists({ utrNumber: p.utr })) continue;
      await Payment.create({
        loan: loan._id,
        utrNumber: p.utr,
        amount: p.amount,
        paymentDate: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() - 2)),
        recordedBy: staff.collection._id,
      });
      if (demo.stage === 'DISBURSED') {
        loan.totalPaid = roundMoney(loan.totalPaid + p.amount);
        loan.outstandingBalance = roundMoney(loan.totalRepayment - loan.totalPaid);
        await loan.save();
      }
    }
  }

  console.log(`\nSeed complete (${createdLoans} demo loan(s) created; existing loans left untouched).\n`);
  console.table(SEED_ACCOUNTS.map(({ role, email, password }) => ({ role, email, password })));
  console.log(`Demo borrowers (${DEMO_BORROWERS.length}) use password: ${DEMO_BORROWER_PASSWORD}\n`);
}

seed()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    console.error('Seeding failed:', err);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
  });
