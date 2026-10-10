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
  storedName: string;
  path: string;
  mimeType: string;
  size: number;
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
  rejectionReason?: string;
  sanctionedBy?: mongoose.Types.ObjectId;
  sanctionedAt?: Date;
  disbursedBy?: mongoose.Types.ObjectId;
  disbursedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const loanSchema = new Schema<ILoan>(
  {
    borrower: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    personalDetails: {
      fullName: { type: String, trim: true },
      pan: { type: String, uppercase: true, trim: true },
      dob: { type: Date },
      monthlySalary: { type: Number },
      employmentMode: {
        type: String,
        enum: Object.values(EMPLOYMENT_MODE),
      },
    },
    salarySlip: {
      originalName: { type: String },
      storedName: { type: String },
      path: { type: String },
      mimeType: { type: String },
      size: { type: Number },
    },
    amount: {
      type: Number,
      default: LOAN_CONFIG.MIN_AMOUNT,
    },
    tenureDays: {
      type: Number,
      default: LOAN_CONFIG.MIN_TENURE_DAYS,
    },
    interestRate: {
      type: Number,
      default: LOAN_CONFIG.INTEREST_RATE_PER_ANNUM,
    },
    simpleInterest: {
      type: Number,
      default: 0,
    },
    totalRepayment: {
      type: Number,
      default: 0,
    },
    totalPaid: {
      type: Number,
      default: 0,
    },
    outstandingBalance: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: Object.values(LOAN_STATUS),
      default: LOAN_STATUS.DRAFT,
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    sanctionedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    sanctionedAt: {
      type: Date,
    },
    disbursedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    disbursedAt: {
      type: Date,
    },
    closedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for status filtering sorted by creation date
loanSchema.index({ status: 1, createdAt: -1 });

export const Loan = mongoose.model<ILoan>('Loan', loanSchema);
