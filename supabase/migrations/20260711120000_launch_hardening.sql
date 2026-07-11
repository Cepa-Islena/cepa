-- Launch hardening that does not require new third-party services:
-- - order delivery fields
-- - product ingredients / allergens for storefront honesty
-- - min-order enforcement inside reserve_order
-- - contact rate limiting
-- - inventory-safe order status helper for admin/service role
-- - stale reservation cleanup helper

alter table public.orders
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists delivery_address text,
  add column if not exists delivery_notes text,
  add column if not exists gift_note text;

alter table public.products
  add column if not exists ingredients text[] not null default '{}',
  add column if not exists allergens text[] not null default '{}';

update public.products
set
  ingredients = case slug
    when 'parcha-verde' then array['passion fruit (parcha)', 'leafy greens', 'cucumber', 'lime', 'filtered water']
    when 'acerola-glow' then array['acerola', 'citrus', 'filtered water']
    when 'pina-menta' then array['pineapple', 'mint', 'filtered water']
    when 'tamarindo-root' then array['tamarind', 'root vegetables', 'filtered water']
    when 'jengibre-shot' then array['ginger', 'citrus', 'filtered water']
    when 'mvp-sample-bundle' then array['sample set of current juice and shot flavors']
    else ingredients
  end,
  allergens = case slug
    when 'parcha-verde' then array[]::text[]
    when 'acerola-glow' then array[]::text[]
    when 'pina-menta' then array[]::text[]
    when 'tamarindo-root' then array[]::text[]
    when 'jengibre-shot' then array[]::text[]
    when 'mvp-sample-bundle' then array[]::text[]
    else allergens
  end
where slug in (
  'parcha-verde',
  'acerola-glow',
  'pina-menta',
  'tamarindo-root',
  'jengibre-shot',
  'mvp-sample-bundle'
);

create table if not exists public.contact_attempts (
  id uuid primary key default gen_random_uuid(),
  rate_limit_key text not null check (char_length(rate_limit_key) between 16 and 96),
  created_at timestamptz not null default now()
);

create index if not exists contact_attempts_key_created_idx
on public.contact_attempts (rate_limit_key, created_at desc);

alter table public.contact_attempts enable row level security;

create or replace function public.register_contact_attempt(rate_limit_key text)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  recent_attempts integer;
begin
  if rate_limit_key is null or char_length(rate_limit_key) < 16 or char_length(rate_limit_key) > 96 then
    raise exception 'Invalid contact rate limit key';
  end if;

  perform pg_advisory_xact_lock(hashtext('contact:' || register_contact_attempt.rate_limit_key)::bigint);

  delete from public.contact_attempts
  where created_at < now() - interval '24 hours';

  select count(*) into recent_attempts
  from public.contact_attempts attempts
  where attempts.rate_limit_key = register_contact_attempt.rate_limit_key
    and attempts.created_at >= now() - interval '10 minutes';

  if recent_attempts >= 5 then
    raise exception 'Too many contact messages. Please wait and try again.';
  end if;

  insert into public.contact_attempts (rate_limit_key)
  values (register_contact_attempt.rate_limit_key);

  return recent_attempts + 1;
end;
$$;

drop function if exists public.reserve_order(jsonb, text, text);

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

create or replace function public.admin_set_order_status(
  target_order_id uuid,
  new_status text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  order_record public.orders%rowtype;
begin
  if new_status not in ('cancelled', 'failed', 'fulfilled', 'expired') then
    raise exception 'Admin can only set cancelled, failed, fulfilled, or expired';
  end if;

  select * into order_record
  from public.orders
  where id = target_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if new_status = 'fulfilled' then
    if order_record.status <> 'paid' and order_record.paid_at is null then
      raise exception 'Only paid orders can be marked fulfilled';
    end if;

    update public.orders
    set status = 'fulfilled'
    where id = target_order_id;
    return;
  end if;

  -- cancelled / failed / expired: release reserved capacity when still unpaid
  if order_record.paid_at is null and order_record.released_at is null
    and order_record.status in ('reserved', 'checkout_created', 'failed', 'expired', 'cancelled') then
    perform public.release_order_reservation(target_order_id);
  end if;

  update public.orders
  set status = new_status
  where id = target_order_id
    and paid_at is null;
end;
$$;

create or replace function public.expire_stale_reservations()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  stale_order record;
  expired_count integer := 0;
begin
  for stale_order in
    select id
    from public.orders
    where status in ('reserved', 'checkout_created')
      and paid_at is null
      and released_at is null
      and reservation_expires_at < now()
  loop
    perform public.release_order_reservation(stale_order.id);
    expired_count := expired_count + 1;
  end loop;

  return expired_count;
end;
$$;

revoke all on function public.register_contact_attempt(text) from public, anon, authenticated;
revoke all on function public.reserve_order(jsonb, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_set_order_status(uuid, text) from public, anon, authenticated;
revoke all on function public.expire_stale_reservations() from public, anon, authenticated;

grant execute on function public.register_contact_attempt(text) to service_role;
grant execute on function public.reserve_order(jsonb, text, text, text, text, text, text, text) to service_role;
grant execute on function public.admin_set_order_status(uuid, text) to service_role;
grant execute on function public.expire_stale_reservations() to service_role;
