import { describe, expect, it } from "vitest";
import {
  bottleCount,
  cartTotalCents,
  estimatedProduceLb,
  formatPrice,
  isMetroTown,
  quizRecommendation,
  recipeCapacityUse,
  validateStaticCapacity,
} from "@/lib/commerce";

describe("commerce helpers", () => {
  it("calculates cart totals in cents", () => {
    expect(
      cartTotalCents([
        { productSlug: "parcha-verde", quantity: 2 },
        { productSlug: "jengibre-shot", quantity: 1 },
      ]),
    ).toBe(2200);
    expect(formatPrice(2200)).toBe("$22");
  });

  it("counts bundle bottles as one item per included flavor", () => {
    const cart = [{ productSlug: "mvp-sample-bundle", quantity: 2 }];
    expect(bottleCount(cart)).toBe(10);
    expect(estimatedProduceLb(cart)).toBe(14);
  });

  it("tracks recipe ounces for bundles and direct products", () => {
    expect(
      recipeCapacityUse([
        { productSlug: "mvp-sample-bundle", quantity: 1 },
        { productSlug: "parcha-verde", quantity: 1 },
      ]),
    ).toMatchObject({
      "parcha-verde": 20,
      "acerola-glow": 4,
      "pina-menta": 4,
      "tamarindo-root": 4,
      "jengibre-shot": 2,
    });
  });

  it("recognizes only first-route metro pueblos", () => {
    expect(isMetroTown("San Juan")).toBe(true);
    expect(isMetroTown(" carolina ")).toBe(true);
    expect(isMetroTown("Bayamón")).toBe(true);
    expect(isMetroTown("Ponce")).toBe(false);
    expect(isMetroTown("")).toBe(false);
    expect(isMetroTown("sj")).toBe(true);
  });

  it("recommends products from quiz answers", () => {
    expect(
      quizRecommendation({
        vibe: "try-all",
        flavor: "tropical",
        nutrient: "daily-reset",
      }).slug,
    ).toBe("mvp-sample-bundle");
    expect(
      quizRecommendation({
        vibe: "refresh",
        flavor: "earthy",
        nutrient: "hydration",
      }).slug,
    ).toBe("tamarindo-root");
    expect(
      quizRecommendation({
        vibe: "refresh",
        flavor: "tropical",
        nutrient: "daily-reset",
      }).slug,
    ).toBe("jengibre-shot");
  });

  it("rejects static carts beyond displayed capacity", () => {
    expect(validateStaticCapacity([{ productSlug: "jengibre-shot", quantity: 1 }])).toBe(true);
    expect(validateStaticCapacity([{ productSlug: "jengibre-shot", quantity: 999 }])).toBe(false);
  });
});
