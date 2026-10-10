import mongoose from 'mongoose';
import { LOAN_STATUS } from '../constants/loanStatus.js';
import { IStatusHistoryEntry } from '../models/Loan.model.js';

/** Builds an audit-trail entry recording who moved the loan into `status`, and when. */
export function historyEntry(
  status: LOAN_STATUS,
  actorId?: string,
  note?: string,
  at: Date = new Date()
): IStatusHistoryEntry {
  return {
    status,
    at,
    ...(actorId && { by: new mongoose.Types.ObjectId(actorId) }),
    ...(note && { note }),
  };
}
