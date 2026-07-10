-- POS Rescue: Merchants table.
-- Zero per-transaction storage is the compliance moat — no transaction tables here.
-- Every merchant connects their OWN Stripe Standard account via OAuth.
-- The service simply generates a Stripe Checkout Session for each rescue; funds flow
-- directly to the merchant's Stripe account. We never touch the money.

create table if not exists public.merchants (
  id                uuid primary key default gen_random_uuid(),
  email             text not null,
  business_name     text not null default '',
  vat_number        text not null default '',
  tax_rate_pct      numeric(5,2) not null default 0,
  stripe_account_id text,
  plan              text not null default 'free',
  armed_until       timestamptz,
  created_at        timestamptz not null default now()
);

-- Each merchant row is owned by exactly one auth user.
alter table public.merchants add column if not exists owner_id uuid references auth.users(id) on delete cascade;
create unique index if not exists merchants_owner_idx on public.merchants(owner_id);

alter table public.merchants enable row level security;

-- Owner full control over their own merchant record.
drop policy if exists merchants_owner_all on public.merchants;
create policy merchants_owner_all on public.merchants
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Service role can insert/update (for the OAuth callback handler).
-- Service role bypasses RLS, so no explicit policy needed for that path.