create table if not exists public.checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  rate_limit_key text not null check (char_length(rate_limit_key) between 16 and 96),
  created_at timestamptz not null default now()
);

create index if not exists checkout_attempts_key_created_idx
on public.checkout_attempts (rate_limit_key, created_at desc);

alter table public.checkout_attempts enable row level security;

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
