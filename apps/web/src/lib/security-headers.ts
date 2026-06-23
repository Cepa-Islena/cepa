export type SecurityHeader = {
  key: string;
  value: string;
};

type CspDirective = readonly [name: string, sources?: readonly string[]];

const stripeScriptSources = ["https://js.stripe.com"] as const;
const stripeFrameSources = ["https://js.stripe.com", "https://hooks.stripe.com"] as const;
const supabaseConnectSources = ["https://*.supabase.co"] as const;

function formatDirective([name, sources]: CspDirective) {
  return sources?.length ? `${name} ${sources.join(" ")}` : name;
}

export function buildContentSecurityPolicy(isDevelopment: boolean) {
  const scriptSources = [
    "'self'",
    "'unsafe-inline'",
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
    ...stripeScriptSources,
  ];

  const directives: CspDirective[] = [
    ["default-src", ["'self'"]],
    ["script-src", scriptSources],
    ["script-src-elem", ["'self'", "'unsafe-inline'", ...stripeScriptSources]],
    ["script-src-attr", ["'self'"]],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:"]],
    ["font-src", ["'self'"]],
    ["connect-src", ["'self'", ...supabaseConnectSources, "https://api.stripe.com"]],
    ["frame-src", stripeFrameSources],
    ["child-src", stripeFrameSources],
    ["media-src", ["'self'"]],
    ["manifest-src", ["'self'"]],
    ["worker-src", ["'self'", "blob:"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'", "https://checkout.stripe.com"]],
    ["frame-ancestors", ["'none'"]],
    ["object-src", ["'none'"]],
    ["upgrade-insecure-requests"],
  ];

  return directives.map(formatDirective).join("; ");
}

export function securityHeaders(isDevelopment: boolean): SecurityHeader[] {
  return [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(isDevelopment),
    },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  ];
}
