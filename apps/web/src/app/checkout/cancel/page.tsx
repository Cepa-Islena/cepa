import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CheckoutCancelPage({ searchParams }: { searchParams: Promise<{ order_id?: string }> }) {
  const params = await searchParams;
  const orderId = params.order_id;
  let releaseNote = "No payment was completed.";

  if (orderId) {
    const supabase = createSupabaseServiceClient();
    if (supabase) {
      const { error } = await supabase.rpc("release_order_reservation", {
        target_order_id: orderId,
      });
      releaseNote = error
        ? "No payment was completed. If a reservation remains, webhook expiry or cleanup will release it."
        : "No payment was completed. Any open reservation for this order was released.";
    } else {
      releaseNote =
        "No payment was completed. Commerce is not fully configured here, so reservation release was skipped.";
    }
  }

  return (
    <main className="utility-page">
      <img src="/brand/logo-borra.png" alt="Cepa Isleña" />
      <h1>Checkout paused.</h1>
      <p>{releaseNote}</p>
      <Link className="button primary" href="/#products">
        Return to cart
      </Link>
    </main>
  );
}
