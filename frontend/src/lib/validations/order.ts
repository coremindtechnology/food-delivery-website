import { z } from "zod";
import { ObjectIdSchema } from "./common";
import { CustomerAddressSchema } from "./auth";

export const OrderItemInputSchema = z.object({
  menuItemId: ObjectIdSchema,
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(50),
  variantId: z.string().trim().optional(),
  addonIds: z.array(z.string().trim()).default([]),
  specialInstructions: z.string().trim().max(200).optional(),
});

export const CreateOrderSchema = z.object({
  restaurantId: ObjectIdSchema,
  restaurantSlug: z.enum(["veg", "non-veg"]),
  fulfillmentType: z.enum(["delivery", "takeaway"]).default("delivery"),
  customerName: z.string().trim().min(2, "Customer name is required").max(60),
  customerPhone: z
    .string()
    .trim()
    .transform((val) => val.replace(/[\s-]/g, ""))
    .refine((val) => /^(\+91)?[6-9]\d{9}$/.test(val), "Valid 10-digit mobile number required")
    .transform((val) => (val.startsWith("+91") ? val.slice(3) : val)),
  customerEmail: z.string().trim().email().optional().or(z.literal("")),
  deliveryAddress: CustomerAddressSchema.omit({ isDefault: true }).optional(),
  deliveryNotes: z.string().trim().max(300).optional(),
  couponCode: z.string().trim().max(20).toUpperCase().optional(),
  paymentMethod: z.enum(["razorpay", "cod"]).default("cod"),
  items: z.array(OrderItemInputSchema).min(1, "Order must contain at least one item"),
  idempotencyKey: z.string().trim().max(100).optional(),
});

export type OrderItemInput = z.infer<typeof OrderItemInputSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

