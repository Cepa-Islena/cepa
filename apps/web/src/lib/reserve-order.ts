import type { SupabaseClient } from "@supabase/supabase-js";

type CartLine = { productSlug: string; quantity: number };

export type ReservationResult = {
  order_id: string;
  subtotal_cents: number;
  total_cents: number;
  reservation_expires_at: string;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  kind: string;
  active: boolean;
};

type ZoneRow = {
  pueblo: string;
  delivery_fee_cents: number;
  active: boolean;
};

type ComponentRow = {
  ounces: number;
  recipe_id: string;
  recipes: {
    id: string;
    slug: string;
    name: string;
    total_capacity_oz: number;
    reserved_capacity_oz: number;
    sold_capacity_oz: number;
  } | null;
};

/**
 * App-side reserve used when the DB RPC is broken (e.g. ambiguous subtotal_cents).
 * Prefer the SQL RPC once migrations are applied — this is a soft-launch bridge.
 */
export async function reserveOrderInApp(
  supabase: SupabaseClient,
  input: {
    cartItems: CartLine[];
    deliveryPueblo: string;
    customerEmail: string | null;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    deliveryNotes: string | null;
    giftNote: string | null;
  },
): Promise<{ data: ReservationResult | null; error: string | null }> {
  try {
    if (!input.cartItems.length || input.cartItems.length > 20) {
      return { data: null, error: "Cart must contain at least one item" };
    }

    const name = input.customerName.trim();
    const phone = input.customerPhone.trim();
    const address = input.deliveryAddress.trim();

    if (!name || name.length > 120) return { data: null, error: "Customer name is required" };
    if (phone.length < 7 || phone.length > 40) return { data: null, error: "Customer phone is required" };
    if (address.length < 5 || address.length > 240) return { data: null, error: "Delivery address is required" };
    if (input.deliveryNotes && input.deliveryNotes.length > 500) {
      return { data: null, error: "Delivery notes are too long" };
    }
    if (input.giftNote && input.giftNote.length > 280) {
      return { data: null, error: "Gift note is too long" };
    }

    const { data: zone, error: zoneError } = await supabase
      .from("delivery_zones")
      .select("pueblo, delivery_fee_cents, active")
      .ilike("pueblo", input.deliveryPueblo)
      .eq("active", true)
      .maybeSingle<ZoneRow>();

    if (zoneError || !zone) {
      return { data: null, error: zoneError?.message ?? "Delivery zone is not active" };
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        status: "reserved",
        customer_email: input.customerEmail?.trim() || null,
        customer_name: name,
        customer_phone: phone,
        delivery_address: address,
        delivery_notes: input.deliveryNotes?.trim() || null,
        gift_note: input.giftNote?.trim() || null,
        delivery_pueblo: zone.pueblo,
        subtotal_cents: 0,
        delivery_fee_cents: zone.delivery_fee_cents,
        total_cents: zone.delivery_fee_cents,
        reservation_expires_at: expiresAt,
      })
      .select("id")
      .single<{ id: string }>();

    if (orderError || !order) {
      return { data: null, error: orderError?.message ?? "Could not create order" };
    }

    let subtotal = 0;

    try {
      for (const line of input.cartItems) {
        if (line.quantity < 1 || line.quantity > 24) {
          throw new Error("Invalid quantity");
        }

        const { data: product, error: productError } = await supabase
          .from("products")
          .select("id, slug, name, price_cents, kind, active")
          .eq("slug", line.productSlug)
          .eq("active", true)
          .maybeSingle<ProductRow>();

        if (productError || !product) {
          throw new Error(productError?.message ?? "Product is not active");
        }

        const { data: components, error: componentsError } = await supabase
          .from("product_components")
          .select(
            "ounces, recipe_id, recipes ( id, slug, name, total_capacity_oz, reserved_capacity_oz, sold_capacity_oz )",
          )
          .eq("product_id", product.id);

        if (componentsError) {
          throw new Error(componentsError.message);
        }

        const typedComponents = (components ?? []) as ComponentRow[];
        const componentsSnapshot: Array<Record<string, unknown>> = [];

        for (const component of typedComponents) {
          const recipe = component.recipes;
          if (!recipe) continue;

          const available =
            recipe.total_capacity_oz - recipe.reserved_capacity_oz - recipe.sold_capacity_oz;
          const need = component.ounces * line.quantity;

          if (available < need) {
            throw new Error(`Not enough capacity for ${recipe.name}`);
          }

          const { error: reserveError } = await supabase
            .from("recipes")
            .update({ reserved_capacity_oz: recipe.reserved_capacity_oz + need })
            .eq("id", recipe.id);

          if (reserveError) {
            throw new Error(reserveError.message);
          }

          componentsSnapshot.push({
            recipeSlug: recipe.slug,
            recipeName: recipe.name,
            ounces: component.ounces,
            reservedOunces: need,
          });
        }

        if (product.kind !== "addon" && componentsSnapshot.length === 0) {
          throw new Error("Product has no recipe components");
        }

        const itemTotal = product.price_cents * line.quantity;
        subtotal += itemTotal;

        const { error: itemError } = await supabase.from("order_items").insert({
          order_id: order.id,
          product_id: product.id,
          product_slug: product.slug,
          product_name: product.name,
          quantity: line.quantity,
          unit_amount_cents: product.price_cents,
          total_amount_cents: itemTotal,
          components: componentsSnapshot,
        });

        if (itemError) {
          throw new Error(itemError.message);
        }
      }

      const total = subtotal + zone.delivery_fee_cents;

      const { error: totalError } = await supabase
        .from("orders")
        .update({
          subtotal_cents: subtotal,
          total_cents: total,
        })
        .eq("id", order.id);

      if (totalError) {
        throw new Error(totalError.message);
      }

      return {
        data: {
          order_id: order.id,
          subtotal_cents: subtotal,
          total_cents: total,
          reservation_expires_at: expiresAt,
        },
        error: null,
      };
    } catch (error) {
      await supabase.rpc("release_order_reservation", { target_order_id: order.id }).catch(() => undefined);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Could not reserve this cart.",
      };
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Could not reserve this cart.",
    };
  }
}
