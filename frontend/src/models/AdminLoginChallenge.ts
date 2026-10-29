import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAdminLoginChallenge extends Document {
  adminId: mongoose.Types.ObjectId;
  challengeTokenHash: string;
  step: "password_verified" | "sms_verified" | "completed";
  smsOtpHash: string;
  smsOtpExpiresAt: Date;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const AdminLoginChallengeSchema = new Schema<IAdminLoginChallenge>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "AdminUser",
      required: true,
      index: true,
    },
    challengeTokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    step: {
      type: String,
      enum: ["password_verified", "sms_verified", "completed"],
      default: "password_verified",
    },
    smsOtpHash: { type: String, required: true },
    smsOtpExpiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        delete ret.smsOtpHash;
        delete ret.challengeTokenHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const AdminLoginChallenge: Model<IAdminLoginChallenge> =
  mongoose.models.AdminLoginChallenge ||
  mongoose.model<IAdminLoginChallenge>("AdminLoginChallenge", AdminLoginChallengeSchema);

