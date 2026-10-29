import mongoose, { Document, Schema } from "mongoose";

export interface IFoodItem extends Document {
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  restaurantSlug: "veg" | "non-veg";
  isVeg: boolean;
  isPopular: boolean;
  isChefSpecial: boolean;
  spicyLevel: number;
  rating: number;
  reviewsCount: number;
  preparationTime: string;
  calories?: number;
  tags: string[];
  inStock: boolean;
  inventoryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const FoodItemSchema = new Schema<IFoodItem>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    image: { type: String, required: true },
    category: { type: String, required: true, index: true },
    restaurantSlug: {
      type: String,
      required: true,
      enum: ["veg", "non-veg"],
      index: true,
    },
    isVeg: { type: Boolean, required: true },
    isPopular: { type: Boolean, default: false },
    isChefSpecial: { type: Boolean, default: false },
    spicyLevel: { type: Number, default: 1, min: 0, max: 3 },
    rating: { type: Number, default: 4.8 },
    reviewsCount: { type: Number, default: 0 },
    preparationTime: { type: String, default: "20-25 min" },
    calories: { type: Number },
    tags: [{ type: String }],
    inStock: { type: Boolean, default: true },
    inventoryCount: { type: Number, default: 100 },
  },
  { timestamps: true }
);

export const FoodItemModel =
  mongoose.models.FoodItem ||
  mongoose.model<IFoodItem>("FoodItem", FoodItemSchema);

