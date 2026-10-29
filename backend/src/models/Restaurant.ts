import mongoose, { Document, Schema } from "mongoose";

export interface IRestaurant extends Document {
  slug: "veg" | "non-veg";
  name: string;
  subtitle: string;
  description: string;
  type: "veg" | "non-veg";
  heroImage: string;
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  minOrder: number;
  priceRange: string;
  address: string;
  openingHours: string;
  features: string[];
  bannerText: string;
  accentColor: string;
  isOpen: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RestaurantSchema = new Schema<IRestaurant>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      enum: ["veg", "non-veg"],
    },
    name: { type: String, required: true },
    subtitle: { type: String, required: true },
    description: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ["veg", "non-veg"],
    },
    heroImage: { type: String, required: true },
    rating: { type: Number, default: 4.8 },
    reviewCount: { type: Number, default: 0 },
    deliveryTime: { type: String, default: "30-40 min" },
    minOrder: { type: Number, default: 199 },
    priceRange: { type: String, default: "₹₹" },
    address: { type: String, required: true },
    openingHours: { type: String, default: "10:00 AM - 11:30 PM" },
    features: [{ type: String }],
    bannerText: { type: String },
    accentColor: { type: String, required: true },
    isOpen: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const RestaurantModel =
  mongoose.models.Restaurant ||
  mongoose.model<IRestaurant>("Restaurant", RestaurantSchema);

