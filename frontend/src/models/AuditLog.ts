import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAuditLog extends Document {
  restaurantId?: mongoose.Types.ObjectId;
  actorType: "admin" | "customer" | "system";
  actorId?: mongoose.Types.ObjectId;
  action: string;
  entity: "Restaurant" | "MenuCategory" | "MenuItem" | "Order" | "Payment" | "Refund" | "Inventory" | "Admin";
  entityId?: mongoose.Types.ObjectId;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      index: true,
    },
    actorType: {
      type: String,
      enum: ["admin", "customer", "system"],
      required: true,
      index: true,
    },
    actorId: { type: Schema.Types.ObjectId },
    action: { type: String, required: true, index: true },
    entity: {
      type: String,
      enum: ["Restaurant", "MenuCategory", "MenuItem", "Order", "Payment", "Refund", "Inventory", "Admin"],
      required: true,
      index: true,
    },
    entityId: { type: Schema.Types.ObjectId, index: true },
    previousState: { type: Schema.Types.Mixed },
    newState: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

AuditLogSchema.index({ restaurantId: 1, createdAt: -1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

