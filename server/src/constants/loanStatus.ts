import { ROLES } from './roles.js';

export enum LOAN_STATUS {
  DRAFT = 'DRAFT',
  APPLIED = 'APPLIED',
  SANCTIONED = 'SANCTIONED',
  REJECTED = 'REJECTED',
  DISBURSED = 'DISBURSED',
  CLOSED = 'CLOSED',
}

export const ALLOWED_TRANSITIONS: Record<LOAN_STATUS, LOAN_STATUS[]> = {
  [LOAN_STATUS.DRAFT]: [LOAN_STATUS.APPLIED],
  [LOAN_STATUS.APPLIED]: [LOAN_STATUS.SANCTIONED, LOAN_STATUS.REJECTED],
  [LOAN_STATUS.SANCTIONED]: [LOAN_STATUS.DISBURSED],
  [LOAN_STATUS.REJECTED]: [],
  [LOAN_STATUS.DISBURSED]: [LOAN_STATUS.CLOSED],
  [LOAN_STATUS.CLOSED]: [],
};

/**
 * Who may move a loan INTO each status. CLOSED is never set by a person directly: it is
 * applied automatically by the payment write that brings the outstanding balance to zero
 * (so it is triggered by COLLECTION/ADMIN recording that payment).
 */
export const TRANSITION_ACTORS: Record<Exclude<LOAN_STATUS, LOAN_STATUS.DRAFT>, readonly ROLES[]> = {
  [LOAN_STATUS.APPLIED]: [ROLES.BORROWER],
  [LOAN_STATUS.SANCTIONED]: [ROLES.SANCTION, ROLES.ADMIN],
  [LOAN_STATUS.REJECTED]: [ROLES.SANCTION, ROLES.ADMIN],
  [LOAN_STATUS.DISBURSED]: [ROLES.DISBURSEMENT, ROLES.ADMIN],
  [LOAN_STATUS.CLOSED]: [ROLES.COLLECTION, ROLES.ADMIN],
};

/** Statuses in which a borrower has a live application or loan; only one may exist at a time. */
export const OPEN_LOAN_STATUSES: readonly LOAN_STATUS[] = [
  LOAN_STATUS.APPLIED,
  LOAN_STATUS.SANCTIONED,
  LOAN_STATUS.DISBURSED,
];

export function isValidStatusTransition(from: LOAN_STATUS, to: LOAN_STATUS): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
