import { z } from "zod";
import { ObjectIdSchema } from "./common";

export const SubcategorySchema = z.object({
  name: z.string().min(2).max(50),
  slug: z.string().min(2).max(50),
  description: z.string().max(200).optional(),
  isActive: z.boolean().default(true),
});

export const CreateCategorySchema = z.object({
  restaurantId: ObjectIdSchema,
  name: z.string().min(2, "Category name must be at least 2 characters").max(60),
  slug: z.string().min(2).max(60),
  description: z.string().max(300).optional(),
  iconName: z.string().default("Utensils"),
  image: z.string().url().optional(),
  sortOrder: z.number().int().default(0),
  subcategories: z.array(SubcategorySchema).default([]),
  isActive: z.boolean().default(true),
});

export const UpdateCategorySchema = CreateCategorySchema.omit({ restaurantId: true }).partial();

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;

