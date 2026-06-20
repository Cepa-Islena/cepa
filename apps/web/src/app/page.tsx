import { Storefront } from "@/components/storefront";
import { isCommerceConfigured } from "@/lib/env";

export const revalidate = 300;

export default function HomePage() {
  return <Storefront commerceConfigured={isCommerceConfigured()} />;
}
