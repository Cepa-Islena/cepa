"use client";

import { useCallback, useMemo, useState } from "react";
import { products as staticProducts, type Product, type ProductKind } from "@/lib/catalog";
import { productMatchesSearch, quizRecommendation, remaining, type QuizAnswers } from "@/lib/commerce";

const defaultQuizAnswers: QuizAnswers = {
  vibe: "refresh",
  flavor: "tropical",
  nutrient: "daily-reset",
};

export function useStorefrontCatalog(catalogProducts: Product[] = staticProducts) {
  const defaultSelectedProduct =
    catalogProducts.find((product) => product.slug === "mvp-sample-bundle") ?? catalogProducts[0] ?? staticProducts[0]!;

  const [activeKind, setActiveKind] = useState<ProductKind | "all">("all");
  const [selectedProduct, setSelectedProduct] = useState<Product>(defaultSelectedProduct);
  const [searchQuery, setSearchQuery] = useState("");
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswers>(defaultQuizAnswers);

  const sellableProducts = useMemo(
    () => catalogProducts.filter((product) => product.kind !== "addon"),
    [catalogProducts],
  );

  const visibleProducts = useMemo(() => {
    const byKind = activeKind === "all" ? sellableProducts : sellableProducts.filter((product) => product.kind === activeKind);
    return byKind.filter((product) => productMatchesSearch(product, searchQuery));
  }, [activeKind, searchQuery, sellableProducts]);

  const recommended = quizRecommendation(quizAnswers);
  const currentDropRemaining = sellableProducts.reduce((sum, product) => sum + remaining(product), 0);

  const selectProduct = useCallback(
    (productSlug: string) => {
      const product = catalogProducts.find((candidate) => candidate.slug === productSlug);
      if (!product) return;

      setSelectedProduct(product);
      setSearchQuery("");
      document.querySelector("#la-cepa")?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [catalogProducts],
  );

  return {
    activeKind,
    setActiveKind,
    selectedProduct,
    searchQuery,
    setSearchQuery,
    quizAnswers,
    setQuizAnswers,
    visibleProducts,
    recommended,
    currentDropRemaining,
    selectProduct,
  };
}
