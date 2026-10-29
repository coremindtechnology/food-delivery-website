import { z } from "zod";

export const PhoneSchema = z
  .string()
  .trim()
  .transform((val) => val.replace(/[\s-]/g, ""))
  .refine(
    (val) => /^(\+91)?[6-9]\d{9}$/.test(val),
    "Please enter a valid 10-digit mobile number"
  )
  .transform((val) => {
    // Normalise to 10 digits
    return val.startsWith("+91") ? val.slice(3) : val;
  });

export const SendOtpSchema = z.object({
  phone: PhoneSchema,
});

export const VerifyOtpSchema = z.object({
  phone: PhoneSchema,
  otp: z.string().trim().regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
  name: z.string().trim().min(2).max(60).optional(),
});

export const UpdateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60).optional(),
  email: z.string().trim().email("Invalid email address").optional().or(z.literal("")),
});

export const CustomerAddressSchema = z.object({
  label: z.enum(["Home", "Work", "Other"]).default("Home"),
  street: z.string().trim().min(5, "Street address must be at least 5 characters").max(200),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100).default("State"),
  pincode: z.string().trim().regex(/^\d{6}$/, "Pincode must be a 6-digit postal code"),
  landmark: z.string().trim().max(150).optional(),
  isDefault: z.boolean().default(false),
});

export type SendOtpInput = z.infer<typeof SendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type CustomerAddressInput = z.infer<typeof CustomerAddressSchema>;

