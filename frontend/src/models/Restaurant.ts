import mongoose, { Document, Model, Schema } from "mongoose";

export interface IRestaurant extends Document {
  name: string;
  slug: "veg" | "non-veg";
  type: "veg" | "non-veg";
  subtitle: string;
  description: string;
  heroImage: string;
  fssaiLicenseNumber: string;
  contactPhone: string;
  contactEmail: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  openingHours: string;
  deliveryTime: string;
  minOrderAmount: number;
  priceRange: string;
  accentColor: string;
  bannerText?: string;
  features: string[];
  rating: number;
  reviewCount: number;
  isOpen: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RestaurantSchema = new Schema<IRestaurant>(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      enum: ["veg", "non-veg"],
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["veg", "non-veg"],
      index: true,
    },
    subtitle: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    heroImage: { type: String, required: true },
    fssaiLicenseNumber: { type: String, required: true, trim: true },
    contactPhone: { type: String, required: true, trim: true },
    contactEmail: { type: String, required: true, trim: true, lowercase: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    openingHours: { type: String, default: "10:00 AM - 11:30 PM" },
    deliveryTime: { type: String, default: "25-35 min" },
    minOrderAmount: { type: Number, default: 199, min: 0 },
    priceRange: { type: String, default: "₹₹" },
    accentColor: { type: String, required: true },
    bannerText: { type: String },
    features: [{ type: String }],
    rating: { type: Number, default: 4.8, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    isOpen: { type: Boolean, default: true, index: true },
    isArchived: { type: Boolean, default: false, index: true },
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

export const Restaurant: Model<IRestaurant> =
  mongoose.models.Restaurant || mongoose.model<IRestaurant>("Restaurant", RestaurantSchema);

