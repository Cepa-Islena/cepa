"use client";

import { useCallback, useMemo, useState } from "react";
import { products, type Product, type ProductKind } from "@/lib/catalog";
import { productMatchesSearch, quizRecommendation, remaining, type QuizAnswers } from "@/lib/commerce";

const defaultQuizAnswers: QuizAnswers = {
  vibe: "refresh",
  flavor: "tropical",
  nutrient: "immune",
};

const defaultSelectedProduct = products.find((product) => product.slug === "mvp-sample-bundle") ?? products[0]!;
const currentDropRemaining = products.reduce((sum, product) => sum + remaining(product), 0);

export function useStorefrontCatalog() {
  const [activeKind, setActiveKind] = useState<ProductKind | "all">("all");
  const [selectedProduct, setSelectedProduct] = useState<Product>(defaultSelectedProduct);
  const [searchQuery, setSearchQuery] = useState("");
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswers>(defaultQuizAnswers);

  const visibleProducts = useMemo(() => {
    const byKind = activeKind === "all" ? products : products.filter((product) => product.kind === activeKind);
    return byKind.filter((product) => productMatchesSearch(product, searchQuery));
  }, [activeKind, searchQuery]);

  const recommended = quizRecommendation(quizAnswers);

  const selectProduct = useCallback((productSlug: string) => {
    const product = products.find((candidate) => candidate.slug === productSlug);
    if (!product) return;

    setSelectedProduct(product);
    setSearchQuery("");
    document.querySelector("#la-cepa")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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
