import { Schema, model, Document, Types } from "mongoose";

export enum TransactionStatus {
  PENDING = "PENDING",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
}

export enum PaymentMethod {
  STRIPE = "STRIPE",
  CARD = "CARD",
}

export enum PayoutStatus {
  NONE = "NONE",
  PENDING = "PENDING",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
}

export enum RefundStatus {
  NONE = "NONE",
  PENDING = "PENDING",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
}

export interface ITransaction {
  // a short human-friendly transaction code, e.g. "TXN-000123".  We
  // keep this separate from the Mongo _id so that it can be exposed to
  // clients and still be indexed uniquely.
  code?: string;

  deliveryId: Types.ObjectId;
  customerId: Types.ObjectId;
  driverId: Types.ObjectId;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: TransactionStatus;

  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  refundStatus?: RefundStatus;
  refundAmount?: number;
  refundedAt?: Date;
  commissionRate?: number;
  commissionAmount?: number;
  driverReceiptAmount?: number;
  payoutStatus?: PayoutStatus;
  stripeTransferId?: string;
  payoutAt?: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    deliveryId: { type: Schema.Types.ObjectId, ref: "Delivery", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // optionally store a human-readable transaction code.  The unique
    // index is sparse so older documents without a code (or documents
    // created when code generation was not yet wired up) won't collide.
    code: { type: String, unique: true, sparse: true },

    driverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    method: { type: String, enum: Object.values(PaymentMethod), required: true },
    status: { type: String, enum: Object.values(TransactionStatus), required: true },

    stripeSessionId: { type: String },

    stripePaymentIntentId: { type: String },
    stripeChargeId: { type: String },
    refundStatus: { type: String, enum: Object.values(RefundStatus) },
    refundAmount: { type: Number },
    refundedAt: { type: Date },
    commissionRate: { type: Number },
    commissionAmount: { type: Number },
    driverReceiptAmount: { type: Number },
    payoutStatus: { type: String, enum: Object.values(PayoutStatus) },
    stripeTransferId: { type: String },
    payoutAt: { type: Date },
  },
  { timestamps: true }
);

export const Transaction = model<ITransaction>("Transaction", TransactionSchema);
