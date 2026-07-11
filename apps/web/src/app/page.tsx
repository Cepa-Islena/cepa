import { Storefront } from "@/components/storefront";
import { getStorefrontCatalog } from "@/lib/catalog-server";
import { isCommerceConfigured } from "@/lib/env";

export const revalidate = 300;

export default async function HomePage() {
  const { products, source } = await getStorefrontCatalog();

  return (
    <Storefront
      commerceConfigured={isCommerceConfigured()}
      catalogProducts={products}
      catalogSource={source}
    />
  );
}
