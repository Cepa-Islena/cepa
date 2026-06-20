import { NextResponse } from "next/server";
import { contactRequestSchema } from "@/lib/schemas";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = contactRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid contact message." }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({ error: "Contact form is paused until Supabase is configured." }, { status: 503 });
  }

  const { error } = await supabase.from("contact_messages").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    topic: parsed.data.topic,
    message: parsed.data.message,
  });

  if (error) {
    return NextResponse.json({ error: "Could not save contact message." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
