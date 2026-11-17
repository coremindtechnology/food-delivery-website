import mongoose, { Document, Model, Schema } from "mongoose";

export interface IDeliverySession extends Document {
  deliveryPersonnelId: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

const DeliverySessionSchema = new Schema<IDeliverySession>(
  {
    deliveryPersonnelId: {
      type: Schema.Types.ObjectId,
      ref: "DeliveryPersonnel",
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const DeliverySession: Model<IDeliverySession> =
  mongoose.models.DeliverySession ||
  mongoose.model<IDeliverySession>("DeliverySession", DeliverySessionSchema);
