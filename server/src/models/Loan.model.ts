import mongoose, { Schema, Document } from 'mongoose';
import { LOAN_STATUS } from '../constants/loanStatus.js';
import { EMPLOYMENT_MODE, LOAN_CONFIG } from '../constants/loanConfig.js';

export interface IPersonalDetails {
  fullName: string;
  pan: string;
  dob: Date;
  monthlySalary: number;
  employmentMode: EMPLOYMENT_MODE;
}

export interface ISalarySlip {
  originalName: string;
  /** Server-generated file name inside UPLOAD_DIR. The on-disk path is never exposed to clients. */
  storedName: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

/** One entry per lifecycle transition — the loan's audit trail. */
export interface IStatusHistoryEntry {
  status: LOAN_STATUS;
  at: Date;
  by?: mongoose.Types.ObjectId;
  note?: string;
}

export interface ILoan extends Document {
  _id: mongoose.Types.ObjectId;
  borrower: mongoose.Types.ObjectId;
  personalDetails?: IPersonalDetails;
  salarySlip?: ISalarySlip;
  amount: number;
  tenureDays: number;
  interestRate: number;
  simpleInterest: number;
  totalRepayment: number;
  totalPaid: number;
  outstandingBalance: number;
  status: LOAN_STATUS;
  statusHistory: IStatusHistoryEntry[];
  appliedAt?: Date;
  rejectionReason?: string;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  sanctionedBy?: mongoose.Types.ObjectId;
  sanctionedAt?: Date;
  disbursedBy?: mongoose.Types.ObjectId;
  disbursedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const statusHistorySchema = new Schema<IStatusHistoryEntry>(
  {
    status: { type: String, enum: Object.values(LOAN_STATUS), required: true },
    at: { type: Date, required: true },
    by: { type: Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false }
);

const loanSchema = new Schema<ILoan>(
  {
    borrower: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    personalDetails: {
      fullName: { type: String, trim: true },
      pan: { type: String, uppercase: true, trim: true },
      dob: { type: Date },
      monthlySalary: { type: Number, min: 0 },
      employmentMode: { type: String, enum: Object.values(EMPLOYMENT_MODE) },
    },
    salarySlip: {
      originalName: { type: String },
      storedName: { type: String },
      mimeType: { type: String },
      size: { type: Number },
      uploadedAt: { type: Date },
    },
    amount: {
      type: Number,
      default: LOAN_CONFIG.MIN_AMOUNT,
      min: LOAN_CONFIG.MIN_AMOUNT,
      max: LOAN_CONFIG.MAX_AMOUNT,
    },
    tenureDays: {
      type: Number,
      default: LOAN_CONFIG.MIN_TENURE_DAYS,
      min: LOAN_CONFIG.MIN_TENURE_DAYS,
      max: LOAN_CONFIG.MAX_TENURE_DAYS,
    },
    interestRate: { type: Number, default: LOAN_CONFIG.INTEREST_RATE_PER_ANNUM },
    simpleInterest: { type: Number, default: 0, min: 0 },
    totalRepayment: { type: Number, default: 0, min: 0 },
    totalPaid: { type: Number, default: 0, min: 0 },
    outstandingBalance: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: Object.values(LOAN_STATUS),
      default: LOAN_STATUS.DRAFT,
      index: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
    appliedAt: { type: Date },
    rejectionReason: { type: String, trim: true, maxlength: 500 },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: { type: Date },
    sanctionedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    sanctionedAt: { type: Date },
    disbursedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    disbursedAt: { type: Date },
    closedAt: { type: Date },
  },
  { timestamps: true }
);

loanSchema.index({ status: 1, createdAt: -1 });

// At most one in-progress DRAFT per borrower. Two concurrent "save personal details"
// requests can't create duplicate drafts: the second insert fails with E11000.
loanSchema.index(
  { borrower: 1 },
  { unique: true, partialFilterExpression: { status: LOAN_STATUS.DRAFT }, name: 'one_draft_per_borrower' }
);

export const Loan = mongoose.model<ILoan>('Loan', loanSchema);
