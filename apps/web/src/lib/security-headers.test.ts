import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, securityHeaders } from "@/lib/security-headers";

function directiveSources(policy: string, directive: string) {
  const match = policy
    .split("; ")
    .find((entry) => entry === directive || entry.startsWith(`${directive} `));

  return match?.slice(directive.length).trim().split(/\s+/).filter(Boolean) ?? [];
}

describe("security headers", () => {
  it("keeps ad and tracker resources blocked by default", () => {
    const policy = buildContentSecurityPolicy(false);

    expect(directiveSources(policy, "default-src")).toEqual(["'self'"]);
    expect(directiveSources(policy, "script-src")).toEqual(["'self'", "'unsafe-inline'", "https://js.stripe.com"]);
    expect(directiveSources(policy, "img-src")).toEqual(["'self'", "data:", "blob:"]);
    expect(directiveSources(policy, "frame-src")).toEqual(["https://js.stripe.com", "https://hooks.stripe.com"]);
    expect(directiveSources(policy, "connect-src")).toEqual([
      "'self'",
      "https://*.supabase.co",
      "https://api.stripe.com",
    ]);

    expect(policy).not.toMatch(/googlead|doubleclick|adsbygoogle|googletagmanager|facebook|tiktok|taboola|outbrain/i);
    expect(directiveSources(policy, "script-src")).not.toContain("https:");
    expect(directiveSources(policy, "img-src")).not.toContain("https:");
    expect(directiveSources(policy, "frame-src")).not.toContain("https:");
  });

  it("does not allow production eval but keeps dev builds usable", () => {
    expect(directiveSources(buildContentSecurityPolicy(false), "script-src")).not.toContain("'unsafe-eval'");
    expect(directiveSources(buildContentSecurityPolicy(true), "script-src")).toContain("'unsafe-eval'");
  });

  it("applies the policy as a site-wide response header", () => {
    expect(securityHeaders(false)).toContainEqual({
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(false),
    });
  });
});
