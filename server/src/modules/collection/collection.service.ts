import { Loan } from '../../models/Loan.model.js';
import { Payment } from '../../models/Payment.model.js';
import { LOAN_STATUS } from '../../constants/loanStatus.js';
import { roundMoney } from '../../services/loanCalculator.js';
import { findLoanInStatuses, listLoanQueue, sumByStatus } from '../../services/loanQueue.js';
import { historyEntry } from '../../services/loanHistory.js';
import { AppError } from '../../utils/AppError.js';
import { PaginationInput } from '../../utils/pagination.js';
import {
  businessDateOf,
  calendarDateToUtc,
  compareCalendarDates,
  parseCalendarDate,
} from '../../utils/dates.js';
import { RecordPaymentInput } from './collection.schema.js';

export type CollectionStatusFilter = 'DISBURSED' | 'CLOSED' | 'ALL';

const STATUS_FILTERS: Record<CollectionStatusFilter, LOAN_STATUS[]> = {
  DISBURSED: [LOAN_STATUS.DISBURSED],
  CLOSED: [LOAN_STATUS.CLOSED],
  ALL: [LOAN_STATUS.DISBURSED, LOAN_STATUS.CLOSED],
};

const PORTFOLIO_STATUSES = STATUS_FILTERS.ALL;

function inr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function getPayments(loanId: string) {
  return Payment.find({ loan: loanId })
    .populate('recordedBy', 'name email')
    .sort({ paymentDate: -1, createdAt: -1 });
}

export class CollectionService {
  static getLoans(pagination: PaginationInput, search: string | undefined, status: CollectionStatusFilter = 'DISBURSED') {
    return listLoanQueue({ statuses: STATUS_FILTERS[status], pagination, search, sort: { disbursedAt: 1 } });
  }

  static async getLoanWithPayments(loanId: string) {
    const loan = await findLoanInStatuses(loanId, PORTFOLIO_STATUSES);
    return { loan, payments: await getPayments(loanId) };
  }

  static async getStats() {
    const [active, closedCount, collected] = await Promise.all([
      sumByStatus([LOAN_STATUS.DISBURSED], 'outstandingBalance'),
      Loan.countDocuments({ status: LOAN_STATUS.CLOSED }),
      Payment.aggregate<{ total: number }>([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);
    return {
      activeDisbursedCount: active.count,
      closedCount,
      totalOutstanding: active.total,
      totalCollected: roundMoney(collected[0]?.total ?? 0),
    };
  }

  /**
   * Records a repayment against a DISBURSED loan and closes the loan when it is fully paid.
   *
   * Integrity without multi-document transactions (the target MongoDB is standalone):
   * 1. Insert the Payment first. The unique index on `utrNumber` atomically claims the UTR,
   *    so a duplicate UTR can never be applied twice, even under concurrency.
   * 2. Apply it with ONE conditional update whose filter requires `status = DISBURSED` and
   *    `outstandingBalance ≥ amount`. Two concurrent payments can't both pass the
   *    overpayment check: the second write re-evaluates the filter against the new balance.
   *    The same write recomputes totals with $round (no float drift) and auto-closes.
   * 3. If that update matches nothing, delete the Payment (compensation) and report why.
   */
  static async recordPayment(loanId: string, input: RecordPaymentInput, actorId: string) {
    const loan = await Loan.findById(loanId).select('status outstandingBalance disbursedAt');
    if (!loan) throw new AppError('Loan not found', 404, undefined, 'NOT_FOUND');

    if (loan.status !== LOAN_STATUS.DISBURSED) {
      throw new AppError(
        `Payments can only be recorded against DISBURSED loans (this loan is ${loan.status}).`,
        409,
        undefined,
        'INVALID_STATUS'
      );
    }

    // Dates are compared as calendar days in the business time zone, so a payment dated
    // the same day as the disbursal is accepted regardless of the disbursal time.
    const paymentDay = parseCalendarDate(input.paymentDate);
    if (!paymentDay) {
      throw new AppError('Payment date is not a valid calendar date.', 400, [{ field: 'paymentDate', message: 'Invalid date' }], 'INVALID_PAYMENT_DATE');
    }
    if (compareCalendarDates(paymentDay, businessDateOf(new Date())) > 0) {
      throw new AppError('Payment date cannot be in the future.', 400, [{ field: 'paymentDate', message: 'Date is in the future' }], 'INVALID_PAYMENT_DATE');
    }
    if (loan.disbursedAt && compareCalendarDates(paymentDay, businessDateOf(loan.disbursedAt)) < 0) {
      const disbursedDay = businessDateOf(loan.disbursedAt);
      const label = `${disbursedDay.year}-${String(disbursedDay.month).padStart(2, '0')}-${String(disbursedDay.day).padStart(2, '0')}`;
      throw new AppError(
        `Payment date cannot be earlier than the disbursal date (${label}).`,
        400,
        [{ field: 'paymentDate', message: `Must be on or after ${label}` }],
        'INVALID_PAYMENT_DATE'
      );
    }

    const amount = roundMoney(input.amount);
    if (amount > loan.outstandingBalance) {
      throw new AppError(
        `Overpayment rejected. The outstanding balance is ${inr(loan.outstandingBalance)}.`,
        400,
        [{ field: 'amount', message: `Must not exceed ${inr(loan.outstandingBalance)}` }],
        'OVERPAYMENT'
      );
    }

    if (await Payment.exists({ utrNumber: input.utrNumber })) {
      throw new AppError(
        `UTR Number '${input.utrNumber}' has already been recorded for a payment.`,
        409,
        [{ field: 'utrNumber', message: 'This UTR has already been used' }],
        'DUPLICATE_UTR'
      );
    }

    // Step 1 — claim the UTR (E11000 here is mapped to 409 DUPLICATE_UTR by the error handler).
    const payment = await Payment.create({
      loan: loan._id,
      utrNumber: input.utrNumber,
      amount,
      paymentDate: calendarDateToUtc(paymentDay),
      recordedBy: actorId,
    });

    // Step 2 — apply atomically; the filter is the concurrency guard.
    const now = new Date();
    const isPaidOff = { $lte: ['$outstandingBalance', 0] };
    const closedEntry = historyEntry(LOAN_STATUS.CLOSED, actorId, `Auto-closed on full repayment (UTR ${input.utrNumber})`, now);

    const updatedLoan = await Loan.findOneAndUpdate(
      // 0.001 tolerance: both sides are already rounded to paise.
      { _id: loan._id, status: LOAN_STATUS.DISBURSED, outstandingBalance: { $gte: amount - 0.001 } },
      [
        { $set: { totalPaid: { $round: [{ $add: ['$totalPaid', amount] }, 2] } } },
        {
          $set: {
            outstandingBalance: { $max: [0, { $round: [{ $subtract: ['$totalRepayment', '$totalPaid'] }, 2] }] },
          },
        },
        {
          $set: {
            status: { $cond: [isPaidOff, LOAN_STATUS.CLOSED, '$status'] },
            closedAt: { $cond: [isPaidOff, now, '$closedAt'] },
            statusHistory: {
              $cond: [isPaidOff, { $concatArrays: ['$statusHistory', [{ $literal: closedEntry }]] }, '$statusHistory'],
            },
          },
        },
      ],
      { new: true }
    );

    // Step 3 — compensate if another write got there first.
    if (!updatedLoan) {
      await Payment.deleteOne({ _id: payment._id });
      const current = await Loan.findById(loan._id).select('status outstandingBalance');
      if (!current || current.status !== LOAN_STATUS.DISBURSED) {
        throw new AppError(
          `Payment not recorded: the loan is no longer DISBURSED (now ${current?.status ?? 'missing'}).`,
          409,
          undefined,
          'INVALID_STATUS'
        );
      }
      throw new AppError(
        `Overpayment rejected. The outstanding balance is ${inr(current.outstandingBalance)}.`,
        400,
        [{ field: 'amount', message: `Must not exceed ${inr(current.outstandingBalance)}` }],
        'OVERPAYMENT'
      );
    }

    const isClosed = updatedLoan.status === LOAN_STATUS.CLOSED;
    return { payment, loan: updatedLoan, isClosed };
  }
}
