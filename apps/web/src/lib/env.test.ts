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

  it("falls back to production domain when no site URL is configured", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;

    expect(getConfiguredSiteOrigin()).toBe("https://cepaislena.com");
  });

  it("ignores invalid site URLs and falls back safely", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "javascript:alert(1)";

    await expect(getRequestOrigin()).resolves.toBe("https://cepaislena.com");
  });
});
