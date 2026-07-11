import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getConfiguredSiteOrigin: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getConfiguredSiteOrigin: mocks.getConfiguredSiteOrigin,
}));

import { assertSameOrigin, getForwardedIp } from "@/lib/request-guards";

describe("request guards", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("prefers Cloudflare connecting IP", () => {
    const request = new Request("https://cepaislena.com/api/contact", {
      headers: {
        "cf-connecting-ip": "1.2.3.4",
        "x-forwarded-for": "9.9.9.9",
      },
    });

    expect(getForwardedIp(request)).toBe("1.2.3.4");
  });

  it("accepts matching browser origins", () => {
    mocks.getConfiguredSiteOrigin.mockReturnValue("https://cepaislena.com");
    const request = new Request("https://cepaislena.com/api/checkout", {
      headers: { origin: "https://cepaislena.com" },
    });

    expect(assertSameOrigin(request)).toBe("https://cepaislena.com");
  });

  it("rejects cross-origin browser posts", () => {
    mocks.getConfiguredSiteOrigin.mockReturnValue("https://cepaislena.com");
    const request = new Request("https://cepaislena.com/api/checkout", {
      headers: { origin: "https://evil.example" },
    });

    expect(() => assertSameOrigin(request)).toThrow(/Cross-origin/);
  });
});
