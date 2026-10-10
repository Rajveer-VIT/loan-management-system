import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.model.js';
import { Loan } from '../models/Loan.model.js';
import { Payment } from '../models/Payment.model.js';
import { ROLES } from '../constants/roles.js';
import { LOAN_STATUS } from '../constants/loanStatus.js';
import { EMPLOYMENT_MODE } from '../constants/loanConfig.js';
import { calculateLoanDetails, roundMoney } from '../services/loanCalculator.js';
import mongoose from 'mongoose';

const defaultUsers = [
  { name: 'System Admin', email: 'admin@lms.com', password: 'Admin@123', role: ROLES.ADMIN },
  { name: 'Sales Executive', email: 'sales@lms.com', password: 'Sales@123', role: ROLES.SALES },
  { name: 'Sanction Officer', email: 'sanction@lms.com', password: 'Sanction@123', role: ROLES.SANCTION },
  { name: 'Disbursement Manager', email: 'disbursement@lms.com', password: 'Disburse@123', role: ROLES.DISBURSEMENT },
  { name: 'Collection Agent', email: 'collection@lms.com', password: 'Collect@123', role: ROLES.COLLECTION },
  { name: 'Primary Borrower', email: 'borrower@lms.com', password: 'Borrower@123', role: ROLES.BORROWER },
];

const demoBorrowers = [
  { name: 'Ananya Roy', email: 'ananya.roy@example.com', stage: 'REGISTERED' },
  { name: 'Vikram Mehta', email: 'vikram.mehta@example.com', stage: 'SANCTIONED' },
  { name: 'Sneha Patel', email: 'sneha.patel@example.com', stage: 'DISBURSED' },
  { name: 'Amit Verma', email: 'amit.verma@example.com', stage: 'APPLIED' },
  { name: 'Priya Sharma', email: 'priya.sharma@example.com', stage: 'APPLIED' },
  { name: 'Rohan Gupta', email: 'rohan.gupta@example.com', stage: 'CLOSED' },
  { name: 'Karan Kapoor', email: 'karan.kapoor@example.com', stage: 'REJECTED' },
];

async function seed() {
  console.log('🌱 Starting Idempotent Database Seeding...');
  await connectDB();

  const salt = await bcrypt.genSalt(10);

  // 1. Seed core staff & primary borrower accounts
  console.log('👤 Seeding Core Role Accounts...');
  const seededUsers: Record<string, any> = {};
  for (const u of defaultUsers) {
    const passwordHash = await bcrypt.hash(u.password, salt);
    const user = await User.findOneAndUpdate(
      { email: u.email },
      {
        $set: {
          name: u.name,
          email: u.email,
          passwordHash,
          role: u.role,
          isActive: true,
        },
      },
      { upsert: true, new: true }
    );
    seededUsers[u.email] = user;
  }

  const sanctionUser = seededUsers['sanction@lms.com'];
  const disburseUser = seededUsers['disbursement@lms.com'];
  const collectUser = seededUsers['collection@lms.com'];

  // 2. Seed demo borrower accounts and loan lifecycle states
  console.log('📊 Seeding Demo Borrower Funnel & Lifecycle Loans...');
  for (const b of demoBorrowers) {
    const passwordHash = await bcrypt.hash('Borrower@123', salt);
    const user = await User.findOneAndUpdate(
      { email: b.email },
      {
        $set: {
          name: b.name,
          email: b.email,
          passwordHash,
          role: ROLES.BORROWER,
          isActive: true,
        },
      },
      { upsert: true, new: true }
    );

    if (b.stage === 'APPLIED') {
      const math = calculateLoanDetails(100000, 180);
      await Loan.findOneAndUpdate(
        { borrower: user._id },
        {
          $set: {
            borrower: user._id,
            personalDetails: {
              fullName: b.name,
              pan: 'AMITV5432P',
              dob: new Date('1994-06-15'),
              monthlySalary: 65000,
              employmentMode: EMPLOYMENT_MODE.SALARIED,
            },
            salarySlip: {
              originalName: 'salary_slip.pdf',
              storedName: 'demo_salary_slip.pdf',
              path: 'uploads/demo_salary_slip.pdf',
              mimeType: 'application/pdf',
              size: 250000,
            },
            amount: math.amount,
            tenureDays: math.tenureDays,
            interestRate: math.interestRate,
            simpleInterest: math.simpleInterest,
            totalRepayment: math.totalRepayment,
            totalPaid: 0,
            outstandingBalance: math.totalRepayment,
            status: LOAN_STATUS.APPLIED,
          },
        },
        { upsert: true }
      );
    } else if (b.stage === 'SANCTIONED') {
      const math = calculateLoanDetails(150000, 180);
      await Loan.findOneAndUpdate(
        { borrower: user._id },
        {
          $set: {
            borrower: user._id,
            personalDetails: {
              fullName: b.name,
              pan: 'VIKRM9876M',
              dob: new Date('1992-08-20'),
              monthlySalary: 75000,
              employmentMode: EMPLOYMENT_MODE.SALARIED,
            },
            salarySlip: {
              originalName: 'vikram_slip.pdf',
              storedName: 'demo_salary_slip.pdf',
              path: 'uploads/demo_salary_slip.pdf',
              mimeType: 'application/pdf',
              size: 280000,
            },
            amount: math.amount,
            tenureDays: math.tenureDays,
            interestRate: math.interestRate,
            simpleInterest: math.simpleInterest,
            totalRepayment: math.totalRepayment,
            totalPaid: 0,
            outstandingBalance: math.totalRepayment,
            status: LOAN_STATUS.SANCTIONED,
            sanctionedBy: sanctionUser._id,
            sanctionedAt: new Date(Date.now() - 86400000),
          },
        },
        { upsert: true }
      );
    } else if (b.stage === 'DISBURSED') {
      const math = calculateLoanDetails(200000, 365);
      const partialPaid = 50000;
      const loan = await Loan.findOneAndUpdate(
        { borrower: user._id },
        {
          $set: {
            borrower: user._id,
            personalDetails: {
              fullName: b.name,
              pan: 'SNEHA1234K',
              dob: new Date('1990-11-10'),
              monthlySalary: 85000,
              employmentMode: EMPLOYMENT_MODE.SALARIED,
            },
            salarySlip: {
              originalName: 'sneha_slip.pdf',
              storedName: 'demo_salary_slip.pdf',
              path: 'uploads/demo_salary_slip.pdf',
              mimeType: 'application/pdf',
              size: 300000,
            },
            amount: math.amount,
            tenureDays: math.tenureDays,
            interestRate: math.interestRate,
            simpleInterest: math.simpleInterest,
            totalRepayment: math.totalRepayment,
            totalPaid: partialPaid,
            outstandingBalance: roundMoney(math.totalRepayment - partialPaid),
            status: LOAN_STATUS.DISBURSED,
            sanctionedBy: sanctionUser._id,
            sanctionedAt: new Date(Date.now() - 172800000),
            disbursedBy: disburseUser._id,
            disbursedAt: new Date(Date.now() - 86400000),
          },
        },
        { upsert: true, new: true }
      );

      // Seed partial payment record
      await Payment.findOneAndUpdate(
        { utrNumber: 'UTRSEEDPARTIAL100' },
        {
          $set: {
            loan: loan._id,
            utrNumber: 'UTRSEEDPARTIAL100',
            amount: partialPaid,
            paymentDate: new Date(Date.now() - 43200000),
            recordedBy: collectUser._id,
          },
        },
        { upsert: true }
      );
    } else if (b.stage === 'CLOSED') {
      const math = calculateLoanDetails(50000, 90);
      const loan = await Loan.findOneAndUpdate(
        { borrower: user._id },
        {
          $set: {
            borrower: user._id,
            personalDetails: {
              fullName: b.name,
              pan: 'ROHAN5432G',
              dob: new Date('1993-02-14'),
              monthlySalary: 60000,
              employmentMode: EMPLOYMENT_MODE.SALARIED,
            },
            amount: math.amount,
            tenureDays: math.tenureDays,
            interestRate: math.interestRate,
            simpleInterest: math.simpleInterest,
            totalRepayment: math.totalRepayment,
            totalPaid: math.totalRepayment,
            outstandingBalance: 0,
            status: LOAN_STATUS.CLOSED,
            sanctionedBy: sanctionUser._id,
            disbursedBy: disburseUser._id,
            closedAt: new Date(Date.now() - 86400000),
          },
        },
        { upsert: true, new: true }
      );

      // Seed full payment record
      await Payment.findOneAndUpdate(
        { utrNumber: 'UTRSEEDCLOSED999' },
        {
          $set: {
            loan: loan._id,
            utrNumber: 'UTRSEEDCLOSED999',
            amount: math.totalRepayment,
            paymentDate: new Date(Date.now() - 86400000),
            recordedBy: collectUser._id,
          },
        },
        { upsert: true }
      );
    } else if (b.stage === 'REJECTED') {
      await Loan.findOneAndUpdate(
        { borrower: user._id },
        {
          $set: {
            borrower: user._id,
            personalDetails: {
              fullName: b.name,
              pan: 'KARAN9876R',
              dob: new Date('1996-09-25'),
              monthlySalary: 30000,
              employmentMode: EMPLOYMENT_MODE.SELF_EMPLOYED,
            },
            status: LOAN_STATUS.REJECTED,
            rejectionReason: 'Bank statement salary credits mismatched claimed net income.',
          },
        },
        { upsert: true }
      );
    }
  }

  console.log('\n======================================================================');
  console.log('✅ IDEMPOTENT SEEDING COMPLETE! PRE-CONFIGURED ACCOUNTS & DEMO DATA');
  console.log('======================================================================');
  defaultUsers.forEach((u) => {
    console.log(`Role: ${u.role.padEnd(12)} | Email: ${u.email.padEnd(24)} | Password: ${u.password}`);
  });
  console.log('======================================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
