import { redirect } from "next/navigation";
import { createBrowserAwareSupabaseClient, createSupabaseServiceClient } from "@/lib/supabase/server";

export type AdminUser = {
  id: string;
  email?: string;
  role: "admin" | "owner";
};

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const supabase = await createBrowserAwareSupabaseClient();
  const service = createSupabaseServiceClient();
  if (!supabase || !service) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await service
    .from("admin_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data?.role) return null;

  return {
    id: user.id,
    email: user.email ?? undefined,
    role: data.role as "admin" | "owner",
  };
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
