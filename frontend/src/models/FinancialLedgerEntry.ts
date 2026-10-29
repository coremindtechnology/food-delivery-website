import mongoose, { Document, Model, Schema } from "mongoose";

export interface IFinancialLedgerEntry extends Document {
  restaurantId: mongoose.Types.ObjectId;
  entryType: "credit" | "debit";
  category: "order_revenue" | "delivery_fee" | "refund" | "expense" | "settlement";
  amount: number;
  balanceAfter: number;
  referenceModel?: "Order" | "Expense" | "Refund";
  referenceId?: mongoose.Types.ObjectId;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const FinancialLedgerEntrySchema = new Schema<IFinancialLedgerEntry>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    entryType: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ["order_revenue", "delivery_fee", "refund", "expense", "settlement"],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, required: true },
    referenceModel: {
      type: String,
      enum: ["Order", "Expense", "Refund"],
    },
    referenceId: { type: Schema.Types.ObjectId },
    description: { type: String, required: true, trim: true },
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

FinancialLedgerEntrySchema.index({ restaurantId: 1, createdAt: -1 });

export const FinancialLedgerEntry: Model<IFinancialLedgerEntry> =
  mongoose.models.FinancialLedgerEntry ||
  mongoose.model<IFinancialLedgerEntry>("FinancialLedgerEntry", FinancialLedgerEntrySchema);

