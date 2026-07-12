import { getConfiguredSiteOrigin } from "@/lib/env";

export type OrderEmailItem = {
  product_name: string;
  product_slug: string;
  quantity: number;
  unit_amount_cents: number;
  total_amount_cents: number;
};

export type OrderEmailPayload = {
  orderId: string;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  deliveryPueblo: string | null;
  deliveryAddress: string | null;
  deliveryNotes: string | null;
  giftNote: string | null;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  stripeCheckoutSessionId: string | null;
  items: OrderEmailItem[];
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function getOrderNotifyEmail() {
  return (
    process.env.ORDER_NOTIFY_EMAIL?.trim() ||
    process.env.OWNER_EMAIL?.trim() ||
    "Cepaislena@gmail.com"
  );
}

export function getResendApiKey() {
  return process.env.RESEND_API_KEY?.trim() || null;
}

export function getOrderEmailFrom() {
  return (
    process.env.ORDER_EMAIL_FROM?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Cepa Isleña <onboarding@resend.dev>"
  );
}

export function isOrderEmailConfigured() {
  return Boolean(getResendApiKey());
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildOwnerHtml(order: OrderEmailPayload) {
  const site = getConfiguredSiteOrigin();
  const rows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #e8e4d8;">${escapeHtml(item.product_name)} × ${item.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #e8e4d8;text-align:right;">${formatMoney(item.total_amount_cents)}</td>
      </tr>`,
    )
    .join("");

  return `
  <div style="font-family:Georgia,serif;color:#3a2418;max-width:560px;margin:0 auto;line-height:1.5;">
    <p style="text-transform:uppercase;letter-spacing:0.08em;font-size:12px;color:#7a6658;">New Cepa order</p>
    <h1 style="font-size:28px;margin:0 0 12px;">Paid order received</h1>
    <p style="margin:0 0 18px;color:#5c4a3d;">Someone just completed checkout on ${escapeHtml(site)}.</p>
    <div style="background:#f7f3ea;border:1px solid #d9d0bf;padding:16px;margin-bottom:18px;">
      <p style="margin:0 0 6px;"><strong>Customer:</strong> ${escapeHtml(order.customerName || "—")}</p>
      <p style="margin:0 0 6px;"><strong>Phone:</strong> ${escapeHtml(order.customerPhone || "—")}</p>
      <p style="margin:0 0 6px;"><strong>Email:</strong> ${escapeHtml(order.customerEmail || "—")}</p>
      <p style="margin:0 0 6px;"><strong>Pueblo:</strong> ${escapeHtml(order.deliveryPueblo || "—")}</p>
      <p style="margin:0 0 6px;"><strong>Address:</strong> ${escapeHtml(order.deliveryAddress || "—")}</p>
      <p style="margin:0;"><strong>Notes:</strong> ${escapeHtml(order.deliveryNotes || "—")}</p>
      ${order.giftNote ? `<p style="margin:8px 0 0;"><strong>Gift note:</strong> ${escapeHtml(order.giftNote)}</p>` : ""}
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">${rows}</table>
    <p style="margin:0 0 4px;"><strong>Subtotal:</strong> ${formatMoney(order.subtotalCents)}</p>
    <p style="margin:0 0 4px;"><strong>Delivery:</strong> ${formatMoney(order.deliveryFeeCents)}</p>
    <p style="margin:0 0 18px;font-size:18px;"><strong>Total:</strong> ${formatMoney(order.totalCents)}</p>
    <p style="margin:0;font-size:12px;color:#7a6658;">Order ID: ${escapeHtml(order.orderId)}</p>
  </div>`;
}

function buildOwnerText(order: OrderEmailPayload) {
  const lines = [
    "New paid Cepa order",
    "",
    `Customer: ${order.customerName || "—"}`,
    `Phone: ${order.customerPhone || "—"}`,
    `Email: ${order.customerEmail || "—"}`,
    `Pueblo: ${order.deliveryPueblo || "—"}`,
    `Address: ${order.deliveryAddress || "—"}`,
    `Notes: ${order.deliveryNotes || "—"}`,
    order.giftNote ? `Gift note: ${order.giftNote}` : null,
    "",
    ...order.items.map(
      (item) => `${item.product_name} x${item.quantity} — ${formatMoney(item.total_amount_cents)}`,
    ),
    "",
    `Subtotal: ${formatMoney(order.subtotalCents)}`,
    `Delivery: ${formatMoney(order.deliveryFeeCents)}`,
    `Total: ${formatMoney(order.totalCents)}`,
    `Order ID: ${order.orderId}`,
  ].filter(Boolean);

  return lines.join("\n");
}

async function sendResendEmail(input: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
}) {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    return { ok: false as const, skipped: true as const, error: "RESEND_API_KEY is not configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getOrderEmailFrom(),
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: input.replyTo || undefined,
    }),
  });

  const payload = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;

  if (!response.ok) {
    return {
      ok: false as const,
      skipped: false as const,
      error: payload?.message || `Resend error ${response.status}`,
    };
  }

  return { ok: true as const, skipped: false as const, id: payload?.id || null };
}

export async function sendOwnerOrderEmail(order: OrderEmailPayload) {
  const owner = getOrderNotifyEmail();
  const total = formatMoney(order.totalCents);
  const name = order.customerName?.trim() || "Customer";

  return sendResendEmail({
    to: owner,
    subject: `New Cepa order · ${name} · ${total}`,
    html: buildOwnerHtml(order),
    text: buildOwnerText(order),
    replyTo: order.customerEmail,
  });
}

export async function sendCustomerOrderEmail(order: OrderEmailPayload) {
  const email = order.customerEmail?.trim();
  if (!email) {
    return { ok: false as const, skipped: true as const, error: "No customer email" };
  }

  const total = formatMoney(order.totalCents);
  const itemLines = order.items
    .map((item) => `${item.product_name} × ${item.quantity} — ${formatMoney(item.total_amount_cents)}`)
    .join("<br/>");

  const html = `
  <div style="font-family:Georgia,serif;color:#3a2418;max-width:560px;margin:0 auto;line-height:1.5;">
    <h1 style="font-size:28px;margin:0 0 12px;">Order received</h1>
    <p style="margin:0 0 16px;">Thanks${order.customerName ? `, ${escapeHtml(order.customerName)}` : ""}. We got your order and will follow up with delivery details.</p>
    <div style="background:#f7f3ea;border:1px solid #d9d0bf;padding:16px;margin-bottom:16px;">
      <p style="margin:0 0 8px;">${itemLines}</p>
      <p style="margin:0;"><strong>Total: ${total}</strong></p>
    </div>
    <p style="margin:0;color:#5c4a3d;">Delivery to ${escapeHtml(order.deliveryPueblo || "metro San Juan")}.</p>
  </div>`;

  const text = [
    "Order received",
    "",
    `Thanks${order.customerName ? `, ${order.customerName}` : ""}. We got your order.`,
    ...order.items.map((item) => `${item.product_name} x${item.quantity} — ${formatMoney(item.total_amount_cents)}`),
    `Total: ${total}`,
    `Delivery pueblo: ${order.deliveryPueblo || "—"}`,
  ].join("\n");

  return sendResendEmail({
    to: email,
    subject: `Cepa Isleña · order confirmed · ${total}`,
    html,
    text,
  });
}

export async function loadOrderEmailPayload(
  supabase: {
    from: (table: string) => any;
  },
  orderId: string,
): Promise<OrderEmailPayload | null> {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id,status,customer_name,customer_phone,customer_email,delivery_pueblo,delivery_address,delivery_notes,gift_note,subtotal_cents,delivery_fee_cents,total_cents,stripe_checkout_session_id",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) return null;

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("product_name,product_slug,quantity,unit_amount_cents,total_amount_cents")
    .eq("order_id", orderId);

  if (itemsError) return null;

  return {
    orderId: order.id,
    status: order.status,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    customerEmail: order.customer_email,
    deliveryPueblo: order.delivery_pueblo,
    deliveryAddress: order.delivery_address,
    deliveryNotes: order.delivery_notes,
    giftNote: order.gift_note,
    subtotalCents: order.subtotal_cents ?? 0,
    deliveryFeeCents: order.delivery_fee_cents ?? 0,
    totalCents: order.total_cents ?? 0,
    stripeCheckoutSessionId: order.stripe_checkout_session_id,
    items: (items ?? []) as OrderEmailItem[],
  };
}
