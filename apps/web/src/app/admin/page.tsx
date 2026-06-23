import Link from "next/link";
import { getCurrentAdmin } from "@/lib/admin";
import { isCommerceConfigured } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/commerce";
import { signOutAdmin, updateContactStatus, updateOrderStatus, updateProductStatus } from "@/app/admin/actions";

type OrderRow = {
  id: string;
  status: string;
  customer_email: string | null;
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

  const [{ data: orders }, { data: dbProducts }, { data: messages }] = await Promise.all([
    service!
      .from("orders")
      .select("id,status,customer_email,delivery_pueblo,total_cents,stripe_checkout_session_id,created_at,order_items(product_name,quantity,total_amount_cents)")
      .order("created_at", { ascending: false })
      .limit(25),
    service!.from("products").select("slug,name,kind,active,size_label,price_cents").order("sort_order", { ascending: true }),
    service!.from("contact_messages").select("id,name,email,topic,message,status,created_at").order("created_at", { ascending: false }).limit(25),
  ]);

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <img src="/brand/logo-borra.png" alt="Cepa Isleña" />
          <p>{admin.email} · {admin.role}</p>
        </div>
        <form action={signOutAdmin}>
          <button className="button secondary" type="submit">
            Sign out
          </button>
        </form>
      </header>

      <section className="admin-section">
        <div className="section-heading stacked">
          <p>Orders</p>
          <h1>Drop operations</h1>
        </div>
        <div className="admin-table">
          {(orders as OrderRow[] | null)?.map((order) => (
            <article key={order.id} className="admin-row">
              <div>
                <strong>{formatPrice(order.total_cents)}</strong>
                <span>{new Date(order.created_at).toLocaleString()}</span>
                <span>{order.customer_email ?? "No email"} · {order.delivery_pueblo ?? "No pueblo"}</span>
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
                <select name="status" defaultValue={order.status}>
                  {["reserved", "checkout_created", "paid", "cancelled", "expired", "failed", "fulfilled"].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button type="submit">Update</button>
              </form>
            </article>
          )) ?? <p>No orders yet.</p>}
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
              <span>{product.kind} · {product.active ? "active" : "paused"}</span>
              <h3>{product.name}</h3>
              <p>{formatPrice(product.price_cents)} · {product.size_label}</p>
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
                <strong>{message.name}</strong>
                <span>{message.email} · {message.topic}</span>
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
