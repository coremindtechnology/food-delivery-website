import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPaymentWebhookEvent extends Document {
  eventId: string;
  eventType: string;
  status: "processing" | "processed" | "failed";
  processingStartedAt?: Date;
  failureReason?: string;
  processedAt?: Date;
  createdAt: Date;
}

const PaymentWebhookEventSchema = new Schema<IPaymentWebhookEvent>(
  {
    eventId: { type: String, required: true, unique: true },
    eventType: { type: String, required: true },
    status: {
      type: String,
      enum: ["processing", "processed", "failed"],
      default: "processing",
      index: true,
    },
    processingStartedAt: { type: Date, default: Date.now, index: true },
    failureReason: { type: String },
    processedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const PaymentWebhookEvent: Model<IPaymentWebhookEvent> =
  mongoose.models.PaymentWebhookEvent ||
  mongoose.model<IPaymentWebhookEvent>("PaymentWebhookEvent", PaymentWebhookEventSchema);
