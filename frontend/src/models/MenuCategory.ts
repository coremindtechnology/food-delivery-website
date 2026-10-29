import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISubcategory {
  _id?: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
}

export interface IMenuCategory extends Document {
  restaurantId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  iconName?: string;
  image?: string;
  sortOrder: number;
  subcategories: ISubcategory[];
  isActive: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubcategorySchema = new Schema<ISubcategory>({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
});

const MenuCategorySchema = new Schema<IMenuCategory>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    iconName: { type: String, default: "Utensils" },
    image: { type: String },
    sortOrder: { type: Number, default: 0 },
    subcategories: [SubcategorySchema],
    isActive: { type: Boolean, default: true, index: true },
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

// Compound index to ensure uniqueness of category slug per restaurant
MenuCategorySchema.index({ restaurantId: 1, slug: 1 }, { unique: true });
MenuCategorySchema.index({ restaurantId: 1, isArchived: 1, sortOrder: 1 });

export const MenuCategory: Model<IMenuCategory> =
  mongoose.models.MenuCategory ||
  mongoose.model<IMenuCategory>("MenuCategory", MenuCategorySchema);

