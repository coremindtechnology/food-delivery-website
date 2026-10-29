import mongoose, { Document, Model, Schema } from "mongoose";

export interface IInventoryMovement extends Document {
  restaurantId: mongoose.Types.ObjectId;
  menuItemId: mongoose.Types.ObjectId;
  movementType: "restock" | "order_deduction" | "wastage" | "adjustment";
  quantity: number;
  previousCount: number;
  newCount: number;
  orderId?: mongoose.Types.ObjectId;
  reason?: string;
  performedByAdminId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    menuItemId: {
      type: Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true,
      index: true,
    },
    movementType: {
      type: String,
      enum: ["restock", "order_deduction", "wastage", "adjustment"],
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true },
    previousCount: { type: Number, required: true },
    newCount: { type: Number, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    reason: { type: String, trim: true },
    performedByAdminId: { type: Schema.Types.ObjectId, ref: "AdminUser" },
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

InventoryMovementSchema.index({ restaurantId: 1, createdAt: -1 });

export const InventoryMovement: Model<IInventoryMovement> =
  mongoose.models.InventoryMovement ||
  mongoose.model<IInventoryMovement>("InventoryMovement", InventoryMovementSchema);

