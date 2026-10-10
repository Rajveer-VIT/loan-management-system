import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  _id: mongoose.Types.ObjectId;
  loan: mongoose.Types.ObjectId;
  utrNumber: string;
  amount: number;
  paymentDate: Date;
  recordedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    loan: {
      type: Schema.Types.ObjectId,
      ref: 'Loan',
      required: true,
      index: true,
    },
    utrNumber: {
      type: String,
      required: [true, 'UTR Number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [1, 'Payment amount must be greater than 0'],
    },
    paymentDate: {
      type: Date,
      required: [true, 'Payment date is required'],
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
