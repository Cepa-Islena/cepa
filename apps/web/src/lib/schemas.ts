import { z } from "zod";

export const checkoutItemSchema = z.object({
  productSlug: z.string().min(1).max(80),
  quantity: z.number().int().min(1).max(24),
  note: z.string().trim().max(280).optional(),
});

export const checkoutRequestSchema = z.object({
  cartItems: z.array(checkoutItemSchema).min(1).max(20),
  deliveryPueblo: z.string().trim().min(1, "Delivery pueblo is required").max(80),
  customerEmail: z
    .string()
    .trim()
    .min(1, "Email is required for order updates and receipts")
    .refine((value) => z.email().safeParse(value).success, {
      message: "Enter a valid email",
    }),
  customerName: z.string().trim().min(1).max(120),
  customerPhone: z.string().trim().min(7).max(40),
  deliveryAddress: z.string().trim().min(5).max(240),
  deliveryNotes: z.string().trim().max(500).optional().or(z.literal("")),
  giftNote: z.string().trim().max(280).optional().or(z.literal("")),
});

export const contactRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(240),
  topic: z.enum(["events", "outside-metro", "general"]),
  message: z.string().trim().min(1).max(2000),
});

export const orderStatusSchema = z.enum([
  "reserved",
  "checkout_created",
  "paid",
  "cancelled",
  "expired",
  "failed",
  "fulfilled",
]);

export const adminEditableOrderStatusSchema = z.enum(["cancelled", "failed", "fulfilled", "expired"]);

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
export type ContactRequest = z.infer<typeof contactRequestSchema>;
