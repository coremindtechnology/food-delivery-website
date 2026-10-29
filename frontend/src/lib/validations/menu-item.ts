import { z } from "zod";
import { ObjectIdSchema } from "./common";

export const VariantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  portionDescription: z.string().optional(),
  price: z.number().min(0),
  isDefault: z.boolean().default(false),
});

export const AddonSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().min(0),
});

export const CreateMenuItemSchema = z.object({
  restaurantId: ObjectIdSchema,
  categoryId: ObjectIdSchema,
  categorySlug: z.string().min(2),
  subcategorySlug: z.string().optional(),
  name: z.string().min(2, "Dish name must be at least 2 characters").max(100),
  slug: z.string().min(2).max(100),
  description: z.string().min(5).max(600),
  price: z.number().min(0, "Price must be positive"),
  originalPrice: z.number().min(0).optional(),
  image: z.string().url("Valid image URL required"),
  isVeg: z.boolean(),
  isPopular: z.boolean().default(false),
  isChefSpecial: z.boolean().default(false),
  spicyLevel: z.number().int().min(0).max(3).default(1),
  preparationTime: z.string().default("20-25 min"),
  calories: z.number().int().min(0).optional(),
  serves: z.string().optional(),
  tags: z.array(z.string()).default([]),
  ingredients: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
  variants: z.array(VariantSchema).default([]),
  addons: z.array(AddonSchema).default([]),
  available: z.boolean().default(true),
  inStock: z.boolean().default(true),
  inventoryCount: z.number().int().min(0).default(100),
});

export const UpdateMenuItemSchema = CreateMenuItemSchema.omit({
  restaurantId: true,
}).partial();

export type CreateMenuItemInput = z.infer<typeof CreateMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof UpdateMenuItemSchema>;

