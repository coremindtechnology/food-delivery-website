import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPayment extends Document {
  orderId: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  paymentMethod: "razorpay" | "cod";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  status: "created" | "authorized" | "captured" | "partially_paid" | "failed" | "partially_refunded" | "refunded";
  attemptKey?: string;
  attemptNumber: number;
  amountRefunded: number;
  amountRefundReserved: number;
  processedRefundIds: mongoose.Types.ObjectId[];
  duplicateCapture: boolean;
  duplicateCaptureIds: string[];
  requiresRefund: boolean;
  codCollectedAmount: number;
  codOutstandingAmount: number;
  codCollections: {
    amount: number;
    collectedAt: Date;
    collectedByDeliveryPersonnelId?: mongoose.Types.ObjectId;
  }[];
  capturedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    paymentMethod: {
      type: String,
      enum: ["razorpay", "cod"],
      required: true,
      index: true,
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    status: {
      type: String,
      enum: ["created", "authorized", "captured", "partially_paid", "failed", "partially_refunded", "refunded"],
      default: "created",
      index: true,
    },
    failureReason: { type: String },
    attemptKey: { type: String, unique: true, sparse: true, index: true },
    attemptNumber: { type: Number, default: 1, min: 1 },
    amountRefunded: { type: Number, default: 0, min: 0 },
    amountRefundReserved: { type: Number, default: 0, min: 0 },
    processedRefundIds: [{ type: Schema.Types.ObjectId, ref: "Refund" }],
    duplicateCapture: { type: Boolean, default: false, index: true },
    duplicateCaptureIds: [{ type: String }],
    requiresRefund: { type: Boolean, default: false, index: true },
    codCollectedAmount: { type: Number, default: 0, min: 0 },
    codOutstandingAmount: { type: Number, default: 0, min: 0 },
    codCollections: [
      {
        amount: { type: Number, required: true, min: 0 },
        collectedAt: { type: Date, required: true, default: Date.now },
        collectedByDeliveryPersonnelId: { type: Schema.Types.ObjectId, ref: "DeliveryPersonnel" },
      },
    ],
    capturedAt: { type: Date, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

PaymentSchema.index({ orderId: 1, attemptNumber: 1 }, { unique: true });
PaymentSchema.index({ razorpayPaymentId: 1 }, { unique: true, sparse: true });
PaymentSchema.index({ razorpayOrderId: 1 }, { unique: true, sparse: true });
PaymentSchema.index({ paymentMethod: 1, capturedAt: 1 });
PaymentSchema.index({ restaurantId: 1, createdAt: 1 });
PaymentSchema.index({ restaurantId: 1, "codCollections.collectedAt": 1 });

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);
