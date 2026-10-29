import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICustomerAddress extends Document {
  customerId: mongoose.Types.ObjectId;
  label: "Home" | "Work" | "Other" | string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerAddressSchema = new Schema<ICustomerAddress>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    label: { type: String, default: "Home" },
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
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

CustomerAddressSchema.index({ customerId: 1, isDefault: 1 });

export const CustomerAddress: Model<ICustomerAddress> =
  mongoose.models.CustomerAddress ||
  mongoose.model<ICustomerAddress>("CustomerAddress", CustomerAddressSchema);

