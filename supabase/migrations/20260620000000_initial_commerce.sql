create extension if not exists pgcrypto;

create schema if not exists private;

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  total_capacity_oz integer not null check (total_capacity_oz >= 0),
  reserved_capacity_oz integer not null default 0 check (reserved_capacity_oz >= 0),
  sold_capacity_oz integer not null default 0 check (sold_capacity_oz >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (reserved_capacity_oz + sold_capacity_oz <= total_capacity_oz)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind text not null check (kind in ('juice', 'shot', 'bundle', 'addon')),
  size_label text not null,
  unit_ounces integer check (unit_ounces > 0),
  price_cents integer not null check (price_cents >= 0),
  active boolean not null default true,
  image_path text not null,
  color text not null,
  short text not null,
  description text not null,
  tags text[] not null default '{}',
  nutrients text[] not null default '{}',
  taste text,
  testimonial text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_components (
  product_id uuid not null references public.products(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete restrict,
  ounces integer not null check (ounces > 0),
  primary key (product_id, recipe_id)
);

create table public.delivery_zones (
  pueblo text primary key,
  active boolean not null default true,
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  min_order_cents integer not null default 0 check (min_order_cents >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'reserved' check (
    status in ('reserved', 'checkout_created', 'paid', 'cancelled', 'expired', 'failed', 'fulfilled')
  ),
  stripe_checkout_session_id text unique,
  customer_email text,
  delivery_pueblo text references public.delivery_zones(pueblo),
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  reservation_expires_at timestamptz not null default (now() + interval '30 minutes'),
  paid_at timestamptz,
  released_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_slug text not null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_amount_cents integer not null check (unit_amount_cents >= 0),
  total_amount_cents integer not null check (total_amount_cents >= 0),
  components jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'owner')),
  created_at timestamptz not null default now()
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  topic text not null check (topic in ('events', 'outside-metro', 'general')),
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  created_at timestamptz not null default now()
);

create table public.stripe_events (
  id text primary key,
  type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create table public.checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  rate_limit_key text not null check (char_length(rate_limit_key) between 16 and 96),
  created_at timestamptz not null default now()
);

create index recipes_active_slug_idx on public.recipes (active, slug);
create index products_active_kind_sort_idx on public.products (active, kind, sort_order);
create index product_components_recipe_idx on public.product_components (recipe_id);
create index orders_status_created_idx on public.orders (status, created_at desc);
create index orders_stripe_session_idx on public.orders (stripe_checkout_session_id);
create index order_items_order_idx on public.order_items (order_id);
create index contact_messages_status_created_idx on public.contact_messages (status, created_at desc);
create index stripe_events_type_received_idx on public.stripe_events (type, received_at desc);
create index checkout_attempts_key_created_idx on public.checkout_attempts (rate_limit_key, created_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger recipes_set_updated_at
before update on public.recipes
for each row execute function private.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function private.set_updated_at();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function private.set_updated_at();

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_profiles
    where user_id = auth.uid()
      and role in ('admin', 'owner')
  );
$$;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

alter table public.recipes enable row level security;
alter table public.products enable row level security;
alter table public.product_components enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.contact_messages enable row level security;
alter table public.stripe_events enable row level security;
alter table public.checkout_attempts enable row level security;

grant select on public.products to anon, authenticated;
grant select on public.delivery_zones to anon, authenticated;
grant insert on public.contact_messages to anon, authenticated;
grant select, insert, update, delete on public.recipes to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.product_components to authenticated;
grant select, insert, update, delete on public.delivery_zones to authenticated;
grant select, update on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select, update on public.contact_messages to authenticated;
grant select on public.stripe_events to authenticated;
grant select on public.admin_profiles to authenticated;

create policy "Active products are public"
on public.products
for select
to anon, authenticated
using (active = true);

create policy "Active delivery zones are public"
on public.delivery_zones
for select
to anon, authenticated
using (active = true);

create policy "Anyone can create contact messages"
on public.contact_messages
for insert
to anon, authenticated
with check (
  char_length(name) between 1 and 120
  and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  and char_length(message) between 1 and 2000
);

create policy "Admins can manage recipes"
on public.recipes
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "Admins can manage products"
on public.products
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "Admins can manage product components"
on public.product_components
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "Admins can manage delivery zones"
on public.delivery_zones
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "Admins can read and update orders"
on public.orders
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "Admins can read order items"
on public.order_items
for select
to authenticated
using (private.is_admin());

create policy "Admins can read and update contact messages"
on public.contact_messages
for select
to authenticated
using (private.is_admin());

create policy "Admins can update contact messages"
on public.contact_messages
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "Admins can read Stripe events"
on public.stripe_events
for select
to authenticated
using (private.is_admin());

create policy "Admins can read admin profiles"
on public.admin_profiles
for select
to authenticated
using (private.is_admin() or user_id = auth.uid());

create or replace function public.register_checkout_attempt(rate_limit_key text)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  recent_attempts integer;
begin
  if rate_limit_key is null or char_length(rate_limit_key) < 16 or char_length(rate_limit_key) > 96 then
    raise exception 'Invalid checkout rate limit key';
  end if;

  perform pg_advisory_xact_lock(hashtext(register_checkout_attempt.rate_limit_key)::bigint);

  delete from public.checkout_attempts
  where created_at < now() - interval '24 hours';

  select count(*) into recent_attempts
  from public.checkout_attempts attempts
  where attempts.rate_limit_key = register_checkout_attempt.rate_limit_key
    and attempts.created_at >= now() - interval '10 minutes';

  if recent_attempts >= 8 then
    raise exception 'Too many checkout attempts. Please wait and try again.';
  end if;

  insert into public.checkout_attempts (rate_limit_key)
  values (register_checkout_attempt.rate_limit_key);

  return recent_attempts + 1;
end;
$$;

create or replace function public.reserve_order(
  cart_items jsonb,
  delivery_pueblo text,
  customer_email text default null
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
    delivery_pueblo,
    subtotal_cents,
    delivery_fee_cents,
    total_cents,
    reservation_expires_at
  )
  values (
    'reserved',
    nullif(customer_email, ''),
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

create or replace function public.release_order_reservation(target_order_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  order_record public.orders%rowtype;
  item_record record;
  component jsonb;
begin
  update public.orders
  set status = 'expired',
    released_at = now()
  where id = target_order_id
    and status in ('reserved', 'checkout_created', 'failed', 'expired')
    and paid_at is null
    and released_at is null
  returning * into order_record;

  if not found then
    return;
  end if;

  for item_record in
    select oi.*
    from public.order_items oi
    where oi.order_id = order_record.id
  loop
    for component in select * from jsonb_array_elements(item_record.components)
    loop
      update public.recipes
      set reserved_capacity_oz = greatest(reserved_capacity_oz - (component ->> 'reservedOunces')::integer, 0)
      where slug = component ->> 'recipeSlug';
    end loop;
  end loop;
end;
$$;

create or replace function public.mark_order_paid(target_order_id uuid, checkout_session_id text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  order_record public.orders%rowtype;
  item_record record;
  component jsonb;
begin
  update public.orders
  set status = 'paid',
    stripe_checkout_session_id = coalesce(public.orders.stripe_checkout_session_id, checkout_session_id),
    paid_at = now()
  where id = target_order_id
    and status in ('reserved', 'checkout_created')
    and paid_at is null
    and released_at is null
  returning * into order_record;

  if not found then
    return;
  end if;

  for item_record in
    select oi.*
    from public.order_items oi
    where oi.order_id = order_record.id
  loop
    for component in select * from jsonb_array_elements(item_record.components)
    loop
      update public.recipes
      set reserved_capacity_oz = greatest(reserved_capacity_oz - (component ->> 'reservedOunces')::integer, 0),
        sold_capacity_oz = sold_capacity_oz + (component ->> 'reservedOunces')::integer
      where slug = component ->> 'recipeSlug';
    end loop;
  end loop;
end;
$$;

revoke all on function public.register_checkout_attempt(text) from public, anon, authenticated;
revoke all on function public.reserve_order(jsonb, text, text) from public, anon, authenticated;
revoke all on function public.release_order_reservation(uuid) from public, anon, authenticated;
revoke all on function public.mark_order_paid(uuid, text) from public, anon, authenticated;
grant execute on function public.register_checkout_attempt(text) to service_role;
grant execute on function public.reserve_order(jsonb, text, text) to service_role;
grant execute on function public.release_order_reservation(uuid) to service_role;
grant execute on function public.mark_order_paid(uuid, text) to service_role;

insert into public.recipes (slug, name, total_capacity_oz)
values
  ('parcha-verde', 'Parcha Verde', 1600),
  ('acerola-glow', 'Acerola Glow', 1600),
  ('pina-menta', 'Pina Menta', 1600),
  ('tamarindo-root', 'Tamarindo Root', 1600),
  ('jengibre-shot', 'Jengibre Shot', 500)
on conflict (slug) do nothing;

insert into public.products (
  slug,
  name,
  kind,
  size_label,
  unit_ounces,
  price_cents,
  image_path,
  color,
  short,
  description,
  tags,
  nutrients,
  taste,
  testimonial,
  sort_order
)
values
  ('parcha-verde', 'Parcha Verde', 'juice', '16 oz bottle', 16, 900, '/brand/product-parcha.png', '#CACD3A', 'Bright parcha, greens, and a little island sun.', 'A made-to-order green juice with parcha energy and a clean finish.', array['cold pressed', '100% natural', '100 bottles'], array['greens', 'hydration', 'vitamin C'], 'tropical, bright, lightly tart', 'This one tastes like a morning walk in Santurce.', 10),
  ('acerola-glow', 'Acerola Glow', 'juice', '16 oz bottle', 16, 900, '/brand/product-acerola.png', '#FFBBD7', 'Acerola, citrus, and that fresh morning kick.', 'Tart, juicy, and made for the days that need a little glow.', array['vitamin C', 'sin azúcar añadida', '100 bottles'], array['vitamin C', 'antioxidants', 'glow'], 'tart, citrusy, juicy', 'Acerola Glow is my weekly reset. Acidito and fresh.', 20),
  ('pina-menta', 'Pina Menta', 'juice', '16 oz bottle', 16, 900, '/brand/product-pina.png', '#9BB9FF', 'Pina, mint, and a beach-day kind of fresh.', 'A cooling juice for hot days, made fresh by drop.', array['refreshing', 'shake well', '100 bottles'], array['refresh', 'digestion', 'cooling'], 'sweet, minty, cooling', 'The one I want after the beach. Super fresh.', 30),
  ('tamarindo-root', 'Tamarindo Root', 'juice', '16 oz bottle', 16, 900, '/brand/product-tamarindo.png', '#CDA680', 'Tamarindo, roots, and deep island flavor.', 'Earthy, bright, and not trying to taste like everybody else.', array['made to order', 'local flavor', '100 bottles'], array['roots', 'minerals', 'energy'], 'earthy, tangy, deep', 'Not basic at all. Tamarindo Root has personality.', 40),
  ('jengibre-shot', 'Jengibre Shot', 'shot', '2 oz shot', 2, 400, '/brand/product-jengibre.png', '#F4F2E9', 'Pica sabrosito. Ginger, citrus, and no drama.', 'A small but serious shot for your daily reset.', array['immune shot', '250 shots', 'cold pressed'], array['immune', 'ginger', 'kick'], 'spicy, citrusy, direct', 'Pica sabrosito, pero in the best way.', 50),
  ('mvp-sample-bundle', 'MVP Sample Bundle', 'bundle', '5 x 4 oz bottles', null, 2200, '/brand/product-vasito.png', '#4B63DA', 'All launch flavors in one 4 oz tasting pack.', 'One cart item, every MVP flavor. Perfect para probar el corillo completo.', array['one SKU', '4 oz samples', 'best for first timers'], array['discovery', 'variety', 'starter pack'], 'all MVP flavors', 'Perfect when you do not know your favorite yet.', 60),
  ('delivery-note', 'Gift note', 'addon', 'card', null, 200, '/brand/corillo-pulpa-scene.png', '#F4F2E9', 'A little note for the delivery bag.', 'For gifting, thanking, or sending un carinito.', array['add-on'], '{}', null, null, 70),
  ('reusable-bag', 'Reusable tote', 'addon', 'merch', null, 1600, '/brand/corillo-logo-scene.png', '#CACD3A', 'Cepa tote for market runs and bottle hauls.', 'An easy add-on for pickup or delivery.', array['add-on'], '{}', null, null, 80)
on conflict (slug) do nothing;

insert into public.product_components (product_id, recipe_id, ounces)
select p.id, r.id, 16
from public.products p
join public.recipes r on r.slug = p.slug
where p.slug in ('parcha-verde', 'acerola-glow', 'pina-menta', 'tamarindo-root')
on conflict do nothing;

insert into public.product_components (product_id, recipe_id, ounces)
select p.id, r.id, 2
from public.products p
join public.recipes r on r.slug = 'jengibre-shot'
where p.slug = 'jengibre-shot'
on conflict do nothing;

insert into public.product_components (product_id, recipe_id, ounces)
select p.id, r.id, case when r.slug = 'jengibre-shot' then 2 else 4 end
from public.products p
cross join public.recipes r
where p.slug = 'mvp-sample-bundle'
on conflict do nothing;

insert into public.delivery_zones (pueblo, active, delivery_fee_cents, min_order_cents, notes)
values
  ('San Juan', true, 0, 0, 'First delivery zone'),
  ('Guaynabo', true, 0, 0, 'First delivery zone'),
  ('Bayamon', true, 0, 0, 'First delivery zone'),
  ('Carolina', true, 0, 0, 'First delivery zone'),
  ('Trujillo Alto', true, 0, 0, 'First delivery zone'),
  ('Catano', true, 0, 0, 'First delivery zone')
on conflict (pueblo) do nothing;
