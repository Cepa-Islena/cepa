import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getConfiguredSiteOrigin: vi.fn(),
  isCommerceConfigured: vi.fn(),
  createSupabaseServiceClient: vi.fn(),
  getStripeClient: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getConfiguredSiteOrigin: mocks.getConfiguredSiteOrigin,
  getRequestOrigin: mocks.getConfiguredSiteOrigin,
  isCommerceConfigured: mocks.isCommerceConfigured,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: mocks.createSupabaseServiceClient,
}));

vi.mock("@/lib/stripe", () => ({
  getStripeClient: mocks.getStripeClient,
}));

import { POST } from "./route";

type SupabaseMockOptions = {
  orderItems?: Record<string, unknown>[];
  orderItemsError?: { message: string } | null;
  orderUpdateError?: { message: string } | null;
  rateLimitError?: { message: string } | null;
  reservation?: Record<string, unknown> | null;
  reservationError?: { message: string } | null;
  releaseError?: { message: string } | null;
};

function checkoutRequest(body: Record<string, unknown>) {
  return new Request("https://cepaislena.com/api/checkout", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      origin: "https://cepaislena.com",
    },
  });
}

function validCheckoutBody(overrides: Record<string, unknown> = {}) {
  return {
    cartItems: [{ productSlug: "parcha-verde", quantity: 1 }],
    deliveryPueblo: "San Juan",
    customerEmail: "cliente@example.com",
    customerName: "Cliente Cepa",
    customerPhone: "7875550100",
    deliveryAddress: "123 Calle Test, San Juan",
    deliveryNotes: "Call on arrival",
    giftNote: "Para el corillo",
    ...overrides,
  };
}

function createSupabaseMock({
  orderItems = [
    {
      product_slug: "parcha-verde",
      product_name: "Locked Parcha",
      quantity: 1,
      unit_amount_cents: 900,
      total_amount_cents: 900,
    },
  ],
  orderItemsError = null,
  orderUpdateError = null,
  rateLimitError = null,
  reservation = {
    order_id: "order_123",
    subtotal_cents: 900,
    total_cents: 900,
    reservation_expires_at: "2026-06-23T12:00:00Z",
  },
  reservationError = null,
  releaseError = null,
}: SupabaseMockOptions = {}) {
  const registerCheckoutAttempt = vi.fn().mockResolvedValue({ error: rateLimitError });
  const reserveSingle = vi.fn().mockResolvedValue({ data: reservation, error: reservationError });
  const orderItemsEq = vi.fn().mockResolvedValue({ data: orderItems, error: orderItemsError });
  const ordersEq = vi.fn().mockResolvedValue({ error: orderUpdateError });
  const orderItemsSelect = vi.fn(() => ({ eq: orderItemsEq }));
  const ordersUpdate = vi.fn(() => ({ eq: ordersEq }));
  const rpc = vi.fn((name: string) => {
    if (name === "register_checkout_attempt") return registerCheckoutAttempt();
    if (name === "reserve_order") return { single: reserveSingle };
    return Promise.resolve({ error: releaseError });
  });
  const from = vi.fn((table: string) => {
    if (table === "order_items") return { select: orderItemsSelect };
    if (table === "orders") return { update: ordersUpdate };
    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    supabase: { rpc, from },
    rpc,
    registerCheckoutAttempt,
    reserveSingle,
    orderItemsEq,
    ordersEq,
    orderItemsSelect,
    ordersUpdate,
  };
}

function createStripeMock() {
  const create = vi.fn().mockResolvedValue({
    id: "cs_test_123",
    url: "https://checkout.stripe.test/cs_test_123",
  });
  const expire = vi.fn().mockResolvedValue({ id: "cs_test_123" });

  return {
    stripe: {
      checkout: {
        sessions: {
          create,
          expire,
        },
      },
    },
    create,
    expire,
  };
}

describe("checkout route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getConfiguredSiteOrigin.mockReturnValue("https://cepaislena.com");
    mocks.isCommerceConfigured.mockReturnValue(true);
  });

  it("rejects invalid checkout requests", async () => {
    const response = await POST(checkoutRequest({ cartItems: [] }));

    expect(response.status).toBe(400);
  });

  it("rejects delivery outside the metro route", async () => {
    const response = await POST(checkoutRequest(validCheckoutBody({ deliveryPueblo: "Ponce" })));

    expect(response.status).toBe(400);
  });

  it("returns a paused response when commerce env vars are missing", async () => {
    mocks.isCommerceConfigured.mockReturnValue(false);

    const response = await POST(checkoutRequest(validCheckoutBody()));

    expect(response.status).toBe(503);
  });

  it("creates Stripe Checkout from reserved database line items", async () => {
    const supabaseMock = createSupabaseMock();
    const stripeMock = createStripeMock();
    mocks.createSupabaseServiceClient.mockReturnValue(supabaseMock.supabase);
    mocks.getStripeClient.mockReturnValue(stripeMock.stripe);

    const response = await POST(checkoutRequest(validCheckoutBody()));
    const body = await response.json();
    const checkoutPayload = stripeMock.create.mock.calls[0]?.[0];

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      url: "https://checkout.stripe.test/cs_test_123",
      orderId: "order_123",
      subtotalCents: 900,
      totalCents: 900,
    });
    expect(supabaseMock.rpc).toHaveBeenCalledWith("register_checkout_attempt", {
      rate_limit_key: expect.stringMatching(/^checkout:[a-f0-9]{64}$/),
    });
    expect(supabaseMock.rpc).toHaveBeenCalledWith("reserve_order", {
      cart_items: [{ productSlug: "parcha-verde", quantity: 1 }],
      delivery_pueblo: "San Juan",
      customer_email: "cliente@example.com",
      customer_name: "Cliente Cepa",
      customer_phone: "7875550100",
      delivery_address: "123 Calle Test, San Juan",
      delivery_notes: "Call on arrival",
      gift_note: "Para el corillo",
    });
    expect(supabaseMock.orderItemsEq).toHaveBeenCalledWith("order_id", "order_123");
    expect(checkoutPayload).toMatchObject({
      mode: "payment",
      client_reference_id: "order_123",
      customer_email: "cliente@example.com",
      metadata: {
        order_id: "order_123",
        delivery_pueblo: "San Juan",
        customer_name: "Cliente Cepa",
        customer_phone: "7875550100",
      },
    });
    expect(checkoutPayload.line_items).toHaveLength(1);
    expect(checkoutPayload.line_items[0]).toMatchObject({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: 900,
        product_data: {
          name: "Locked Parcha",
          metadata: {
            product_slug: "parcha-verde",
          },
        },
      },
    });
    expect(supabaseMock.ordersUpdate).toHaveBeenCalledWith({
      status: "checkout_created",
      stripe_checkout_session_id: "cs_test_123",
      total_cents: 900,
    });
  });

  it("blocks checkout attempts before reserving inventory when the in-app rate limit is exceeded", async () => {
    const supabaseMock = createSupabaseMock({
      rateLimitError: { message: "Too many checkout attempts. Please wait and try again." },
    });
    const stripeMock = createStripeMock();
    mocks.createSupabaseServiceClient.mockReturnValue(supabaseMock.supabase);
    mocks.getStripeClient.mockReturnValue(stripeMock.stripe);

    const response = await POST(checkoutRequest(validCheckoutBody()));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toMatchObject({ error: "Too many checkout attempts. Please wait and try again." });
    expect(supabaseMock.registerCheckoutAttempt).toHaveBeenCalled();
    expect(supabaseMock.reserveSingle).not.toHaveBeenCalled();
    expect(stripeMock.create).not.toHaveBeenCalled();
  });

  it("releases the reservation when reserved item totals do not match", async () => {
    const supabaseMock = createSupabaseMock({
      reservation: {
        order_id: "order_123",
        subtotal_cents: 900,
        total_cents: 900,
        reservation_expires_at: "2026-06-23T12:00:00Z",
      },
      orderItems: [
        {
          product_slug: "parcha-verde",
          product_name: "Locked Parcha",
          quantity: 1,
          unit_amount_cents: 900,
          total_amount_cents: 500,
        },
      ],
    });
    const stripeMock = createStripeMock();
    mocks.createSupabaseServiceClient.mockReturnValue(supabaseMock.supabase);
    mocks.getStripeClient.mockReturnValue(stripeMock.stripe);

    const response = await POST(checkoutRequest(validCheckoutBody()));

    expect(response.status).toBe(502);
    expect(stripeMock.create).not.toHaveBeenCalled();
    expect(supabaseMock.rpc).toHaveBeenCalledWith("release_order_reservation", {
      target_order_id: "order_123",
    });
  });

  it("expires a Stripe session and releases capacity when order update fails", async () => {
    const supabaseMock = createSupabaseMock({
      orderUpdateError: { message: "Could not update order." },
    });
    const stripeMock = createStripeMock();
    mocks.createSupabaseServiceClient.mockReturnValue(supabaseMock.supabase);
    mocks.getStripeClient.mockReturnValue(stripeMock.stripe);

    const response = await POST(checkoutRequest(validCheckoutBody()));

    expect(response.status).toBe(502);
    expect(stripeMock.expire).toHaveBeenCalledWith("cs_test_123");
    expect(supabaseMock.rpc).toHaveBeenCalledWith("release_order_reservation", {
      target_order_id: "order_123",
    });
  });
});
