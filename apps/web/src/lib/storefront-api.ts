import type { CartItem } from "@/lib/catalog";

export type CheckoutSessionInput = {
  cartItems: CartItem[];
  deliveryPueblo: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryNotes?: string;
  giftNote?: string;
};

export type ContactMessageInput = {
  name: string;
  email: string;
  topic: "events" | "outside-metro" | "general";
  message: string;
};

async function readJsonError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? fallback;
}

export async function createCheckoutSession(input: CheckoutSessionInput) {
  const response = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;

  if (!response.ok || !payload?.url) {
    throw new Error(payload?.error ?? "Checkout is unavailable right now.");
  }

  return { url: payload.url };
}

export async function sendContactMessage(input: ContactMessageInput) {
  const response = await fetch("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await readJsonError(response, "Message could not be sent."));
  }
}
