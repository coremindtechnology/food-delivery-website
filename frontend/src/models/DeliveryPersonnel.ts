import mongoose, { Document, Model, Schema } from "mongoose";

export interface IDeliveryPersonnel extends Document {
  name: string;
  phone: string;
  vehicleNumber: string;
  status: "available" | "on_delivery" | "off_duty";
  currentActiveOrderId?: mongoose.Types.ObjectId;
  assignedRestaurantId?: mongoose.Types.ObjectId;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryPersonnelSchema = new Schema<IDeliveryPersonnel>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true, index: true },
    vehicleNumber: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["available", "on_delivery", "off_duty"],
      default: "available",
      index: true,
    },
    currentActiveOrderId: { type: Schema.Types.ObjectId, ref: "Order" },
    assignedRestaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", index: true },
    isBlocked: { type: Boolean, default: false },
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

export const DeliveryPersonnel: Model<IDeliveryPersonnel> =
  mongoose.models.DeliveryPersonnel ||
  mongoose.model<IDeliveryPersonnel>("DeliveryPersonnel", DeliveryPersonnelSchema);

