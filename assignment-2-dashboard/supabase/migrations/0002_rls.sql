-- Row-Level Security: salespeople only ever see their own vehicles and
-- sales; admins see everything. This is the security boundary the
-- assignment asks us to prove holds — see README.md "Verifying the
-- security boundary" for the exact steps used to test it.

alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.sales enable row level security;

-- security definer + a fixed search_path so this can be called from other
-- tables' RLS policies without re-triggering RLS on profiles (which would
-- otherwise recurse) and without being hijackable via search_path tricks.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ────────────────────────────────────────────────────────────────────────
-- profiles
-- ────────────────────────────────────────────────────────────────────────
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────
-- vehicles
-- ────────────────────────────────────────────────────────────────────────
drop policy if exists "vehicles_select_own_or_admin" on public.vehicles;
create policy "vehicles_select_own_or_admin"
  on public.vehicles for select
  to authenticated
  using (assigned_to = auth.uid() or public.is_admin());

-- Anyone with a profile can list a car; it's assigned to them unless an
-- admin is entering it on someone else's behalf.
drop policy if exists "vehicles_insert_self_or_admin" on public.vehicles;
create policy "vehicles_insert_self_or_admin"
  on public.vehicles for insert
  to authenticated
  with check (assigned_to = auth.uid() or public.is_admin());

drop policy if exists "vehicles_update_own_or_admin" on public.vehicles;
create policy "vehicles_update_own_or_admin"
  on public.vehicles for update
  to authenticated
  using (assigned_to = auth.uid() or public.is_admin())
  with check (assigned_to = auth.uid() or public.is_admin());

drop policy if exists "vehicles_delete_own_or_admin" on public.vehicles;
create policy "vehicles_delete_own_or_admin"
  on public.vehicles for delete
  to authenticated
  using (assigned_to = auth.uid() or public.is_admin());

-- ────────────────────────────────────────────────────────────────────────
-- sales
-- ────────────────────────────────────────────────────────────────────────
drop policy if exists "sales_select_own_or_admin" on public.sales;
create policy "sales_select_own_or_admin"
  on public.sales for select
  to authenticated
  using (salesperson_id = auth.uid() or public.is_admin());

-- You can only record a sale against a car assigned to you (or any car,
-- if you're an admin), and only under your own name.
drop policy if exists "sales_insert_own_vehicle_or_admin" on public.sales;
create policy "sales_insert_own_vehicle_or_admin"
  on public.sales for insert
  to authenticated
  with check (
    salesperson_id = auth.uid()
    and (
      public.is_admin()
      or exists (
        select 1 from public.vehicles v
        where v.id = vehicle_id and v.assigned_to = auth.uid()
      )
    )
  );

-- Sales are financial records — corrections are an admin-only action, not
-- something a salesperson can quietly edit or remove after the fact.
drop policy if exists "sales_update_admin_only" on public.sales;
create policy "sales_update_admin_only"
  on public.sales for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "sales_delete_admin_only" on public.sales;
create policy "sales_delete_admin_only"
  on public.sales for delete
  to authenticated
  using (public.is_admin());
