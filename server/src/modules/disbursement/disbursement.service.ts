import { LOAN_STATUS } from '../../constants/loanStatus.js';
import { PaginationInput } from '../../utils/pagination.js';
import { startOfBusinessDay } from '../../utils/dates.js';
import { findLoanInStatuses, listLoanQueue, sumByStatus, transitionLoan } from '../../services/loanQueue.js';

export class DisbursementService {
  static getSanctionedLoans(pagination: PaginationInput, search?: string) {
    return listLoanQueue({ statuses: [LOAN_STATUS.SANCTIONED], pagination, search, sort: { sanctionedAt: 1 } });
  }

  static getLoanById(loanId: string) {
    return findLoanInStatuses(loanId, [LOAN_STATUS.SANCTIONED]);
  }

  static async getStats() {
    const [pending, disbursedToday] = await Promise.all([
      sumByStatus([LOAN_STATUS.SANCTIONED], 'amount'),
      sumByStatus([LOAN_STATUS.DISBURSED, LOAN_STATUS.CLOSED], 'amount', { disbursedAt: { $gte: startOfBusinessDay() } }),
    ]);
    return {
      pendingCount: pending.count,
      totalPendingAmount: pending.total,
      disbursedTodayCount: disbursedToday.count,
      disbursedTodayAmount: disbursedToday.total,
    };
  }

  /**
   * SANCTIONED → DISBURSED. The status-conditional update makes this idempotent under
   * double-clicks or concurrent executives: only the first call succeeds, the rest get 409.
   */
  static disburseLoan(loanId: string, actorId: string) {
    return transitionLoan({
      loanId,
      from: LOAN_STATUS.SANCTIONED,
      to: LOAN_STATUS.DISBURSED,
      actorId,
      set: { disbursedBy: actorId, disbursedAt: new Date() },
    });
  }
}
