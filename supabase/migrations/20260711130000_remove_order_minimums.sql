-- No order/delivery minimum for MVP testing and small orders.
update public.delivery_zones
set min_order_cents = 0;

-- Keep reserve_order free of minimum checks even if an older launch migration applied them.
create or replace function public.reserve_order(
  cart_items jsonb,
  delivery_pueblo text,
  customer_email text default null,
  customer_name text default null,
  customer_phone text default null,
  delivery_address text default null,
  delivery_notes text default null,
  gift_note text default null
)
returns table(order_id uuid, subtotal_cents integer, total_cents integer, reservation_expires_at timestamptz)
language plpgsql
set search_path = ''
as $$
declare
  order_record public.orders%rowtype;
  cart_item jsonb;
  product_record public.products%rowtype;
  component_record record;
  item_quantity integer;
  item_total integer;
  components_snapshot jsonb;
  zone_record public.delivery_zones%rowtype;
begin
  if jsonb_typeof(cart_items) <> 'array' or jsonb_array_length(cart_items) = 0 then
    raise exception 'Cart must contain at least one item';
  end if;

  if jsonb_array_length(cart_items) > 20 then
    raise exception 'Cart contains too many line items';
  end if;

  if customer_name is null or char_length(btrim(customer_name)) < 1 or char_length(customer_name) > 120 then
    raise exception 'Customer name is required';
  end if;

  if customer_phone is null or char_length(btrim(customer_phone)) < 7 or char_length(customer_phone) > 40 then
    raise exception 'Customer phone is required';
  end if;

  if delivery_address is null or char_length(btrim(delivery_address)) < 5 or char_length(delivery_address) > 240 then
    raise exception 'Delivery address is required';
  end if;

  if delivery_notes is not null and char_length(delivery_notes) > 500 then
    raise exception 'Delivery notes are too long';
  end if;

  if gift_note is not null and char_length(gift_note) > 280 then
    raise exception 'Gift note is too long';
  end if;

  select * into zone_record
  from public.delivery_zones
  where lower(pueblo) = lower(delivery_pueblo)
    and active = true;

  if not found then
    raise exception 'Delivery zone is not active';
  end if;

  insert into public.orders (
    status,
    customer_email,
    customer_name,
    customer_phone,
    delivery_address,
    delivery_notes,
    gift_note,
    delivery_pueblo,
    subtotal_cents,
    delivery_fee_cents,
    total_cents,
    reservation_expires_at
  )
  values (
    'reserved',
    nullif(btrim(customer_email), ''),
    btrim(customer_name),
    btrim(customer_phone),
    btrim(delivery_address),
    nullif(btrim(coalesce(delivery_notes, '')), ''),
    nullif(btrim(coalesce(gift_note, '')), ''),
    zone_record.pueblo,
    0,
    zone_record.delivery_fee_cents,
    zone_record.delivery_fee_cents,
    now() + interval '30 minutes'
  )
  returning * into order_record;

  for cart_item in select * from jsonb_array_elements(cart_items)
  loop
    item_quantity := coalesce((cart_item ->> 'quantity')::integer, 0);

    if item_quantity < 1 or item_quantity > 24 then
      raise exception 'Invalid quantity';
    end if;

    select * into product_record
    from public.products
    where slug = cart_item ->> 'productSlug'
      and active = true;

    if not found then
      raise exception 'Product is not active';
    end if;

    components_snapshot := '[]'::jsonb;

    for component_record in
      select
        r.id as recipe_id,
        r.slug as recipe_slug,
        r.name as recipe_name,
        r.total_capacity_oz,
        r.reserved_capacity_oz,
        r.sold_capacity_oz,
        pc.ounces
      from public.product_components pc
      join public.recipes r on r.id = pc.recipe_id
      where pc.product_id = product_record.id
      for update of r
    loop
      if component_record.total_capacity_oz - component_record.reserved_capacity_oz - component_record.sold_capacity_oz
        < component_record.ounces * item_quantity then
        raise exception 'Not enough capacity for %', component_record.recipe_name;
      end if;

      update public.recipes
      set reserved_capacity_oz = reserved_capacity_oz + component_record.ounces * item_quantity
      where id = component_record.recipe_id;

      components_snapshot := components_snapshot || jsonb_build_object(
        'recipeSlug', component_record.recipe_slug,
        'recipeName', component_record.recipe_name,
        'ounces', component_record.ounces,
        'reservedOunces', component_record.ounces * item_quantity
      );
    end loop;

    if product_record.kind <> 'addon' and jsonb_array_length(components_snapshot) = 0 then
      raise exception 'Product has no recipe components';
    end if;

    item_total := product_record.price_cents * item_quantity;

    insert into public.order_items (
      order_id,
      product_id,
      product_slug,
      product_name,
      quantity,
      unit_amount_cents,
      total_amount_cents,
      components
    )
    values (
      order_record.id,
      product_record.id,
      product_record.slug,
      product_record.name,
      item_quantity,
      product_record.price_cents,
      item_total,
      components_snapshot
    );

    update public.orders
    set subtotal_cents = subtotal_cents + item_total,
      total_cents = total_cents + item_total
    where id = order_record.id;
  end loop;

  return query
  select orders.id, orders.subtotal_cents, orders.total_cents, orders.reservation_expires_at
  from public.orders
  where id = order_record.id;
end;
$$;

revoke all on function public.reserve_order(jsonb, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.reserve_order(jsonb, text, text, text, text, text, text, text) to service_role;
