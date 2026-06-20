export type ProductKind = "juice" | "shot" | "bundle" | "addon";

export type ProductComponent = {
  recipeSlug: string;
  recipeName: string;
  ounces: number;
};

export type Product = {
  slug: string;
  name: string;
  kind: ProductKind;
  size: string;
  priceCents: number;
  image: string;
  color: string;
  short: string;
  description: string;
  tags: string[];
  nutrients: string[];
  taste?: string;
  testimonial?: string;
  capacity: number;
  sold: number;
  components: ProductComponent[];
};

export type CartItem = {
  productSlug: string;
  quantity: number;
};

export const products: Product[] = [
  {
    slug: "parcha-verde",
    name: "Parcha Verde",
    kind: "juice",
    size: "16 oz bottle",
    priceCents: 900,
    image: "/brand/product-parcha.png",
    color: "#CACD3A",
    short: "Bright parcha, greens, and a little island sun.",
    description: "A made-to-order green juice with parcha energy and a clean finish.",
    tags: ["cold pressed", "100% natural", "100 bottles"],
    nutrients: ["greens", "hydration", "vitamin C"],
    taste: "tropical, bright, lightly tart",
    testimonial: "This one tastes like a morning walk in Santurce.",
    capacity: 100,
    sold: 28,
    components: [{ recipeSlug: "parcha-verde", recipeName: "Parcha Verde", ounces: 16 }],
  },
  {
    slug: "acerola-glow",
    name: "Acerola Glow",
    kind: "juice",
    size: "16 oz bottle",
    priceCents: 900,
    image: "/brand/product-acerola.png",
    color: "#FFBBD7",
    short: "Acerola, citrus, and that fresh morning kick.",
    description: "Tart, juicy, and made for the days that need a little glow.",
    tags: ["vitamin C", "sin azúcar añadida", "100 bottles"],
    nutrients: ["vitamin C", "antioxidants", "glow"],
    taste: "tart, citrusy, juicy",
    testimonial: "Acerola Glow is my weekly reset. Acidito and fresh.",
    capacity: 100,
    sold: 43,
    components: [{ recipeSlug: "acerola-glow", recipeName: "Acerola Glow", ounces: 16 }],
  },
  {
    slug: "pina-menta",
    name: "Pina Menta",
    kind: "juice",
    size: "16 oz bottle",
    priceCents: 900,
    image: "/brand/product-pina.png",
    color: "#9BB9FF",
    short: "Pina, mint, and a beach-day kind of fresh.",
    description: "A cooling juice for hot days, made fresh by drop.",
    tags: ["refreshing", "shake well", "100 bottles"],
    nutrients: ["refresh", "digestion", "cooling"],
    taste: "sweet, minty, cooling",
    testimonial: "The one I want after the beach. Super fresh.",
    capacity: 100,
    sold: 18,
    components: [{ recipeSlug: "pina-menta", recipeName: "Pina Menta", ounces: 16 }],
  },
  {
    slug: "tamarindo-root",
    name: "Tamarindo Root",
    kind: "juice",
    size: "16 oz bottle",
    priceCents: 900,
    image: "/brand/product-tamarindo.png",
    color: "#CDA680",
    short: "Tamarindo, roots, and deep island flavor.",
    description: "Earthy, bright, and not trying to taste like everybody else.",
    tags: ["made to order", "local flavor", "100 bottles"],
    nutrients: ["roots", "minerals", "energy"],
    taste: "earthy, tangy, deep",
    testimonial: "Not basic at all. Tamarindo Root has personality.",
    capacity: 100,
    sold: 11,
    components: [{ recipeSlug: "tamarindo-root", recipeName: "Tamarindo Root", ounces: 16 }],
  },
  {
    slug: "jengibre-shot",
    name: "Jengibre Shot",
    kind: "shot",
    size: "2 oz shot",
    priceCents: 400,
    image: "/brand/product-jengibre.png",
    color: "#F4F2E9",
    short: "Pica sabrosito. Ginger, citrus, and no drama.",
    description: "A small but serious shot for your daily reset.",
    tags: ["immune shot", "250 shots", "cold pressed"],
    nutrients: ["immune", "ginger", "kick"],
    taste: "spicy, citrusy, direct",
    testimonial: "Pica sabrosito, pero in the best way.",
    capacity: 250,
    sold: 94,
    components: [{ recipeSlug: "jengibre-shot", recipeName: "Jengibre Shot", ounces: 2 }],
  },
  {
    slug: "mvp-sample-bundle",
    name: "MVP Sample Bundle",
    kind: "bundle",
    size: "5 x 4 oz bottles",
    priceCents: 2200,
    image: "/brand/product-vasito.png",
    color: "#4B63DA",
    short: "All launch flavors in one 4 oz tasting pack.",
    description: "One cart item, every MVP flavor. Perfect para probar el corillo completo.",
    tags: ["one SKU", "4 oz samples", "best for first timers"],
    nutrients: ["discovery", "variety", "starter pack"],
    taste: "all MVP flavors",
    testimonial: "Perfect when you do not know your favorite yet.",
    capacity: 52,
    sold: 17,
    components: [
      { recipeSlug: "parcha-verde", recipeName: "Parcha Verde", ounces: 4 },
      { recipeSlug: "acerola-glow", recipeName: "Acerola Glow", ounces: 4 },
      { recipeSlug: "pina-menta", recipeName: "Pina Menta", ounces: 4 },
      { recipeSlug: "tamarindo-root", recipeName: "Tamarindo Root", ounces: 4 },
      { recipeSlug: "jengibre-shot", recipeName: "Jengibre Shot", ounces: 2 },
    ],
  },
];

export const addOns: Product[] = [
  {
    slug: "delivery-note",
    name: "Gift note",
    kind: "addon",
    size: "card",
    priceCents: 200,
    image: "/brand/corillo-pulpa-scene.png",
    color: "#F4F2E9",
    short: "A little note for the delivery bag.",
    description: "For gifting, thanking, or sending un carinito.",
    tags: ["add-on"],
    nutrients: [],
    capacity: 999,
    sold: 0,
    components: [],
  },
  {
    slug: "reusable-bag",
    name: "Reusable tote",
    kind: "addon",
    size: "merch",
    priceCents: 1600,
    image: "/brand/corillo-logo-scene.png",
    color: "#CACD3A",
    short: "Cepa tote for market runs and bottle hauls.",
    description: "An easy add-on for pickup or delivery.",
    tags: ["add-on"],
    nutrients: [],
    capacity: 999,
    sold: 0,
    components: [],
  },
];

export const catalog = [...products, ...addOns];

export const deliveryThresholdCents = 4500;

export const metroPueblos = ["San Juan", "Guaynabo", "Bayamon", "Carolina", "Trujillo Alto", "Catano"];

export function findProduct(productSlug: string) {
  return catalog.find((product) => product.slug === productSlug);
}
