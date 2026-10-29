import mongoose, { Document, Model, Schema } from "mongoose";

export interface IVariant {
  id: string;
  name: string;
  portionDescription?: string;
  price: number;
  isDefault?: boolean;
}

export interface IAddon {
  id: string;
  name: string;
  price: number;
}

export interface IMenuItem extends Document {
  restaurantId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  categorySlug: string;
  subcategorySlug?: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  isVeg: boolean;
  isPopular: boolean;
  isChefSpecial: boolean;
  spicyLevel: number;
  rating: number;
  reviewsCount: number;
  preparationTime: string;
  calories?: number;
  serves?: string;
  tags: string[];
  ingredients: string[];
  allergens: string[];
  variants: IVariant[];
  addons: IAddon[];
  available: boolean;
  inStock: boolean;
  inventoryCount: number;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VariantSchema = new Schema<IVariant>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  portionDescription: { type: String },
  price: { type: Number, required: true, min: 0 },
  isDefault: { type: Boolean, default: false },
});

const AddonSchema = new Schema<IAddon>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
});

const MenuItemSchema = new Schema<IMenuItem>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "MenuCategory",
      required: true,
      index: true,
    },
    categorySlug: { type: String, required: true, index: true },
    subcategorySlug: { type: String, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, min: 0 },
    image: { type: String, required: true },
    isVeg: { type: Boolean, required: true, index: true },
    isPopular: { type: Boolean, default: false, index: true },
    isChefSpecial: { type: Boolean, default: false, index: true },
    spicyLevel: { type: Number, default: 1, min: 0, max: 3 },
    rating: { type: Number, default: 4.8, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0, min: 0 },
    preparationTime: { type: String, default: "20-25 min" },
    calories: { type: Number },
    serves: { type: String },
    tags: [{ type: String }],
    ingredients: [{ type: String }],
    allergens: [{ type: String }],
    variants: [VariantSchema],
    addons: [AddonSchema],
    available: { type: Boolean, default: true, index: true },
    inStock: { type: Boolean, default: true, index: true },
    inventoryCount: { type: Number, default: 100, min: 0 },
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

// Compound indexes for performant restaurant menu browsing, filtering, and sorting
MenuItemSchema.index({ restaurantId: 1, isArchived: 1, available: 1 });
MenuItemSchema.index({ restaurantId: 1, categorySlug: 1, price: 1 });
MenuItemSchema.index({ restaurantId: 1, name: "text", description: "text" });

export const MenuItem: Model<IMenuItem> =
  mongoose.models.MenuItem || mongoose.model<IMenuItem>("MenuItem", MenuItemSchema);

