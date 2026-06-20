import { z } from "zod";

export const checkoutItemSchema = z.object({
  productSlug: z.string().min(1).max(80),
  quantity: z.number().int().min(1).max(24),
});

export const checkoutRequestSchema = z.object({
  cartItems: z.array(checkoutItemSchema).min(1).max(20),
  deliveryPueblo: z.string().min(1).max(80),
  customerEmail: z.email().optional().or(z.literal("")),
});

export const contactRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(240),
  topic: z.enum(["events", "outside-metro", "general"]),
  message: z.string().trim().min(1).max(2000),
});

export const orderStatusSchema = z.enum(["reserved", "checkout_created", "paid", "cancelled", "expired", "failed", "fulfilled"]);

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
export type ContactRequest = z.infer<typeof contactRequestSchema>;
