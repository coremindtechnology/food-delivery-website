import mongoose, { Document, Model, Schema } from "mongoose";

export interface IOTPChallenge extends Document {
  phone: string;
  otpHash: string;
  attempts: number;
  isVerified: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OTPChallengeSchema = new Schema<IOTPChallenge>(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0, max: 5 },
    isVerified: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        delete ret.otpHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const OTPChallenge: Model<IOTPChallenge> =
  mongoose.models.OTPChallenge ||
  mongoose.model<IOTPChallenge>("OTPChallenge", OTPChallengeSchema);

