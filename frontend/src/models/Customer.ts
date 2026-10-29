import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICustomer extends Document {
  phone: string;
  name?: string;
  email?: string;
  isVerified: boolean;
  isBlocked: boolean;
  defaultAddressId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true, index: true },
    isVerified: { type: Boolean, default: false, index: true },
    isBlocked: { type: Boolean, default: false, index: true },
    defaultAddressId: { type: Schema.Types.ObjectId, ref: "CustomerAddress" },
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

export const Customer: Model<ICustomer> =
  mongoose.models.Customer || mongoose.model<ICustomer>("Customer", CustomerSchema);

