import mongoose, { Document, Model, Schema } from "mongoose";

export interface IDeliveryAssignment extends Document {
  orderId: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  deliveryPersonnelId: mongoose.Types.ObjectId;
  status: "assigned" | "picked_up" | "delivered" | "failed";
  assignedAt: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  deliveryNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryAssignmentSchema = new Schema<IDeliveryAssignment>(
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
    deliveryPersonnelId: {
      type: Schema.Types.ObjectId,
      ref: "DeliveryPersonnel",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["assigned", "picked_up", "delivered", "failed"],
      default: "assigned",
      index: true,
    },
    assignedAt: { type: Date, default: Date.now },
    pickedUpAt: { type: Date },
    deliveredAt: { type: Date },
    deliveryNotes: { type: String },
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

DeliveryAssignmentSchema.index({ restaurantId: 1, status: 1 });

export const DeliveryAssignment: Model<IDeliveryAssignment> =
  mongoose.models.DeliveryAssignment ||
  mongoose.model<IDeliveryAssignment>("DeliveryAssignment", DeliveryAssignmentSchema);

