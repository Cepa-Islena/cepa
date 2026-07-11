import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { contactRequestSchema } from "@/lib/schemas";
import { assertSameOrigin, getForwardedIp } from "@/lib/request-guards";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const CONTACT_RATE_LIMIT_ERROR = "Too many contact messages. Please wait and try again.";

function getContactRateLimitKey(request: Request) {
  const ip = getForwardedIp(request);
  const userAgent = request.headers.get("user-agent")?.slice(0, 256) ?? "unknown-agent";
  const digest = createHash("sha256").update(`${ip}|${userAgent}`).digest("hex");

  return `contact:${digest}`;
}

function isContactRateLimitError(error: { message?: string } | null) {
  return error?.message?.includes(CONTACT_RATE_LIMIT_ERROR) ?? false;
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request origin." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = contactRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid contact message." }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({ error: "Contact form is paused until Supabase is configured." }, { status: 503 });
  }

  const { error: rateLimitError } = await supabase.rpc("register_contact_attempt", {
    rate_limit_key: getContactRateLimitKey(request),
  });

  if (rateLimitError) {
    // If migration not applied yet, fail closed only on explicit rate-limit hits;
    // other RPC errors still block to avoid silent spam when abuse protection is broken.
    const status = isContactRateLimitError(rateLimitError) ? 429 : 503;
    const message =
      status === 429 ? CONTACT_RATE_LIMIT_ERROR : "Contact abuse protection is unavailable. Try again later.";

    return NextResponse.json({ error: message }, { status });
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
