import { z } from "zod";
import { orderStatusSchema } from "@/lib/schemas";

export const contactStatusSchema = z.enum(["new", "read", "archived"]);

export const orderStatusUpdateSchema = z.object({
  orderId: z.uuid(),
  status: orderStatusSchema,
});

export const contactStatusUpdateSchema = z.object({
  messageId: z.uuid(),
  status: contactStatusSchema,
});

export const productStatusUpdateSchema = z.object({
  productSlug: z.string().trim().min(1).max(80),
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export function parseOrderStatusUpdate(formData: FormData) {
  return orderStatusUpdateSchema.parse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
  });
}

export function parseContactStatusUpdate(formData: FormData) {
  return contactStatusUpdateSchema.parse({
    messageId: formData.get("messageId"),
    status: formData.get("status"),
  });
}

export function parseProductStatusUpdate(formData: FormData) {
  return productStatusUpdateSchema.parse({
    productSlug: formData.get("productSlug"),
    active: formData.get("active"),
  });
}
