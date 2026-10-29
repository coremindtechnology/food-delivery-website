import { z } from "zod";

export const CreateRestaurantSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  slug: z.enum(["veg", "non-veg"]),
  type: z.enum(["veg", "non-veg"]),
  subtitle: z.string().min(3).max(200),
  description: z.string().min(10).max(1000),
  heroImage: z.string().url("Must be a valid image URL"),
  fssaiLicenseNumber: z.string().regex(/^\d{14}$/, "FSSAI license must be 14 numeric digits"),
  contactPhone: z.string().min(10).max(15),
  contactEmail: z.string().email(),
  address: z.object({
    street: z.string().min(3),
    city: z.string().min(2),
    state: z.string().min(2),
    pincode: z.string().min(4).max(10),
  }),
  openingHours: z.string().default("10:00 AM - 11:30 PM"),
  deliveryTime: z.string().default("25-35 min"),
  minOrderAmount: z.number().min(0).default(199),
  priceRange: z.string().default("₹₹"),
  accentColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Valid hex color required"),
  bannerText: z.string().optional(),
  features: z.array(z.string()).default([]),
  isOpen: z.boolean().default(true),
});

export const UpdateRestaurantSchema = CreateRestaurantSchema.partial();

export type CreateRestaurantInput = z.infer<typeof CreateRestaurantSchema>;
export type UpdateRestaurantInput = z.infer<typeof UpdateRestaurantSchema>;

