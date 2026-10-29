import { z } from "zod";

export const ObjectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid 24-character hex ObjectId");

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  sortBy: z.string().trim().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  restaurantId: ObjectIdSchema.optional(),
  restaurantSlug: z.enum(["veg", "non-veg"]).optional(),
  includeArchived: z.coerce.boolean().default(false),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

