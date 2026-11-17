import mongoose, { Document, Model, Schema } from "mongoose";

export interface IExpense extends Document {
  restaurantId: mongoose.Types.ObjectId;
  title: string;
  category:
    | "food_cost"
    | "raw_materials"
    | "packaging"
    | "delivery"
    | "staff"
    | "rent"
    | "utilities"
    | "gateway_fees"
    | "maintenance"
    | "other";
  amount: number;
  expenseDate: Date;
  notes?: string;
  receiptUrl?: string;
  recordedByAdminId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: [
        "food_cost",
        "raw_materials",
        "packaging",
        "delivery",
        "staff",
        "rent",
        "utilities",
        "gateway_fees",
        "maintenance",
        "other",
      ],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    expenseDate: { type: Date, default: Date.now, index: true },
    notes: { type: String, trim: true },
    receiptUrl: { type: String },
    recordedByAdminId: { type: Schema.Types.ObjectId, ref: "AdminUser" },
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

ExpenseSchema.index({ restaurantId: 1, expenseDate: -1 });

export const Expense: Model<IExpense> =
  mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);
