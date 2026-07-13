import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getStripeWebhookSecret: vi.fn(),
  createSupabaseServiceClient: vi.fn(),
  getStripeClient: vi.fn(),
  loadOrderEmailPayload: vi.fn(),
  notifyPaidOrder: vi.fn(),
  sendOwnerOrderEmail: vi.fn(),
  sendCustomerOrderEmail: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getStripeWebhookSecret: mocks.getStripeWebhookSecret,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: mocks.createSupabaseServiceClient,
}));

vi.mock("@/lib/stripe", () => ({
  getStripeClient: mocks.getStripeClient,
}));

vi.mock("@/lib/order-email", () => ({
  loadOrderEmailPayload: mocks.loadOrderEmailPayload,
  notifyPaidOrder: mocks.notifyPaidOrder,
  sendOwnerOrderEmail: mocks.sendOwnerOrderEmail,
  sendCustomerOrderEmail: mocks.sendCustomerOrderEmail,
}));

import { POST } from "./route";

type StripeEventInput = {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      payment_status?: string;
      metadata?: {
        order_id?: string;
      };
    };
  };
};

function webhookRequest(signature: string | null = "sig_test") {
  const headers = new Headers();
  if (signature) headers.set("stripe-signature", signature);

  return new Request("https://cepaislena.com/api/stripe/webhook", {
    method: "POST",
    body: JSON.stringify({ stripe: "event" }),
    headers,
  });
}

function checkoutEvent(overrides: Partial<StripeEventInput> = {}): StripeEventInput {
  return {
    id: "evt_test_123",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_123",
        payment_status: "paid",
        metadata: {
          order_id: "order_123",
        },
      },
    },
    ...overrides,
  };
}

function createSupabaseMock({
  insertError = null,
  rpcError = null,
}: {
  insertError?: { code?: string; message?: string } | null;
  rpcError?: { message: string } | null;
} = {}) {
  const insert = vi.fn().mockResolvedValue({ error: insertError });
  const from = vi.fn(() => ({ insert }));
  const rpc = vi.fn().mockResolvedValue({ error: rpcError });

  return {
    supabase: { from, rpc },
    insert,
    rpc,
  };
}

function setStripeEvent(event: StripeEventInput) {
  const constructEvent = vi.fn().mockReturnValue(event);
  mocks.getStripeClient.mockReturnValue({
    webhooks: {
      constructEvent,
    },
  });
  return constructEvent;
}

describe("Stripe webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getStripeWebhookSecret.mockReturnValue("whsec_test");
    mocks.loadOrderEmailPayload.mockResolvedValue(null);
    mocks.notifyPaidOrder.mockResolvedValue(undefined);
    mocks.sendOwnerOrderEmail.mockResolvedValue({ ok: true, skipped: false, id: "email_1" });
    mocks.sendCustomerOrderEmail.mockResolvedValue({ ok: true, skipped: true, error: "No customer email" });
  });

  it("rejects requests without a Stripe signature", async () => {
    const supabaseMock = createSupabaseMock();
    mocks.createSupabaseServiceClient.mockReturnValue(supabaseMock.supabase);
    setStripeEvent(checkoutEvent());

    const response = await POST(webhookRequest(null));

    expect(response.status).toBe(400);
  });

  it("rejects invalid Stripe signatures", async () => {
    const supabaseMock = createSupabaseMock();
    const constructEvent = vi.fn(() => {
      throw new Error("Invalid signature");
    });
    mocks.createSupabaseServiceClient.mockReturnValue(supabaseMock.supabase);
    mocks.getStripeClient.mockReturnValue({
      webhooks: {
        constructEvent,
      },
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(400);
    expect(supabaseMock.insert).not.toHaveBeenCalled();
  });

  it("marks paid Checkout Sessions as paid", async () => {
    const supabaseMock = createSupabaseMock();
    mocks.createSupabaseServiceClient.mockReturnValue(supabaseMock.supabase);
    setStripeEvent(checkoutEvent());

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(supabaseMock.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "evt_test_123",
        type: "checkout.session.completed",
      }),
    );
    expect(supabaseMock.rpc).toHaveBeenCalledWith("mark_order_paid", {
      target_order_id: "order_123",
      checkout_session_id: "cs_test_123",
    });
  });

  it("does not mark delayed Checkout Sessions paid until Stripe confirms success", async () => {
    const supabaseMock = createSupabaseMock();
    mocks.createSupabaseServiceClient.mockReturnValue(supabaseMock.supabase);
    setStripeEvent(
      checkoutEvent({
        data: {
          object: {
            id: "cs_test_123",
            payment_status: "unpaid",
            metadata: {
              order_id: "order_123",
            },
          },
        },
      }),
    );

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("marks async payment success events as paid", async () => {
    const supabaseMock = createSupabaseMock();
    mocks.createSupabaseServiceClient.mockReturnValue(supabaseMock.supabase);
    setStripeEvent(checkoutEvent({ type: "checkout.session.async_payment_succeeded" }));

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("mark_order_paid", {
      target_order_id: "order_123",
      checkout_session_id: "cs_test_123",
    });
  });

  it("releases reservations for expired or failed Checkout Sessions", async () => {
    const supabaseMock = createSupabaseMock();
    mocks.createSupabaseServiceClient.mockReturnValue(supabaseMock.supabase);
    setStripeEvent(checkoutEvent({ type: "checkout.session.async_payment_failed" }));

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("release_order_reservation", {
      target_order_id: "order_123",
    });
  });

  it("still runs the idempotent database action for duplicate Stripe events", async () => {
    const supabaseMock = createSupabaseMock({ insertError: { code: "23505" } });
    mocks.createSupabaseServiceClient.mockReturnValue(supabaseMock.supabase);
    setStripeEvent(checkoutEvent());

    const response = await POST(webhookRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ received: true, duplicate: true });
    expect(supabaseMock.rpc).toHaveBeenCalledWith("mark_order_paid", {
      target_order_id: "order_123",
      checkout_session_id: "cs_test_123",
    });
  });

  it("returns an error when a webhook database action fails so Stripe can retry", async () => {
    const supabaseMock = createSupabaseMock({ rpcError: { message: "Database unavailable" } });
    mocks.createSupabaseServiceClient.mockReturnValue(supabaseMock.supabase);
    setStripeEvent(checkoutEvent());

    const response = await POST(webhookRequest());

    expect(response.status).toBe(500);
  });
});
