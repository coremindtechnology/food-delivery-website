import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  phone: string;
  name?: string;
  email?: string;
  addresses: {
    label: string;
    street: string;
    city: string;
    pincode: string;
    landmark?: string;
  }[];
  otpCode?: string;
  otpExpiresAt?: Date;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true, index: true },
    name: { type: String },
    email: { type: String },
    addresses: [
      {
        label: { type: String, default: "Home" },
        street: { type: String, required: true },
        city: { type: String, required: true },
        pincode: { type: String, required: true },
        landmark: { type: String },
      },
    ],
    otpCode: { type: String },
    otpExpiresAt: { type: Date },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const UserModel =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

