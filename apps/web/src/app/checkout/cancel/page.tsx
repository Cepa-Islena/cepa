import Link from "next/link";

export default async function CheckoutCancelPage({ searchParams }: { searchParams: Promise<{ order_id?: string }> }) {
  const params = await searchParams;

  return (
    <main className="utility-page">
      <img src="/brand/logo-borra.png" alt="Cepa Isleña" />
      <h1>Checkout paused.</h1>
      <p>No payment was completed. If a reservation was created, the webhook or scheduled cleanup can release it.</p>
      {params.order_id ? <code>{params.order_id}</code> : null}
      <Link className="button primary" href="/#products">
        Return to cart
      </Link>
    </main>
  );
}
