create extension if not exists "pgcrypto";

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text unique not null,
  full_name text,
  base_currency text not null default 'INR',
  timezone text not null default 'Asia/Calcutta',
  created_at timestamptz not null default now()
);

create table if not exists public.email_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  provider text not null check (provider in ('gmail')),
  external_email text not null,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  watch_expiration_at timestamptz,
  last_history_id text,
  sync_status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (provider, external_email)
);

create table if not exists public.ingestion_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_account_identifier text not null,
  payload jsonb not null,
  processing_status text not null default 'queued',
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.category_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  rule_name text not null,
  merchant_pattern text,
  sender_pattern text,
  amount_min numeric(12,2),
  amount_max numeric(12,2),
  assign_category text,
  assign_direction text,
  assign_account_label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  source_type text not null,
  source_message_id text not null,
  fingerprint text not null unique,
  direction text not null check (direction in ('expense', 'income', 'refund', 'transfer')),
  amount numeric(12,2) not null,
  currency text not null,
  merchant text,
  category text,
  payment_method text,
  account_label text,
  transaction_at timestamptz not null,
  reference_number text,
  description text,
  confidence_score numeric(4,3),
  review_status text not null default 'accepted',
  raw_extraction jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx on public.transactions (user_id, transaction_at desc);
create index if not exists transactions_category_idx on public.transactions (user_id, category);
create index if not exists ingestion_events_status_idx on public.ingestion_events (processing_status, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_transactions_updated_at on public.transactions;
create trigger set_transactions_updated_at
before update on public.transactions
for each row
execute function public.set_updated_at();

create or replace function public.dashboard_summary(target_user_id uuid)
returns table (
  total_spend numeric,
  total_income numeric,
  net_cashflow numeric,
  transaction_count bigint,
  flagged_count bigint
)
language sql
security definer
as $$
  select
    coalesce(sum(case when direction = 'expense' then amount else 0 end), 0) as total_spend,
    coalesce(sum(case when direction in ('income', 'refund') then amount else 0 end), 0) as total_income,
    coalesce(sum(case when direction in ('income', 'refund') then amount else -amount end), 0) as net_cashflow,
    count(*) as transaction_count,
    count(*) filter (where confidence_score < 0.75 or review_status <> 'accepted') as flagged_count
  from public.transactions
  where user_id = target_user_id;
$$;

alter table public.user_profiles enable row level security;
alter table public.email_accounts enable row level security;
alter table public.category_rules enable row level security;
alter table public.transactions enable row level security;

create policy "Users can read own profile"
on public.user_profiles
for select
using (auth.uid() = auth_user_id);

create policy "Users can read own accounts"
on public.email_accounts
for select
using (
  exists (
    select 1
    from public.user_profiles up
    where up.id = email_accounts.user_id
      and up.auth_user_id = auth.uid()
  )
);

create policy "Users can manage own rules"
on public.category_rules
for all
using (
  exists (
    select 1
    from public.user_profiles up
    where up.id = category_rules.user_id
      and up.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.id = category_rules.user_id
      and up.auth_user_id = auth.uid()
  )
);

create policy "Users can read own transactions"
on public.transactions
for select
using (
  exists (
    select 1
    from public.user_profiles up
    where up.id = transactions.user_id
      and up.auth_user_id = auth.uid()
  )
);
