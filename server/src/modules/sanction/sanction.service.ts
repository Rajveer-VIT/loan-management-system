import { LOAN_STATUS } from '../../constants/loanStatus.js';
import { PaginationInput } from '../../utils/pagination.js';
import { findLoanInStatuses, listLoanQueue, sumByStatus, transitionLoan } from '../../services/loanQueue.js';
import { startOfBusinessDay } from '../../utils/dates.js';
import { Loan } from '../../models/Loan.model.js';

export class SanctionService {
  static getAppliedLoans(pagination: PaginationInput, search?: string) {
    // Oldest first: applications are reviewed in the order they arrived.
    return listLoanQueue({ statuses: [LOAN_STATUS.APPLIED], pagination, search, sort: { appliedAt: 1 } });
  }

  static getLoanById(loanId: string) {
    return findLoanInStatuses(loanId, [LOAN_STATUS.APPLIED]);
  }

  static async getStats() {
    const today = startOfBusinessDay();
    const [pending, sanctionedToday, rejectedToday] = await Promise.all([
      sumByStatus([LOAN_STATUS.APPLIED], 'amount'),
      Loan.countDocuments({ sanctionedAt: { $gte: today } }),
      Loan.countDocuments({ rejectedAt: { $gte: today } }),
    ]);
    return {
      pendingCount: pending.count,
      totalPendingAmount: pending.total,
      sanctionedToday,
      rejectedToday,
    };
  }

  /** APPLIED → SANCTIONED */
  static approveLoan(loanId: string, actorId: string) {
    return transitionLoan({
      loanId,
      from: LOAN_STATUS.APPLIED,
      to: LOAN_STATUS.SANCTIONED,
      actorId,
      set: { sanctionedBy: actorId, sanctionedAt: new Date() },
    });
  }

  /** APPLIED → REJECTED, with a mandatory reason recorded on the loan and in the audit trail. */
  static rejectLoan(loanId: string, actorId: string, rejectionReason: string) {
    return transitionLoan({
      loanId,
      from: LOAN_STATUS.APPLIED,
      to: LOAN_STATUS.REJECTED,
      actorId,
      set: { rejectionReason, rejectedBy: actorId, rejectedAt: new Date() },
      note: rejectionReason,
    });
  }
}
