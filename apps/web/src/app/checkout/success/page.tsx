import Link from "next/link";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="utility-page">
      <img src="/brand/logo-borra.png" alt="Cepa Isleña" />
      <h1>Order received.</h1>
      <p>Stripe confirmed the checkout session. Cepa will follow up with pickup or delivery details.</p>
      {params.session_id ? <code>{params.session_id}</code> : null}
      <Link className="button primary" href="/">
        Back to shop
      </Link>
    </main>
  );
}
