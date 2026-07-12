import {
  type CartItem,
  type Product,
  catalog,
  findProduct,
  metroPueblos,
  products,
} from "@/lib/catalog";

export type CartLine = CartItem & {
  product: NonNullable<ReturnType<typeof findProduct>>;
};

export type QuizAnswers = {
  vibe: "refresh" | "cool" | "try-all";
  flavor: "tropical" | "citrus" | "earthy";
  nutrient: "daily-reset" | "hydration" | "energy";
};

export function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function remaining(product: { capacity: number; sold: number }) {
  return Math.max(product.capacity - product.sold, 0);
}

export function cartProducts(cart: CartItem[]) {
  return cart
    .map((item) => {
      const product = findProduct(item.productSlug);
      return product ? { ...item, product } : null;
    })
    .filter((item): item is CartLine => Boolean(item));
}

export function cartCount(cart: CartItem[]) {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

export function cartTotalCents(cart: CartItem[]) {
  return cartProducts(cart).reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0);
}

export function bottleCount(cart: CartItem[]) {
  return cartProducts(cart).reduce((sum, item) => {
    if (item.product.kind === "addon") return sum;
    if (item.product.kind === "bundle") return sum + item.quantity * Math.max(item.product.components.length, 1);
    return sum + item.quantity;
  }, 0);
}

export function estimatedProduceLb(cart: CartItem[]) {
  return Math.round(bottleCount(cart) * 1.35);
}

export function normalizeTownName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isMetroTown(value: string) {
  const normalized = normalizeTownName(value);
  if (!normalized) return false;

  const aliases: Record<string, string> = {
    sj: "san juan",
    "s juan": "san juan",
    "san juan pr": "san juan",
    "rio piedras": "san juan",
    "hato rey": "san juan",
    "condado": "san juan",
    "santurce": "san juan",
    "isla verde": "carolina",
    bayamon: "bayamon",
    "bayamon pr": "bayamon",
    catano: "catano",
    "trujillo alto": "trujillo alto",
  };

  const candidate = aliases[normalized] ?? normalized;

  return metroPueblos.some((town) => {
    const metroName = normalizeTownName(town);
    if (candidate === metroName) return true;
    // Allow short progressive typing once a few letters are in
    if (candidate.length >= 4 && (metroName.startsWith(candidate) || candidate.startsWith(metroName))) {
      return true;
    }
    return false;
  });
}

export function productMatchesSearch(product: (typeof catalog)[number], searchQuery: string) {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return true;

  return [
    product.name,
    product.kind,
    product.size,
    product.short,
    product.description,
    product.taste,
    ...product.tags,
    ...product.nutrients,
    ...product.ingredients,
    ...product.allergens,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query);
}

export function quizRecommendation(answers: QuizAnswers): Product {
  const fallback = products[0]!;

  if (answers.vibe === "try-all") return products.find((product) => product.slug === "mvp-sample-bundle") ?? fallback;
  if (answers.flavor === "earthy") return products.find((product) => product.slug === "tamarindo-root") ?? fallback;
  if (answers.nutrient === "daily-reset") return products.find((product) => product.slug === "jengibre-shot") ?? fallback;
  if (answers.flavor === "citrus") return products.find((product) => product.slug === "acerola-glow") ?? fallback;
  if (answers.vibe === "cool") return products.find((product) => product.slug === "pina-menta") ?? fallback;
  return products.find((product) => product.slug === "parcha-verde") ?? fallback;
}

export function recipeCapacityUse(cart: CartItem[]) {
  return cartProducts(cart).reduce<Record<string, number>>((acc, item) => {
    for (const component of item.product.components) {
      acc[component.recipeSlug] = (acc[component.recipeSlug] ?? 0) + component.ounces * item.quantity;
    }
    return acc;
  }, {});
}

export function validateStaticCapacity(cart: CartItem[]) {
  const used = recipeCapacityUse(cart);
  const availableByRecipe = products.reduce<Record<string, number>>((acc, product) => {
    for (const component of product.components) {
      if (component.recipeSlug === product.slug) {
        acc[component.recipeSlug] = remaining(product) * component.ounces;
      }
    }
    return acc;
  }, {});

  return Object.entries(used).every(([recipeSlug, ounces]) => ounces <= (availableByRecipe[recipeSlug] ?? 0));
}

export function checkoutLineItems(cart: CartItem[]) {
  return cartProducts(cart).map((item) => ({
    productSlug: item.product.slug,
    name: item.product.name,
    description: item.product.size,
    image: item.product.image,
    quantity: item.quantity,
    unitAmountCents: item.product.priceCents,
  }));
}

export function extractGiftNote(cart: CartItem[]) {
  const noteItem = cart.find((item) => item.productSlug === "delivery-note" && item.note?.trim());
  return noteItem?.note?.trim() ?? "";
}
