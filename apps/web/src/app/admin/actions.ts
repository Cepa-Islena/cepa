"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { orderStatusSchema } from "@/lib/schemas";
import { requireAdmin } from "@/lib/admin";
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

  const orderId = String(formData.get("orderId") ?? "");
  const status = orderStatusSchema.parse(formData.get("status"));

  await service.from("orders").update({ status }).eq("id", orderId);
  revalidatePath("/admin");
}

export async function updateContactStatus(formData: FormData) {
  await requireAdmin();
  const service = createSupabaseServiceClient();
  if (!service) throw new Error("Supabase service client is not configured.");

  const messageId = String(formData.get("messageId") ?? "");
  const status = z.enum(["new", "read", "archived"]).parse(formData.get("status"));

  await service.from("contact_messages").update({ status }).eq("id", messageId);
  revalidatePath("/admin");
}
