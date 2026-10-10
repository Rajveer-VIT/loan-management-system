import { Loan as LoanModel, ILoan } from '../../models/Loan.model.js';
import { Payment as PaymentModel } from '../../models/Payment.model.js';
import { evaluateBRE } from '../../services/bre.service.js';
import { calculateLoanDetails } from '../../services/loanCalculator.js';
import { LOAN_STATUS, isValidStatusTransition } from '../../constants/loanStatus.js';
import { AppError } from '../../utils/AppError.js';
import { SaveProfileInput, ApplyLoanInput } from './borrower.schema.js';

export class BorrowerService {
  /**
   * Retrieves active DRAFT loan for borrower and derives currentStep.
   */
  static async getDraftLoan(borrowerId: string) {
    const draftLoan = await LoanModel.findOne({
      borrower: borrowerId,
      status: LOAN_STATUS.DRAFT,
    });

    if (!draftLoan) {
      return {
        draftLoan: null,
        currentStep: 'personal',
      };
    }

    let currentStep: 'personal' | 'salary-slip' | 'loan-config' | 'done' = 'personal';

    if (draftLoan.personalDetails && draftLoan.personalDetails.fullName) {
      if (draftLoan.salarySlip && draftLoan.salarySlip.path) {
        currentStep = 'loan-config';
      } else {
        currentStep = 'salary-slip';
      }
    }

    return {
      draftLoan,
      currentStep,
    };
  }

  /**
   * Saves personal details after running BRE check on the server.
   * Idempotent upsert: if DRAFT exists, updates it.
   * Throws 409 if an active non-draft loan exists.
   */
  static async saveProfileAndRunBRE(borrowerId: string, input: SaveProfileInput) {
    // Check if there is an active open non-draft loan (APPLIED, SANCTIONED, DISBURSED)
    const activeLoan = await LoanModel.findOne({
      borrower: borrowerId,
      status: { $in: [LOAN_STATUS.APPLIED, LOAN_STATUS.SANCTIONED, LOAN_STATUS.DISBURSED] },
    });

    if (activeLoan) {
      throw new AppError(
        'Only one active loan application is permitted at a time.',
        409,
        undefined,
        'OPEN_LOAN_EXISTS'
      );
    }

    // Run BRE check
    const breResult = evaluateBRE({
      fullName: input.fullName,
      pan: input.pan,
      dob: input.dob,
      monthlySalary: input.monthlySalary,
      employmentMode: input.employmentMode,
    });

    if (!breResult.eligible) {
      throw new AppError(
        'Loan application rejected by Business Rule Engine (BRE)',
        422,
        breResult.failures,
        'BRE_VALIDATION_FAILED'
      );
    }

    const panUpper = input.pan.trim().toUpperCase();
    const dobDate = new Date(input.dob);

    let loan = await LoanModel.findOne({
      borrower: borrowerId,
      status: LOAN_STATUS.DRAFT,
    });

    if (loan) {
      loan.personalDetails = {
        fullName: input.fullName,
        pan: panUpper,
        dob: dobDate,
        monthlySalary: input.monthlySalary,
        employmentMode: input.employmentMode,
      };
      await loan.save();
    } else {
      loan = await LoanModel.create({
        borrower: borrowerId,
        personalDetails: {
          fullName: input.fullName,
          pan: panUpper,
          dob: dobDate,
          monthlySalary: input.monthlySalary,
          employmentMode: input.employmentMode,
        },
        status: LOAN_STATUS.DRAFT,
      });
    }

    return loan;
  }

  /**
   * Attach salary slip metadata to draft loan.
   * Enforces server step check: requires personalDetails to be saved first.
   */
  static async uploadSalarySlip(borrowerId: string, loanId: string, file: Express.Multer.File) {
    const loan = await LoanModel.findOne({ _id: loanId, borrower: borrowerId });
    if (!loan) {
      throw new AppError('Loan application not found', 404);
    }

    if (loan.status !== LOAN_STATUS.DRAFT) {
      throw new AppError('Cannot upload salary slip for loan that is already submitted', 409, undefined, 'INVALID_TRANSITION');
    }

    if (!loan.personalDetails || !loan.personalDetails.fullName) {
      throw new AppError(
        'Please complete personal details step before uploading salary slip.',
        409,
        undefined,
        'INVALID_STEP'
      );
    }

    loan.salarySlip = {
      originalName: file.originalname,
      storedName: file.filename,
      path: file.path,
      mimeType: file.mimetype,
      size: file.size,
    };

    await loan.save();
    return loan;
  }

  /**
   * Configure loan terms and submit application (DRAFT -> APPLIED).
   * Enforces server step check: requires personalDetails AND salarySlip.
   */
  static async applyForLoan(borrowerId: string, loanId: string, input: ApplyLoanInput) {
    const loan = await LoanModel.findOne({ _id: loanId, borrower: borrowerId });
    if (!loan) {
      throw new AppError('Loan application not found', 404);
    }

    if (!loan.personalDetails || !loan.personalDetails.fullName) {
      throw new AppError('Please complete personal details before submitting application', 409, undefined, 'INVALID_STEP');
    }

    if (!loan.salarySlip || !loan.salarySlip.path) {
      throw new AppError('Please upload salary slip before submitting application', 409, undefined, 'INVALID_STEP');
    }

    if (!isValidStatusTransition(loan.status, LOAN_STATUS.APPLIED)) {
      throw new AppError(`Cannot submit loan from status '${loan.status}'`, 409, undefined, 'INVALID_TRANSITION');
    }

    const { amount, tenureDays, interestRate, simpleInterest, totalRepayment } = calculateLoanDetails(
      input.amount,
      input.tenureDays
    );

    const updatedLoan = await LoanModel.findOneAndUpdate(
      { _id: loanId, borrower: borrowerId, status: LOAN_STATUS.DRAFT },
      {
        $set: {
          amount,
          tenureDays,
          interestRate,
          simpleInterest,
          totalRepayment,
          outstandingBalance: totalRepayment,
          status: LOAN_STATUS.APPLIED,
        },
      },
      { new: true }
    );

    if (!updatedLoan) {
      throw new AppError('Application state modified concurrently by another process', 409, undefined, 'CONCURRENT_UPDATE');
    }

    return updatedLoan;
  }

  /**
   * Get all loans for current borrower.
   */
  static async getBorrowerLoans(borrowerId: string) {
    return await LoanModel.find({ borrower: borrowerId }).sort({ createdAt: -1 });
  }

  /**
   * Get single loan by ID for current borrower.
   * Ownership check: returns 404 if loan belongs to another borrower (avoid leaking existence).
   * Includes payment history.
   */
  static async getBorrowerLoanById(borrowerId: string, loanId: string) {
    const loan = await LoanModel.findById(loanId);
    
    // Return 404 for non-existent OR non-owned loans to prevent resource existence leakage
    if (!loan || loan.borrower.toString() !== borrowerId) {
      throw new AppError('Loan application not found', 404);
    }

    const payments = await PaymentModel.find({ loan: loanId }).sort({ createdAt: -1 });

    return {
      loan,
      payments,
    };
  }
}
