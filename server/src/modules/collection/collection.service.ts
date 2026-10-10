import mongoose from 'mongoose';
import { Loan, ILoan } from '../../models/Loan.model.js';
import { Payment } from '../../models/Payment.model.js';
import { LOAN_STATUS } from '../../constants/loanStatus.js';
import { roundMoney } from '../../services/loanCalculator.js';
import { AppError } from '../../utils/AppError.js';
import { escapeRegex } from '../../utils/regex.js';
import { RecordPaymentInput } from './collection.schema.js';

export interface CollectionFilter {
  page?: number;
  limit?: number;
  search?: string;
  status?: string; // DISBURSED | CLOSED | ALL
}

export class CollectionService {
  static async getDisbursedLoans(filter: CollectionFilter) {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(filter.limit) || 10)); // Cap at 50
    const skip = (page - 1) * limit;

    const query: mongoose.FilterQuery<ILoan> = {};

    const statusParam = (filter.status || 'DISBURSED').toUpperCase();
    if (statusParam === 'DISBURSED') {
      query.status = LOAN_STATUS.DISBURSED;
    } else if (statusParam === 'CLOSED') {
      query.status = LOAN_STATUS.CLOSED;
    } else if (statusParam === 'ALL') {
      query.status = { $in: [LOAN_STATUS.DISBURSED, LOAN_STATUS.CLOSED] };
    } else {
      query.status = LOAN_STATUS.DISBURSED;
    }

    if (filter.search && filter.search.trim() !== '') {
      const safeSearch = escapeRegex(filter.search.trim());
      const searchRegex = new RegExp(safeSearch, 'i');
      query.$or = [
        { 'personalDetails.fullName': searchRegex },
        { 'personalDetails.pan': searchRegex },
      ];
    }

    const loans = await Loan.find(query)
      .populate('borrower', 'name email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Loan.countDocuments(query);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      loans,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  static async getLoanById(loanId: string) {
    const loan = await Loan.findOne({
      _id: loanId,
      status: { $in: [LOAN_STATUS.DISBURSED, LOAN_STATUS.CLOSED] },
    }).populate('borrower', 'name email');

    if (!loan) {
      throw new AppError('Disbursed or closed loan not found', 404);
    }

    const payments = await Payment.find({ loan: loanId })
      .populate('recordedBy', 'name email')
      .sort({ createdAt: -1 });

    return {
      loan,
      payments,
    };
  }

  static async getStats() {
    const activeDisbursedCount = await Loan.countDocuments({ status: LOAN_STATUS.DISBURSED });
    const closedCount = await Loan.countDocuments({ status: LOAN_STATUS.CLOSED });

    const activeLoans = await Loan.find({ status: LOAN_STATUS.DISBURSED }).select('outstandingBalance totalPaid');
    const totalOutstanding = activeLoans.reduce((sum, l) => sum + (l.outstandingBalance || 0), 0);

    const allRepaidLoans = await Loan.find({ status: { $in: [LOAN_STATUS.DISBURSED, LOAN_STATUS.CLOSED] } }).select('totalPaid');
    const totalCollected = allRepaidLoans.reduce((sum, l) => sum + (l.totalPaid || 0), 0);

    return {
      activeDisbursedCount: roundMoney(activeDisbursedCount),
      closedCount,
      totalOutstanding: roundMoney(totalOutstanding),
      totalCollected: roundMoney(totalCollected),
    };
  }

  static async recordPayment(loanId: string, input: RecordPaymentInput, collectorUserId: string) {
    const loan = await Loan.findById(loanId);
    if (!loan) {
      throw new AppError('Loan not found', 404);
    }

    if (loan.status !== LOAN_STATUS.DISBURSED) {
      throw new AppError(
        `Payments can only be recorded for DISBURSED loans. Current status is '${loan.status}'`,
        400,
        undefined,
        'INVALID_STATUS'
      );
    }

    const utrUpper = input.utrNumber.trim().toUpperCase();

    // Check duplicate UTR
    const existingUtr = await Payment.findOne({ utrNumber: utrUpper });
    if (existingUtr) {
      throw new AppError(`UTR number '${utrUpper}' has already been recorded`, 409, undefined, 'DUPLICATE_UTR');
    }

    const paymentDate = new Date(input.paymentDate);
    const now = new Date();

    if (paymentDate > now) {
      throw new AppError('Payment date cannot be in the future', 400, undefined, 'INVALID_PAYMENT_DATE');
    }

    if (loan.disbursedAt && paymentDate < new Date(loan.disbursedAt)) {
      throw new AppError(
        `Payment date cannot be earlier than loan disbursement date (${loan.disbursedAt.toISOString().split('T')[0]})`,
        400,
        undefined,
        'INVALID_PAYMENT_DATE'
      );
    }

    const amount = roundMoney(input.amount);

    if (amount > loan.outstandingBalance + 0.01) {
      throw new AppError(
        `Overpayment rejected. Maximum payable amount is ₹${loan.outstandingBalance.toLocaleString('en-IN')}`,
        400,
        undefined,
        'OVERPAYMENT'
      );
    }

    // Create payment document
    const payment = await Payment.create({
      loan: loan._id,
      utrNumber: utrUpper,
      amount,
      paymentDate,
      recordedBy: collectorUserId,
    });

    // Update totalPaid & outstandingBalance using roundMoney to eliminate float drift
    const newTotalPaid = roundMoney(loan.totalPaid + amount);
    let newOutstanding = roundMoney(loan.totalRepayment - newTotalPaid);
    if (newOutstanding < 0.01) {
      newOutstanding = 0;
    }

    let isClosed = false;
    if (newOutstanding === 0) {
      loan.status = LOAN_STATUS.CLOSED;
      loan.closedAt = new Date();
      isClosed = true;
    }

    loan.totalPaid = newTotalPaid;
    loan.outstandingBalance = newOutstanding;
    await loan.save();

    return {
      payment,
      loan,
      isClosed,
    };
  }

  static async getPaymentHistory(loanId: string) {
    const loan = await Loan.findById(loanId);
    if (!loan) {
      throw new AppError('Loan not found', 404);
    }

    const payments = await Payment.find({ loan: loanId })
      .populate('recordedBy', 'name email')
      .sort({ createdAt: -1 });

    return {
      loan,
      payments,
    };
  }
}
