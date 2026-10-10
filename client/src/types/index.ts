export enum ROLES {
  ADMIN = 'ADMIN',
  SALES = 'SALES',
  SANCTION = 'SANCTION',
  DISBURSEMENT = 'DISBURSEMENT',
  COLLECTION = 'COLLECTION',
  BORROWER = 'BORROWER',
}

export enum LOAN_STATUS {
  DRAFT = 'DRAFT',
  APPLIED = 'APPLIED',
  SANCTIONED = 'SANCTIONED',
  REJECTED = 'REJECTED',
  DISBURSED = 'DISBURSED',
  CLOSED = 'CLOSED',
}

export enum EMPLOYMENT_MODE {
  SALARIED = 'SALARIED',
  SELF_EMPLOYED = 'SELF_EMPLOYED',
  UNEMPLOYED = 'UNEMPLOYED',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: ROLES;
  createdAt: string;
}

/** A user reference as populated by the API (`name email`). */
export interface UserSummary {
  _id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface PersonalDetails {
  fullName: string;
  pan: string;
  dob: string;
  monthlySalary: number;
  employmentMode: EMPLOYMENT_MODE;
}

export interface SalarySlip {
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  uploadedAt?: string;
}

export interface StatusHistoryEntry {
  status: LOAN_STATUS;
  at: string;
  by?: string | UserSummary;
  note?: string;
}

export interface Loan {
  _id: string;
  borrower: string | UserSummary;
  personalDetails?: PersonalDetails;
  salarySlip?: SalarySlip;
  amount: number;
  tenureDays: number;
  interestRate: number;
  simpleInterest: number;
  totalRepayment: number;
  totalPaid: number;
  outstandingBalance: number;
  status: LOAN_STATUS;
  statusHistory?: StatusHistoryEntry[];
  appliedAt?: string;
  rejectionReason?: string;
  rejectedBy?: string | UserSummary;
  rejectedAt?: string;
  sanctionedBy?: string | UserSummary;
  sanctionedAt?: string;
  disbursedBy?: string | UserSummary;
  disbursedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  _id: string;
  loan: string;
  utrNumber: string;
  amount: number;
  paymentDate: string;
  recordedBy?: string | UserSummary;
  createdAt: string;
}

export interface FieldError {
  rule?: string;
  field?: string;
  message: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  code?: string;
  data?: T;
  errors?: FieldError[];
  pagination?: Pagination;
}

export type LeadStage = 'REGISTERED' | 'PROFILE_SAVED' | 'SLIP_UPLOADED';

export interface Lead {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  lastActivityAt: string;
  stage: LeadStage;
}

export interface DraftState {
  draftLoan: Loan | null;
  currentStep: 'personal' | 'salary-slip' | 'loan-config';
}

export interface PaymentResult {
  payment: Payment;
  loan: Loan;
  isClosed: boolean;
}

export interface SalesStats {
  totalLeads: number;
  newLeadsToday: number;
  convertedBorrowers: number;
  funnel: Record<LeadStage, number>;
}

export interface SanctionStats {
  pendingCount: number;
  totalPendingAmount: number;
  sanctionedToday: number;
  rejectedToday: number;
}

export interface DisbursementStats {
  pendingCount: number;
  totalPendingAmount: number;
  disbursedTodayCount: number;
  disbursedTodayAmount: number;
}

export interface CollectionStats {
  activeDisbursedCount: number;
  closedCount: number;
  totalOutstanding: number;
  totalCollected: number;
}
