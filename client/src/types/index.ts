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
  path: string;
  mimeType: string;
  size: number;
}

export interface Loan {
  _id: string;
  borrower: string | User;
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
  rejectionReason?: string;
  sanctionedBy?: string | User;
  sanctionedAt?: string;
  disbursedBy?: string | User;
  disbursedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  _id: string;
  loan: string | Loan;
  utrNumber: string;
  amount: number;
  paymentDate: string;
  recordedBy: string | User;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ rule?: string; field?: string; message: string }>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  stage: string;
  loanId: string | null;
  loanAmount: number | null;
}
