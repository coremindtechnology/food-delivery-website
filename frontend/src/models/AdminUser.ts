import mongoose, { Document, Model, Schema } from "mongoose";

export type AdminRole =
  | "super_admin"
  | "restaurant_manager"
  | "order_manager"
  | "menu_manager"
  | "delivery_manager"
  | "delivery_personnel"
  | "finance_viewer"
  | "veg_manager"
  | "nonveg_manager";

export interface IAdminUser extends Document {
  email: string;
  phone: string;
  passwordHash: string;
  name: string;
  role: AdminRole;
  assignedRestaurantId?: mongoose.Types.ObjectId;
  totpSecret?: string;
  totpEncryptedSecret?: string;
  totpIV?: string;
  totpAuthTag?: string;
  totpEnabled: boolean;
  totpRecoveryCodes?: string[];
  failedLoginAttempts: number;
  lockedUntil?: Date;
  temporaryAccessExpiresAt?: Date;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: [
        "super_admin",
        "restaurant_manager",
        "order_manager",
        "menu_manager",
        "delivery_manager",
        "delivery_personnel",
        "finance_viewer",
        "veg_manager",
        "nonveg_manager",
      ],
      default: "super_admin",
      index: true,
    },
    assignedRestaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      index: true,
    },
    totpSecret: { type: String },
    totpEncryptedSecret: { type: String },
    totpIV: { type: String },
    totpAuthTag: { type: String },
    totpEnabled: { type: Boolean, default: false },
    totpRecoveryCodes: [{ type: String }],
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    temporaryAccessExpiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        delete ret.passwordHash;
        delete ret.totpSecret;
        delete ret.totpEncryptedSecret;
        delete ret.totpIV;
        delete ret.totpAuthTag;
        delete ret.totpRecoveryCodes;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const AdminUser: Model<IAdminUser> =
  mongoose.models.AdminUser || mongoose.model<IAdminUser>("AdminUser", AdminUserSchema);
