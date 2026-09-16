-- Demo data. Run this AFTER creating at least two real auth users (see
-- README.md "A way in" section) — it looks up their ids by email, so
-- create the users first or this will insert nothing.
--
-- Expects two users to already exist:
--   admin@albacars.demo       -> will be promoted to role = 'admin'
--   salesperson@albacars.demo -> stays the default role = 'salesperson'

do $$
declare
  admin_id uuid;
  sales_id uuid;
  v1 uuid; v2 uuid; v3 uuid; v4 uuid; v5 uuid; v6 uuid;
begin
  select id into admin_id from auth.users where email = 'admin@albacars.demo';
  select id into sales_id from auth.users where email = 'salesperson@albacars.demo';

  if admin_id is null or sales_id is null then
    raise exception 'Create admin@albacars.demo and salesperson@albacars.demo in Supabase Auth first (see README), then re-run this seed.';
  end if;

  update public.profiles set role = 'admin', full_name = 'Alba Admin' where id = admin_id;
  update public.profiles set full_name = 'Sam the Salesperson' where id = sales_id;

  -- Available / pending inventory, assigned to the demo salesperson.
  insert into public.vehicles (id, vin, make, model, year, price, cost, status, assigned_to, listed_at)
  values
    (gen_random_uuid(), 'VIN0001', 'Toyota', 'Land Cruiser', 2022, 185000, 150000, 'available', sales_id, now() - interval '4 days'),
    (gen_random_uuid(), 'VIN0002', 'BMW', 'X5', 2021, 210000, 175000, 'available', sales_id, now() - interval '38 days'),
    (gen_random_uuid(), 'VIN0003', 'Mercedes-Benz', 'C-Class', 2023, 165000, 138000, 'pending', sales_id, now() - interval '11 days'),
    (gen_random_uuid(), 'VIN0004', 'Nissan', 'Patrol', 2020, 175000, 145000, 'available', admin_id, now() - interval '61 days')
  returning id into v4;

  -- Already-sold vehicles, so the revenue chart has something to show.
  insert into public.vehicles (id, vin, make, model, year, price, cost, status, assigned_to, listed_at, sold_at)
  values (gen_random_uuid(), 'VIN0005', 'Honda', 'Accord', 2021, 95000, 78000, 'sold', sales_id, now() - interval '70 days', now() - interval '55 days')
  returning id into v5;

  insert into public.vehicles (id, vin, make, model, year, price, cost, status, assigned_to, listed_at, sold_at)
  values (gen_random_uuid(), 'VIN0006', 'Ford', 'Explorer', 2022, 145000, 120000, 'sold', admin_id, now() - interval '40 days', now() - interval '20 days')
  returning id into v6;

  insert into public.sales (vehicle_id, salesperson_id, customer_name, sale_price, sale_date)
  values
    (v5, sales_id, 'Fatima Al Suwaidi', 93000, now() - interval '55 days'),
    (v6, admin_id, 'Rashid Al Marri', 142000, now() - interval '20 days');
end $$;
