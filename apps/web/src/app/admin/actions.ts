"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { parseContactStatusUpdate, parseOrderStatusUpdate, parseProductStatusUpdate } from "@/lib/admin-mutations";
import { createBrowserAwareSupabaseClient, createSupabaseServiceClient } from "@/lib/supabase/server";

const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export async function signInAdmin(_previousState: string | null, formData: FormData) {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return "Enter a valid email and password.";

  const supabase = await createBrowserAwareSupabaseClient();
  if (!supabase) return "Supabase Auth is not configured.";

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return error.message;

  redirect("/admin");
}

export async function signOutAdmin() {
  const supabase = await createBrowserAwareSupabaseClient();
  await supabase?.auth.signOut();
  redirect("/");
}

export async function updateOrderStatus(formData: FormData) {
  await requireAdmin();
  const service = createSupabaseServiceClient();
  if (!service) throw new Error("Supabase service client is not configured.");

  const { orderId, status } = parseOrderStatusUpdate(formData);
  const { error } = await service.rpc("admin_set_order_status", {
    target_order_id: orderId,
    new_status: status,
  });

  if (error) throw new Error(`Could not update order: ${error.message}`);
  revalidatePath("/admin");
}

export async function updateContactStatus(formData: FormData) {
  await requireAdmin();
  const service = createSupabaseServiceClient();
  if (!service) throw new Error("Supabase service client is not configured.");

  const { messageId, status } = parseContactStatusUpdate(formData);
  const { error } = await service.from("contact_messages").update({ status }).eq("id", messageId).select("id").single();

  if (error) throw new Error(`Could not update contact message: ${error.message}`);
  revalidatePath("/admin");
}

export async function updateProductStatus(formData: FormData) {
  await requireAdmin();
  const service = createSupabaseServiceClient();
  if (!service) throw new Error("Supabase service client is not configured.");

  const { productSlug, active } = parseProductStatusUpdate(formData);
  const { error } = await service
    .from("products")
    .update({ active })
    .eq("slug", productSlug)
    .select("id")
    .single();

  if (error) throw new Error(`Could not update product: ${error.message}`);
  revalidatePath("/admin");
}
