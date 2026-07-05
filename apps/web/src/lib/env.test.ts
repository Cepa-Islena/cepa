import { afterEach, describe, expect, it } from "vitest";
import { getConfiguredSiteOrigin, getRequestOrigin } from "./env";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (originalSiteUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  }
});

describe("site origin configuration", () => {
  it("uses the configured site origin for payment provider redirects", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://cepaislena.com/storefront?preview=true";

    await expect(getRequestOrigin()).resolves.toBe("https://cepaislena.com");
  });

  it("falls back to localhost only when no site URL is configured", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;

    expect(getConfiguredSiteOrigin()).toBe("http://localhost:3000");
  });

  it("rejects invalid site URLs instead of deriving origins from request headers", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "javascript:alert(1)";

    await expect(getRequestOrigin()).rejects.toThrow("NEXT_PUBLIC_SITE_URL must be a valid absolute http or https URL.");
  });
});
