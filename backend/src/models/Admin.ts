import mongoose, { Document, Schema } from "mongoose";

export interface IAdmin extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: "super_admin" | "veg_manager" | "nonveg_manager";
  totpSecret?: string;
  totpEnabled: boolean;
  assignedRestaurantSlug?: "veg" | "non-veg";
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new Schema<IAdmin>(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: {
      type: String,
      enum: ["super_admin", "veg_manager", "nonveg_manager"],
      default: "super_admin",
    },
    totpSecret: { type: String },
    totpEnabled: { type: Boolean, default: false },
    assignedRestaurantSlug: {
      type: String,
      enum: ["veg", "non-veg"],
    },
  },
  { timestamps: true }
);

export const AdminModel =
  mongoose.models.Admin || mongoose.model<IAdmin>("Admin", AdminSchema);

