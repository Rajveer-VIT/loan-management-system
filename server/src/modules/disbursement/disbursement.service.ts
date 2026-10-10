import mongoose from 'mongoose';
import { Loan, ILoan } from '../../models/Loan.model.js';
import { LOAN_STATUS, isValidStatusTransition } from '../../constants/loanStatus.js';
import { AppError } from '../../utils/AppError.js';
import { escapeRegex } from '../../utils/regex.js';

export class DisbursementService {
  static async getSanctionedLoans(page: number = 1, limit: number = 10, search?: string) {
    const safeLimit = Math.max(1, Math.min(50, limit)); // Cap at 50
    const skip = (page - 1) * safeLimit;
    const query: mongoose.FilterQuery<ILoan> = { status: LOAN_STATUS.SANCTIONED };

    if (search && search.trim() !== '') {
      const safeSearch = escapeRegex(search.trim());
      const searchRegex = new RegExp(safeSearch, 'i');
      query.$or = [
        { 'personalDetails.fullName': searchRegex },
        { 'personalDetails.pan': searchRegex },
      ];
    }

    const loans = await Loan.find(query)
      .populate('borrower', 'name email')
      .populate('sanctionedBy', 'name email')
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
    const loan = await Loan.findOne({ _id: loanId, status: LOAN_STATUS.SANCTIONED })
      .populate('borrower', 'name email')
      .populate('sanctionedBy', 'name email');

    if (!loan) {
      throw new AppError('Sanctioned loan application not found', 404);
    }

    return loan;
  }

  static async getStats() {
    const pendingCount = await Loan.countDocuments({ status: LOAN_STATUS.SANCTIONED });
    
    const pendingLoans = await Loan.find({ status: LOAN_STATUS.SANCTIONED }).select('amount');
    const totalPendingAmount = pendingLoans.reduce((sum, l) => sum + (l.amount || 0), 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const disbursedTodayLoans = await Loan.find({
      status: { $in: [LOAN_STATUS.DISBURSED, LOAN_STATUS.CLOSED] },
      disbursedAt: { $gte: today },
    }).select('amount');

    const disbursedTodayCount = disbursedTodayLoans.length;
    const disbursedTodayAmount = disbursedTodayLoans.reduce((sum, l) => sum + (l.amount || 0), 0);

    return {
      pendingCount,
      totalPendingAmount,
      disbursedTodayCount,
      disbursedTodayAmount,
    };
  }

  static async disburseLoan(loanId: string, disburseUserId: string) {
    const existingLoan = await Loan.findById(loanId);
    if (!existingLoan) {
      throw new AppError('Sanctioned loan application not found', 404);
    }

    if (!isValidStatusTransition(existingLoan.status, LOAN_STATUS.DISBURSED)) {
      throw new AppError(
        `Invalid status transition. Cannot disburse loan from status '${existingLoan.status}'`,
        409,
        undefined,
        'INVALID_TRANSITION'
      );
    }

    const updatedLoan = await Loan.findOneAndUpdate(
      { _id: loanId, status: LOAN_STATUS.SANCTIONED },
      {
        $set: {
          status: LOAN_STATUS.DISBURSED,
          disbursedBy: disburseUserId,
          disbursedAt: new Date(),
        },
      },
      { new: true }
    )
      .populate('borrower', 'name email')
      .populate('sanctionedBy', 'name email')
      .populate('disbursedBy', 'name email');

    if (!updatedLoan) {
      throw new AppError('Loan status was modified concurrently by another process', 409, undefined, 'CONCURRENT_UPDATE');
    }

    return updatedLoan;
  }
}
