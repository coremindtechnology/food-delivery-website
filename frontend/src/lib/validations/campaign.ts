import { z } from "zod";
import { ObjectIdSchema } from "@/lib/validations/common";

export const codeSchema = z
  .string()
  .trim()
  .min(3)
  .max(20)
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9_-]*$/, "Use only letters, numbers, hyphens, and underscores in coupon codes.");

export const CampaignFieldsSchema = z
  .object({
    campaignType: z.enum(["offer", "coupon"]),
    title: z.string().trim().min(2).max(100),
    code: codeSchema.optional(),
    description: z.string().trim().max(300).optional(),
    restaurantId: ObjectIdSchema.nullable(),
    discountType: z.enum(["percentage", "flat"]),
    discountValue: z.number().positive(),
    minOrderAmount: z.number().min(0).default(0),
    maxDiscountAmount: z.number().positive().optional(),
    usageLimit: z.number().int().positive().optional(),
    validFrom: z.string().min(1).refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid start date."),
    validUntil: z.string().min(1).refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid expiry date."),
    isActive: z.boolean().default(true),
  })
  .superRefine((campaign, context) => {
    if (campaign.campaignType === "coupon" && !campaign.code) {
      context.addIssue({ code: "custom", path: ["code"], message: "Coupon code is required." });
    }
    if (campaign.discountType === "percentage" && campaign.discountValue > 100) {
      context.addIssue({ code: "custom", path: ["discountValue"], message: "Percentage discount cannot exceed 100%." });
    }
    if (Date.parse(campaign.validUntil) <= Date.parse(campaign.validFrom)) {
      context.addIssue({ code: "custom", path: ["validUntil"], message: "Expiry date must be after the start date." });
    }
  });
