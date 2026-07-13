import Link from "next/link";
import { getCurrentAdmin } from "@/lib/admin";
import {
  getOrderNotifyEmail,
  isOrderEmailConfigured,
} from "@/lib/order-email";
import {
  getStripeSecretKey,
  getStripeWebhookSecret,
  isCommerceConfigured,
} from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/commerce";
import { signOutAdmin, updateContactStatus, updateOrderStatus, updateProductStatus } from "@/app/admin/actions";

type OrderRow = {
  id: string;
  status: string;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  delivery_notes: string | null;
  delivery_pueblo: string | null;
  total_cents: number;
  stripe_checkout_session_id: string | null;
  created_at: string;
  order_items: {
    product_name: string;
    quantity: number;
    total_amount_cents: number;
  }[];
};

type ProductRow = {
  slug: string;
  name: string;
  kind: string;
  active: boolean;
  size_label: string;
  price_cents: number;
};

type ContactRow = {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  status: string;
  created_at: string;
};

export const dynamic = "force-dynamic";

function statusPriority(status: string) {
  switch (status) {
    case "paid":
      return 0;
    case "checkout_created":
      return 1;
    case "reserved":
      return 2;
    case "fulfilled":
      return 3;
    default:
      return 4;
  }
}

export default async function AdminPage() {
  if (!isCommerceConfigured()) {
    return (
      <main className="utility-page">
        <img src="/brand/logo-borra.png" alt="Cepa Isleña" />
        <h1>Admin needs configuration.</h1>
        <p>Add Supabase and Stripe server env vars before using admin tools.</p>
        <Link className="button primary" href="/">
          Back to shop
        </Link>
      </main>
    );
  }

  const admin = await getCurrentAdmin();
  if (!admin) {
    return (
      <main className="utility-page">
        <img src="/brand/logo-borra.png" alt="Cepa Isleña" />
        <h1>Admin access required.</h1>
        <p>Sign in with a Supabase Auth user that exists in `admin_profiles`.</p>
        <Link className="button primary" href="/admin/login">
          Sign in
        </Link>
      </main>
    );
  }

  const service = createSupabaseServiceClient();

  const [{ data: orders }, { data: dbProducts }, { data: messages }, { data: zones }] = await Promise.all([
    service!
      .from("orders")
      .select(
        "id,status,customer_email,customer_name,customer_phone,delivery_address,delivery_notes,delivery_pueblo,total_cents,stripe_checkout_session_id,created_at,order_items(product_name,quantity,total_amount_cents)",
      )
      .order("created_at", { ascending: false })
      .limit(40),
    service!.from("products").select("slug,name,kind,active,size_label,price_cents").order("sort_order", { ascending: true }),
    service!.from("contact_messages").select("id,name,email,topic,message,status,created_at").order("created_at", { ascending: false }).limit(25),
    service!.from("delivery_zones").select("pueblo,delivery_fee_cents,active").order("pueblo", { ascending: true }),
  ]);

  const orderRows = ((orders as OrderRow[] | null) ?? [])
    .slice()
    .sort((a, b) => statusPriority(a.status) - statusPriority(b.status) || b.created_at.localeCompare(a.created_at));

  const paidOpen = orderRows.filter((o) => o.status === "paid").length;
  const openCheckout = orderRows.filter((o) => o.status === "checkout_created" || o.status === "reserved").length;
  const newContacts = ((messages as ContactRow[] | null) ?? []).filter((m) => m.status === "new").length;
  const emailReady = isOrderEmailConfigured();
  const notifyEmail = getOrderNotifyEmail();

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <img src="/brand/logo-borra.png" alt="Cepa Isleña" />
          <p>
            {admin.email} · {admin.role}
          </p>
        </div>
        <form action={signOutAdmin}>
          <button className="button secondary" type="submit">
            Sign out
          </button>
        </form>
      </header>

      <section className="admin-section">
        <div className="section-heading stacked">
          <p>Ops board</p>
          <h1>Today’s queue</h1>
        </div>
        <div className="admin-grid">
          <article>
            <span>Needs packing</span>
            <h3>{paidOpen} paid</h3>
            <p>Mark fulfilled after delivery/hand-off.</p>
          </article>
          <article>
            <span>Open carts</span>
            <h3>{openCheckout}</h3>
            <p>Reserved / checkout started (may expire).</p>
          </article>
          <article>
            <span>New contact</span>
            <h3>{newContacts}</h3>
            <p>Messages waiting for a reply.</p>
          </article>
          <article>
            <span>Systems</span>
            <h3>{emailReady ? "Email on" : "Email off"}</h3>
            <p>
              Notify: {notifyEmail}
              <br />
              Stripe secret: {getStripeSecretKey() ? "set" : "missing"} · webhook:{" "}
              {getStripeWebhookSecret() ? "set" : "missing"}
              <br />
              {emailReady ? "RESEND_API_KEY present." : "Add RESEND_API_KEY on Vercel to email orders."}
            </p>
          </article>
        </div>
      </section>

      <section className="admin-section">
        <div className="section-heading stacked">
          <p>Orders</p>
          <h2>Drop operations</h2>
        </div>
        <p className="admin-help">
          Paid status comes from Stripe webhooks. Pack paid orders first, then mark fulfilled. Cancel/expire unpaid
          reservations to free capacity.
        </p>
        <div className="admin-table">
          {orderRows.map((order) => (
            <article key={order.id} className={`admin-row status-${order.status}`}>
              <div>
                <strong>
                  {formatPrice(order.total_cents)} · {order.status}
                </strong>
                <span>{new Date(order.created_at).toLocaleString()}</span>
                <span>
                  {order.customer_name ?? "No name"} · {order.customer_phone ?? "No phone"}
                </span>
                <span>
                  {order.customer_email ?? "No email"} · {order.delivery_pueblo ?? "No pueblo"}
                </span>
                <span>{order.delivery_address ?? "No address"}</span>
                {order.delivery_notes ? <span>Notes: {order.delivery_notes}</span> : null}
              </div>
              <ul>
                {order.order_items.map((item) => (
                  <li key={`${order.id}-${item.product_name}`}>
                    {item.quantity} x {item.product_name} · {formatPrice(item.total_amount_cents)}
                  </li>
                ))}
              </ul>
              <form action={updateOrderStatus}>
                <input type="hidden" name="orderId" value={order.id} />
                <select name="status" defaultValue={order.status === "paid" ? "fulfilled" : order.status}>
                  {["cancelled", "failed", "expired", "fulfilled"].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button type="submit">Update</button>
              </form>
            </article>
          )) ?? <p>No orders yet.</p>}
          {!orderRows.length ? <p>No orders yet.</p> : null}
        </div>
      </section>

      <section className="admin-section">
        <div className="section-heading stacked">
          <p>Delivery</p>
          <h2>Metro zones</h2>
        </div>
        <div className="admin-grid">
          {(zones as { pueblo: string; delivery_fee_cents: number; active: boolean }[] | null)?.map((zone) => (
            <article key={zone.pueblo}>
              <span>{zone.active ? "active" : "paused"}</span>
              <h3>{zone.pueblo}</h3>
              <p>Fee {formatPrice(zone.delivery_fee_cents)}</p>
            </article>
          )) ?? <p>No zones loaded.</p>}
        </div>
      </section>

      <section className="admin-section">
        <div className="section-heading stacked">
          <p>Catalog</p>
          <h2>Products</h2>
        </div>
        <div className="admin-grid">
          {(dbProducts as ProductRow[] | null)?.map((product) => (
            <article key={product.slug}>
              <span>
                {product.kind} · {product.active ? "active" : "paused"}
              </span>
              <h3>{product.name}</h3>
              <p>
                {formatPrice(product.price_cents)} · {product.size_label}
              </p>
              <form action={updateProductStatus}>
                <input type="hidden" name="productSlug" value={product.slug} />
                <select name="active" defaultValue={String(product.active)}>
                  <option value="true">Active</option>
                  <option value="false">Paused</option>
                </select>
                <button type="submit">Save</button>
              </form>
            </article>
          )) ?? <p>No products loaded.</p>}
        </div>
      </section>

      <section className="admin-section">
        <div className="section-heading stacked">
          <p>Contact</p>
          <h2>Messages</h2>
        </div>
        <div className="admin-table">
          {(messages as ContactRow[] | null)?.map((message) => (
            <article key={message.id} className="admin-row">
              <div>
                <strong>
                  {message.name} · {message.status}
                </strong>
                <span>
                  {message.email} · {message.topic}
                </span>
                <span>{new Date(message.created_at).toLocaleString()}</span>
              </div>
              <p>{message.message}</p>
              <form action={updateContactStatus}>
                <input type="hidden" name="messageId" value={message.id} />
                <select name="status" defaultValue={message.status}>
                  {["new", "read", "archived"].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button type="submit">Update</button>
              </form>
            </article>
          )) ?? <p>No contact messages yet.</p>}
        </div>
      </section>
    </main>
  );
}
