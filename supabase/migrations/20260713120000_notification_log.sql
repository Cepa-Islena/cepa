-- Idempotent outbound notification log (owner/customer emails, etc.)
create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  reference_id text not null,
  recipient text not null,
  provider text not null default 'resend',
  provider_message_id text,
  status text not null default 'sent',
  error text,
  created_at timestamptz not null default now(),
  unique (kind, reference_id)
);

alter table public.notification_log enable row level security;

revoke all on table public.notification_log from public, anon, authenticated;
grant all on table public.notification_log to service_role;

comment on table public.notification_log is 'Outbound notification dedupe log for order/contact emails.';
