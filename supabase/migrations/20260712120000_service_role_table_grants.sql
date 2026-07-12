-- Fix production checkout/contact: service_role needs table GRANTs under
-- modern Supabase Data API defaults, and contact rate-limit must exist.
-- Run this in Supabase SQL Editor as the project owner (postgres).

begin;

grant usage on schema public to postgres, anon, authenticated, service_role;

-- Table privileges for server-side commerce (service_role bypasses RLS but not GRANTs)
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select, update on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select, update on sequences to service_role;
alter default privileges in schema public
  grant execute on functions to service_role;

-- Public storefront reads
grant select on table public.products to anon, authenticated;
grant select on table public.delivery_zones to anon, authenticated;
grant insert on table public.contact_messages to anon, authenticated;

-- Contact rate limiting (may be missing if launch_hardening was not fully applied)
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
security definer
set search_path = public
as $$
declare
  recent_attempts integer;
begin
  if rate_limit_key is null or char_length(rate_limit_key) < 16 or char_length(rate_limit_key) > 96 then
    raise exception 'Invalid contact rate limit key';
  end if;

  perform pg_advisory_xact_lock(hashtext('contact:' || rate_limit_key)::bigint);

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

-- Checkout rate limit as security definer so it does not depend on invoker table grants
create or replace function public.register_checkout_attempt(rate_limit_key text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_attempts integer;
begin
  if rate_limit_key is null or char_length(rate_limit_key) < 16 or char_length(rate_limit_key) > 96 then
    raise exception 'Invalid checkout rate limit key';
  end if;

  perform pg_advisory_xact_lock(hashtext(rate_limit_key)::bigint);

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

revoke all on function public.register_contact_attempt(text) from public, anon, authenticated;
revoke all on function public.register_checkout_attempt(text) from public, anon, authenticated;
grant execute on function public.register_contact_attempt(text) to service_role;
grant execute on function public.register_checkout_attempt(text) to service_role;

-- Explicit table grants (belt + suspenders for reserve_order internals)
grant select, insert, update, delete on table public.products to service_role;
grant select, insert, update, delete on table public.product_components to service_role;
grant select, insert, update, delete on table public.recipes to service_role;
grant select, insert, update, delete on table public.delivery_zones to service_role;
grant select, insert, update, delete on table public.orders to service_role;
grant select, insert, update, delete on table public.order_items to service_role;
grant select, insert, update, delete on table public.contact_messages to service_role;
grant select, insert, update, delete on table public.contact_attempts to service_role;
grant select, insert, update, delete on table public.checkout_attempts to service_role;
grant select, insert, update, delete on table public.stripe_events to service_role;
grant select, insert, update, delete on table public.admin_profiles to service_role;

commit;
