import mongoose, { Document, Model, Schema } from "mongoose";

export interface IRefund extends Document {
  orderId: mongoose.Types.ObjectId;
  paymentId: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  amount: number;
  reason: string;
  status: "pending" | "processed" | "failed";
  razorpayRefundId?: string;
  processedByAdminId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RefundSchema = new Schema<IRefund>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
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
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "processed", "failed"],
      default: "pending",
      index: true,
    },
    razorpayRefundId: { type: String, index: true },
    processedByAdminId: { type: Schema.Types.ObjectId, ref: "AdminUser" },
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

export const Refund: Model<IRefund> =
  mongoose.models.Refund || mongoose.model<IRefund>("Refund", RefundSchema);

