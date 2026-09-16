-- Server-computed analytics: the dashboard's charts read from these views
-- instead of pulling every row and reducing it in the browser.
--
-- IMPORTANT: `security_invoker = true` is what makes these views respect
-- the querying user's RLS instead of the view owner's. Without it, a view
-- created by the `postgres` role would quietly see every row regardless of
-- who's asking — a classic way to accidentally leak data past RLS. This is
-- the single most important line in this file.

create or replace view public.monthly_revenue
  with (security_invoker = true) as
select
  date_trunc('month', sale_date)::date as month,
  count(*) as units_sold,
  sum(sale_price) as revenue,
  sum(sale_price - coalesce(v.cost, 0)) as gross_profit
from public.sales s
join public.vehicles v on v.id = s.vehicle_id
group by 1
order by 1;

create or replace view public.inventory_aging
  with (security_invoker = true) as
select
  id,
  make,
  model,
  year,
  price,
  status,
  assigned_to,
  listed_at,
  extract(day from now() - listed_at)::int as days_on_lot
from public.vehicles
where status in ('available', 'pending')
order by days_on_lot desc;

create or replace view public.sales_by_make
  with (security_invoker = true) as
select
  v.make,
  count(*) as units_sold,
  sum(s.sale_price) as revenue
from public.sales s
join public.vehicles v on v.id = s.vehicle_id
group by v.make
order by revenue desc;

-- One-row summary for the dashboard's KPI cards. A function (not a view)
-- because it returns a single record, not a set — the natural shape for
-- "one number per stat" rather than "one row per something".
create or replace function public.dashboard_summary()
returns table (
  total_vehicles bigint,
  available_vehicles bigint,
  total_revenue numeric,
  avg_days_on_lot numeric
)
language sql
security invoker
stable
as $$
  select
    (select count(*) from public.vehicles) as total_vehicles,
    (select count(*) from public.vehicles where status = 'available') as available_vehicles,
    (select coalesce(sum(sale_price), 0) from public.sales) as total_revenue,
    (select coalesce(avg(extract(day from now() - listed_at)), 0)
       from public.vehicles where status in ('available', 'pending')) as avg_days_on_lot;
$$;
