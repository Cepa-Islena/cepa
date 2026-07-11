import { createClient } from "@supabase/supabase-js";
import { catalog, type Product, type ProductKind } from "@/lib/catalog";
import { getSupabasePublicEnv } from "@/lib/env";

type DbProduct = {
  slug: string;
  name: string;
  kind: ProductKind;
  size_label: string;
  price_cents: number;
  image_path: string;
  color: string;
  short: string;
  description: string;
  tags: string[] | null;
  nutrients: string[] | null;
  ingredients: string[] | null;
  allergens: string[] | null;
  taste: string | null;
  testimonial: string | null;
  active: boolean;
};

/**
 * Prefer live active products/prices from Supabase when the public env is present.
 * Falls back to the static catalog so the storefront still works offline / pre-config.
 * Capacity bars stay display-only; checkout locks real inventory in Postgres.
 */
export async function getStorefrontCatalog(): Promise<{ products: Product[]; source: "supabase" | "static" }> {
  const env = getSupabasePublicEnv();
  if (!env) {
    return { products: catalog, source: "static" };
  }

  try {
    const supabase = createClient(env.url, env.publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data, error } = await supabase
      .from("products")
      .select(
        "slug,name,kind,size_label,price_cents,image_path,color,short,description,tags,nutrients,ingredients,allergens,taste,testimonial,active",
      )
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (error || !data?.length) {
      return { products: catalog, source: "static" };
    }

    const staticBySlug = new Map(catalog.map((product) => [product.slug, product]));
    const products = (data as DbProduct[]).map((row) => {
      const fallback = staticBySlug.get(row.slug);

      return {
        slug: row.slug,
        name: row.name,
        kind: row.kind,
        size: row.size_label,
        priceCents: row.price_cents,
        image: row.image_path,
        color: row.color,
        short: row.short,
        description: row.description,
        tags: row.tags ?? [],
        nutrients: row.nutrients ?? [],
        ingredients: row.ingredients ?? fallback?.ingredients ?? [],
        allergens: row.allergens ?? fallback?.allergens ?? [],
        taste: row.taste ?? undefined,
        testimonial: row.testimonial ?? undefined,
        capacity: fallback?.capacity ?? 100,
        sold: 0,
        components: fallback?.components ?? [],
      } satisfies Product;
    });

    return { products, source: "supabase" };
  } catch {
    return { products: catalog, source: "static" };
  }
}
