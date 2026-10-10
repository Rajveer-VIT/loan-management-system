import mongoose from 'mongoose';
import { Loan, ILoan, ISalarySlip } from '../../models/Loan.model.js';
import { Payment } from '../../models/Payment.model.js';
import { evaluateBRE, normalizePan } from '../../services/bre.service.js';
import { calculateLoanDetails } from '../../services/loanCalculator.js';
import { LOAN_STATUS, OPEN_LOAN_STATUSES } from '../../constants/loanStatus.js';
import { AppError } from '../../utils/AppError.js';
import { calendarDateToUtc, parseCalendarDate } from '../../utils/dates.js';
import { removeUploadedFile, sniffUploadedFile } from '../../middleware/upload.js';
import { historyEntry } from '../../services/loanHistory.js';
import { SaveProfileInput, ApplyLoanInput } from './borrower.schema.js';

export type ApplicationStep = 'personal' | 'salary-slip' | 'loan-config';

function deriveStep(loan: ILoan | null): ApplicationStep {
  if (!loan?.personalDetails?.fullName) return 'personal';
  if (!loan.salarySlip?.storedName) return 'salary-slip';
  return 'loan-config';
}

function isDuplicateKey(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;
}

async function assertNoOpenLoan(borrowerId: string, exceptLoanId?: string): Promise<void> {
  const filter: mongoose.FilterQuery<ILoan> = { borrower: borrowerId, status: { $in: OPEN_LOAN_STATUSES } };
  if (exceptLoanId) filter._id = { $ne: exceptLoanId };
  if (await Loan.exists(filter)) {
    throw new AppError(
      'You already have an active loan application. Only one active loan is permitted at a time.',
      409,
      undefined,
      'OPEN_LOAN_EXISTS'
    );
  }
}

function breRejection(failures: ReturnType<typeof evaluateBRE>['failures']): AppError {
  return new AppError(
    'Application rejected by the eligibility rules (BRE). Please review the reasons below.',
    422,
    failures,
    'BRE_VALIDATION_FAILED'
  );
}

export class BorrowerService {
  /** The borrower's in-progress DRAFT (if any) and the wizard step it is on. */
  static async getDraftLoan(borrowerId: string) {
    const draftLoan = await Loan.findOne({ borrower: borrowerId, status: LOAN_STATUS.DRAFT });
    return { draftLoan, currentStep: deriveStep(draftLoan) };
  }

  /**
   * Step 2: runs the BRE on the server and, only if every rule passes, saves the
   * personal details onto the borrower's single DRAFT loan (creating it if needed).
   */
  static async saveProfileAndRunBRE(borrowerId: string, input: SaveProfileInput) {
    await assertNoOpenLoan(borrowerId);

    const breResult = evaluateBRE(input);
    if (!breResult.eligible) throw breRejection(breResult.failures);

    // BRE passed, so the date parses; it is stored as a UTC-midnight calendar date.
    const dob = calendarDateToUtc(parseCalendarDate(input.dob)!);
    const personalDetails = {
      fullName: input.fullName,
      pan: normalizePan(input.pan),
      dob,
      monthlySalary: input.monthlySalary,
      employmentMode: input.employmentMode,
    };

    const upsertDraft = () =>
      Loan.findOneAndUpdate(
        { borrower: borrowerId, status: LOAN_STATUS.DRAFT },
        {
          $set: { personalDetails },
          $setOnInsert: { statusHistory: [historyEntry(LOAN_STATUS.DRAFT, borrowerId, 'Eligibility check passed')] },
        },
        { upsert: true, new: true, runValidators: true }
      );

    try {
      return await upsertDraft();
    } catch (err) {
      // A concurrent request created the draft first (unique partial index); update that one.
      if (isDuplicateKey(err)) return await upsertDraft();
      throw err;
    }
  }

  /**
   * Step 3: attaches the uploaded salary slip to the borrower's DRAFT loan.
   * The file is already on disk (multer), so every failure path deletes it, and a
   * successful replacement deletes the superseded file.
   */
  static async uploadSalarySlip(borrowerId: string, loanId: string, file: Express.Multer.File) {
    try {
      const mimeType = await sniffUploadedFile(file.path, file.originalname);
      if (!mimeType) {
        throw new AppError(
          'File content does not match a PDF, JPG or PNG document.',
          400,
          undefined,
          'INVALID_FILE_CONTENT'
        );
      }

      const salarySlip: ISalarySlip = {
        // Keep a display name only; strip anything path-like or control characters.
        originalName: file.originalname.replace(/[\\/\x00-\x1f\x7f"]/g, '_').slice(0, 150),
        storedName: file.filename,
        mimeType,
        size: file.size,
        uploadedAt: new Date(),
      };

      const previous = await Loan.findOneAndUpdate(
        {
          _id: loanId,
          borrower: borrowerId,
          status: LOAN_STATUS.DRAFT,
          'personalDetails.fullName': { $exists: true },
        },
        { $set: { salarySlip } },
        { new: false }
      );

      if (!previous) {
        const loan = await Loan.findOne({ _id: loanId, borrower: borrowerId });
        if (!loan) throw new AppError('Loan application not found', 404, undefined, 'NOT_FOUND');
        if (loan.status !== LOAN_STATUS.DRAFT) {
          throw new AppError(
            'Cannot upload a salary slip for an application that has already been submitted.',
            409,
            undefined,
            'INVALID_TRANSITION'
          );
        }
        throw new AppError(
          'Please complete the personal details step before uploading a salary slip.',
          409,
          undefined,
          'INVALID_STEP'
        );
      }

      if (previous.salarySlip?.storedName && previous.salarySlip.storedName !== file.filename) {
        await removeUploadedFile(previous.salarySlip.storedName);
      }

      return await Loan.findById(loanId);
    } catch (err) {
      await removeUploadedFile(file.filename);
      throw err;
    }
  }

  /**
   * Step 4: DRAFT → APPLIED. Re-runs the BRE on the stored details (defence in depth)
   * and computes the financial terms on the server; client-sent figures are never used.
   */
  static async applyForLoan(borrowerId: string, loanId: string, input: ApplyLoanInput) {
    const loan = await Loan.findOne({ _id: loanId, borrower: borrowerId });
    if (!loan) throw new AppError('Loan application not found', 404, undefined, 'NOT_FOUND');

    if (loan.status !== LOAN_STATUS.DRAFT) {
      throw new AppError(
        `This application has already been submitted (status: ${loan.status}).`,
        409,
        undefined,
        'INVALID_TRANSITION'
      );
    }

    const details = loan.personalDetails;
    if (!details?.fullName) {
      throw new AppError('Please complete personal details before submitting.', 409, undefined, 'INVALID_STEP');
    }
    if (!loan.salarySlip?.storedName) {
      throw new AppError('Please upload your salary slip before submitting.', 409, undefined, 'INVALID_STEP');
    }

    const breResult = evaluateBRE({
      pan: details.pan,
      dob: details.dob,
      monthlySalary: details.monthlySalary,
      employmentMode: details.employmentMode,
    });
    if (!breResult.eligible) throw breRejection(breResult.failures);

    await assertNoOpenLoan(borrowerId, loanId);

    const terms = calculateLoanDetails(input.amount, input.tenureDays);
    const now = new Date();

    // Conditional on status DRAFT: a double-click / retried request can only submit once.
    const updatedLoan = await Loan.findOneAndUpdate(
      { _id: loanId, borrower: borrowerId, status: LOAN_STATUS.DRAFT },
      {
        $set: {
          amount: terms.amount,
          tenureDays: terms.tenureDays,
          interestRate: terms.interestRate,
          simpleInterest: terms.simpleInterest,
          totalRepayment: terms.totalRepayment,
          totalPaid: 0,
          outstandingBalance: terms.totalRepayment,
          status: LOAN_STATUS.APPLIED,
          appliedAt: now,
        },
        $push: { statusHistory: historyEntry(LOAN_STATUS.APPLIED, borrowerId, undefined, now) },
      },
      { new: true, runValidators: true }
    );

    if (!updatedLoan) {
      throw new AppError('This application has already been submitted.', 409, undefined, 'INVALID_TRANSITION');
    }

    return updatedLoan;
  }

  static async getBorrowerLoans(borrowerId: string) {
    return Loan.find({ borrower: borrowerId }).sort({ createdAt: -1 });
  }

  /**
   * A single loan owned by the borrower, with its payments. A loan owned by someone else
   * gets the same 404 as a missing one, so its existence is not revealed.
   */
  static async getBorrowerLoanById(borrowerId: string, loanId: string) {
    const loan = await Loan.findOne({ _id: loanId, borrower: borrowerId });
    if (!loan) throw new AppError('Loan application not found', 404, undefined, 'NOT_FOUND');

    const payments = await Payment.find({ loan: loan._id }).select('-recordedBy').sort({ paymentDate: -1, createdAt: -1 });
    return { loan, payments };
  }
}
