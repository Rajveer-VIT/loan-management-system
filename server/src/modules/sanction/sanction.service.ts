import mongoose from 'mongoose';
import { Loan, ILoan } from '../../models/Loan.model.js';
import { LOAN_STATUS, isValidStatusTransition } from '../../constants/loanStatus.js';
import { AppError } from '../../utils/AppError.js';
import { escapeRegex } from '../../utils/regex.js';

export class SanctionService {
  static async getAppliedLoans(page: number = 1, limit: number = 10, search?: string) {
    const safeLimit = Math.max(1, Math.min(50, limit)); // Cap at 50
    const skip = (page - 1) * safeLimit;
    const query: mongoose.FilterQuery<ILoan> = { status: LOAN_STATUS.APPLIED };

    if (search && search.trim() !== '') {
      const safeSearch = escapeRegex(search.trim());
      const searchRegex = new RegExp(safeSearch, 'i');
      query.$or = [
        { 'personalDetails.fullName': searchRegex },
        { 'personalDetails.pan': searchRegex },
      ];
    }

    const loans = await Loan.find(query)
      .populate('borrower', 'name email createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit);

    const total = await Loan.countDocuments(query);
    const totalPages = Math.ceil(total / safeLimit) || 1;

    return {
      loans,
      pagination: {
        page,
        limit: safeLimit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  static async getLoanById(loanId: string) {
    const loan = await Loan.findOne({ _id: loanId, status: LOAN_STATUS.APPLIED })
      .populate('borrower', 'name email createdAt');

    if (!loan) {
      throw new AppError('Applied loan application not found', 404);
    }

    return loan;
  }

  static async getStats() {
    const pendingCount = await Loan.countDocuments({ status: LOAN_STATUS.APPLIED });
    
    const pendingLoans = await Loan.find({ status: LOAN_STATUS.APPLIED }).select('amount');
    const totalPendingAmount = pendingLoans.reduce((sum, l) => sum + (l.amount || 0), 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sanctionedToday = await Loan.countDocuments({
      status: LOAN_STATUS.SANCTIONED,
      sanctionedAt: { $gte: today },
    });

    const rejectedToday = await Loan.countDocuments({
      status: LOAN_STATUS.REJECTED,
      updatedAt: { $gte: today },
    });

    return {
      pendingCount,
      totalPendingAmount,
      sanctionedToday,
      rejectedToday,
    };
  }

  static async approveLoan(loanId: string, sanctionUserId: string) {
    const existingLoan = await Loan.findById(loanId);
    if (!existingLoan) {
      throw new AppError('Loan application not found', 404);
    }

    if (!isValidStatusTransition(existingLoan.status, LOAN_STATUS.SANCTIONED)) {
      throw new AppError(
        `Invalid status transition. Cannot sanction loan from status '${existingLoan.status}'`,
        409,
        undefined,
        'INVALID_TRANSITION'
      );
    }

    const updatedLoan = await Loan.findOneAndUpdate(
      { _id: loanId, status: LOAN_STATUS.APPLIED },
      {
        $set: {
          status: LOAN_STATUS.SANCTIONED,
          sanctionedBy: sanctionUserId,
          sanctionedAt: new Date(),
        },
      },
      { new: true }
    ).populate('borrower', 'name email');

    if (!updatedLoan) {
      throw new AppError('Loan status was modified concurrently by another user', 409, undefined, 'CONCURRENT_UPDATE');
    }

    return updatedLoan;
  }

  static async rejectLoan(loanId: string, rejectionReason: string) {
    const existingLoan = await Loan.findById(loanId);
    if (!existingLoan) {
      throw new AppError('Loan application not found', 404);
    }

    if (!isValidStatusTransition(existingLoan.status, LOAN_STATUS.REJECTED)) {
      throw new AppError(
        `Invalid status transition. Cannot reject loan from status '${existingLoan.status}'`,
        409,
        undefined,
        'INVALID_TRANSITION'
      );
    }

    const updatedLoan = await Loan.findOneAndUpdate(
      { _id: loanId, status: LOAN_STATUS.APPLIED },
      {
        $set: {
          status: LOAN_STATUS.REJECTED,
          rejectionReason,
        },
      },
      { new: true }
    ).populate('borrower', 'name email');

    if (!updatedLoan) {
      throw new AppError('Loan status was modified concurrently by another user', 409, undefined, 'CONCURRENT_UPDATE');
    }

    return updatedLoan;
  }
}
