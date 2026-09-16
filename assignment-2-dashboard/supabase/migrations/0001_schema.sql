-- Alba Cars Dealership Dashboard — core schema
-- Run this once against a fresh Supabase project (SQL Editor, or
-- `supabase db push` if you're using the CLI). Safe to re-run: everything
-- is guarded with IF NOT EXISTS / OR REPLACE.

-- ────────────────────────────────────────────────────────────────────────
-- Extensions
-- ────────────────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────────────────────────
-- Tables
-- ────────────────────────────────────────────────────────────────────────

-- One row per auth.users row, added by the trigger below. Holds the role
-- that drives every RLS policy in this schema.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'salesperson')) default 'salesperson',
  created_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  vin text unique,
  make text not null,
  model text not null,
  year int not null check (year between 1980 and 2100),
  price numeric(10, 2) not null check (price >= 0),
  cost numeric(10, 2) check (cost >= 0),
  status text not null check (status in ('available', 'pending', 'sold')) default 'available',
  assigned_to uuid references public.profiles (id) on delete set null,
  listed_at timestamptz not null default now(),
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null unique references public.vehicles (id) on delete cascade,
  salesperson_id uuid not null references public.profiles (id),
  customer_name text not null,
  sale_price numeric(10, 2) not null check (sale_price >= 0),
  sale_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists vehicles_assigned_to_idx on public.vehicles (assigned_to);
create index if not exists vehicles_status_idx on public.vehicles (status);
create index if not exists sales_salesperson_id_idx on public.sales (salesperson_id);
create index if not exists sales_sale_date_idx on public.sales (sale_date);

-- ────────────────────────────────────────────────────────────────────────
-- Keep updated_at current
-- ────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vehicles_set_updated_at on public.vehicles;
create trigger vehicles_set_updated_at
  before update on public.vehicles
  for each row
  execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────
-- New auth users automatically get a profile row.
-- Role defaults to 'salesperson' — promote to 'admin' manually in the
-- table editor for whichever account should manage everything.
-- ────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'salesperson'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Selling a vehicle keeps its status in sync automatically, so the UI
-- never has to remember to set both rows itself.
create or replace function public.mark_vehicle_sold()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.vehicles
  set status = 'sold', sold_at = new.sale_date
  where id = new.vehicle_id;
  return new;
end;
$$;

drop trigger if exists on_sale_created on public.sales;
create trigger on_sale_created
  after insert on public.sales
  for each row
  execute function public.mark_vehicle_sold();
