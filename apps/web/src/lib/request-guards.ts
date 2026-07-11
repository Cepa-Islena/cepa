import { getConfiguredSiteOrigin } from "@/lib/env";

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

export function getForwardedIp(request: Request) {
  const cfConnectingIp = firstHeaderValue(request.headers.get("cf-connecting-ip"));
  const realIp = firstHeaderValue(request.headers.get("x-real-ip"));
  const forwardedFor = firstHeaderValue(request.headers.get("x-forwarded-for"));
  const forwarded = request.headers.get("forwarded")?.match(/for="?([^;,"]+)/i)?.[1]?.trim() ?? null;

  return cfConnectingIp ?? realIp ?? forwardedFor ?? forwarded ?? "unknown-ip";
}

function originFromHeader(value: string | null) {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Same-origin guard for browser-facing POST endpoints.
 * Allows missing Origin/Referer in non-production so local tools and tests still work.
 */
export function assertSameOrigin(request: Request) {
  let expectedOrigin: string;

  try {
    expectedOrigin = getConfiguredSiteOrigin();
  } catch {
    throw new Error("Site origin is not configured.");
  }

  const requestOrigin =
    originFromHeader(request.headers.get("origin")) ?? originFromHeader(request.headers.get("referer"));

  if (!requestOrigin) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing browser origin.");
    }
    return expectedOrigin;
  }

  if (requestOrigin !== expectedOrigin) {
    throw new Error("Cross-origin request blocked.");
  }

  return expectedOrigin;
}
