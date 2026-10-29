import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISession extends Document {
  userType: "customer" | "admin";
  userId?: mongoose.Types.ObjectId;
  adminId?: mongoose.Types.ObjectId;
  tokenHash: string;
  ipAddress?: string;
  userAgent?: string;
  isValid: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    userType: {
      type: String,
      enum: ["customer", "admin"],
      required: true,
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "Customer" },
    adminId: { type: Schema.Types.ObjectId, ref: "AdminUser" },
    tokenHash: { type: String, required: true, unique: true, index: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    isValid: { type: Boolean, default: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        delete ret.tokenHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Session: Model<ISession> =
  mongoose.models.Session || mongoose.model<ISession>("Session", SessionSchema);

