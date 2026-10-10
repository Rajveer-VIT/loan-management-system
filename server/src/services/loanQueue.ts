import mongoose from 'mongoose';
import { Loan, ILoan } from '../models/Loan.model.js';
import { LOAN_STATUS } from '../constants/loanStatus.js';
import { AppError } from '../utils/AppError.js';
import { escapeRegex } from '../utils/regex.js';
import { buildPaginationMeta, PaginationInput } from '../utils/pagination.js';
import { historyEntry } from './loanHistory.js';

const USER_SUMMARY = 'name email';

interface QueueOptions {
  statuses: readonly LOAN_STATUS[];
  pagination: PaginationInput;
  search?: string;
  sort?: Record<string, 1 | -1>;
}

/** Paginated list of loans in the given statuses, searchable by applicant name or PAN. */
export async function listLoanQueue({ statuses, pagination, search, sort = { createdAt: -1 } }: QueueOptions) {
  const query: mongoose.FilterQuery<ILoan> = { status: { $in: statuses } };
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    query.$or = [{ 'personalDetails.fullName': regex }, { 'personalDetails.pan': regex }];
  }

  const [loans, total] = await Promise.all([
    Loan.find(query)
      .populate('borrower', `${USER_SUMMARY} createdAt`)
      .populate('sanctionedBy disbursedBy rejectedBy', USER_SUMMARY)
      .sort({ ...sort, _id: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Loan.countDocuments(query),
  ]);

  return { loans, pagination: buildPaginationMeta(pagination, total) };
}

/** A single loan in one of `statuses`, with actors and audit-trail users populated; 404 otherwise. */
export async function findLoanInStatuses(loanId: string, statuses: readonly LOAN_STATUS[]) {
  const loan = await Loan.findOne({ _id: loanId, status: { $in: statuses } })
    .populate('borrower', `${USER_SUMMARY} createdAt`)
    .populate('sanctionedBy disbursedBy rejectedBy statusHistory.by', USER_SUMMARY);
  if (!loan) throw new AppError('Loan not found in this queue', 404, undefined, 'NOT_FOUND');
  return loan;
}

/** Sum of `field` over loans in `statuses` plus the count, computed in the database. */
export async function sumByStatus(statuses: readonly LOAN_STATUS[], field: keyof ILoan & string, extra: mongoose.FilterQuery<ILoan> = {}) {
  const [row] = await Loan.aggregate<{ count: number; total: number }>([
    { $match: { status: { $in: statuses }, ...extra } },
    { $group: { _id: null, count: { $sum: 1 }, total: { $sum: `$${field}` } } },
  ]);
  return { count: row?.count ?? 0, total: Math.round((row?.total ?? 0) * 100) / 100 };
}

interface TransitionOptions {
  loanId: string;
  from: LOAN_STATUS;
  to: LOAN_STATUS;
  actorId: string;
  /** Extra fields to set atomically with the status change (e.g. sanctionedBy/At). */
  set?: Record<string, unknown>;
  note?: string;
}

/**
 * Atomically moves a loan from `from` to `to`. The status is part of the update filter,
 * so two executives acting at once can't both succeed: the loser gets 409, not a
 * double transition. Every transition is appended to the audit trail.
 */
export async function transitionLoan({ loanId, from, to, actorId, set = {}, note }: TransitionOptions) {
  const now = new Date();
  const updated = await Loan.findOneAndUpdate(
    { _id: loanId, status: from },
    {
      $set: { status: to, ...set },
      $push: { statusHistory: historyEntry(to, actorId, note, now) },
    },
    { new: true, runValidators: true }
  )
    .populate('borrower', USER_SUMMARY)
    .populate('sanctionedBy disbursedBy rejectedBy', USER_SUMMARY);

  if (updated) return updated;

  const current = await Loan.findById(loanId).select('status');
  if (!current) throw new AppError('Loan not found', 404, undefined, 'NOT_FOUND');
  throw new AppError(
    `Invalid status transition: a ${current.status} loan cannot be moved to ${to} (expected ${from}).`,
    409,
    undefined,
    'INVALID_TRANSITION'
  );
}
