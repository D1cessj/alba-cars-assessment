# Build Log: Assignment 2 — Alba Cars Dealership Dashboard

## Goal & scope decision

Built an inventory & sales dashboard for a car dealership on Supabase —
chosen over the brief's other example topics (expense tracker, habit
tracker, CRM) because "inventory manager" is one of their own suggested
topics and it's obviously the actual business Alba Cars runs. Two related
entities (`vehicles`, `sales`) plus `profiles` for role-based access, which
gives real relational structure instead of one flat table.

Deliberately left out: file storage for vehicle photos (would've been an
easy third advanced option, but RLS + server-computed analytics already
covers "auth + RLS + one more" and a third feature wasn't needed to hit
the bar), a proper Kanban-style drag-and-drop status change (a click-based
status change does the same job with far less code), and real-time
subscriptions (a legitimate advanced option here, but I judged
RLS-with-a-verified-proof + real SQL views as the stronger, more defensible
pair to actually finish well rather than spreading across three).

## Stack & tooling

- **Next.js 16** (App Router, Server Actions, Server Components).
- **Supabase**: Postgres + Auth + Row Level Security. Chosen specifically
  because it's real SQL — the assignment wants a documented relational
  schema, and RLS-as-a-Postgres-feature is a stronger, more literal
  "security boundary" story than an application-layer permission check.
- **Recharts** for the two charts.
- **Tailwind CSS v4**.
- AI assistance: used throughout for scaffolding, SQL, and React code —
  see "Known limitations" for exactly where that intersects with what I
  could and couldn't verify myself.

## Key decisions & trade-offs

- **`security_invoker = true` on every analytics view.** This is the
  single most important line in the whole schema and easy to miss
  entirely: without it, a view owned by the `postgres` role runs with the
  owner's permissions against the underlying tables, not the caller's —
  meaning an analytics view can silently leak every row past RLS even
  though the base tables are locked down correctly. Trade-off: none,
  really — this should be the default choice for any view sitting on top
  of RLS-protected tables.
- **A `security definer` `is_admin()` helper instead of inline role checks
  in every policy.** A naive policy on `profiles` that queries `profiles`
  to check the caller's role recurses into itself. The helper function
  breaks that cycle and keeps every other table's policy readable as one
  line instead of a repeated subquery.
- **Sales are insert-once, admin-corrects.** A salesperson can record a
  sale but not edit or delete it afterward — only an admin can. Trade-off:
  a salesperson who makes a data-entry mistake has to ask an admin to fix
  it, which is mildly annoying but matches how a real dealership would
  want financial records to work (an audit trail, not something anyone can
  quietly rewrite).
- **Server Actions instead of a client-side Supabase calls for every
  mutation.** Keeps all the insert/update/delete logic in one place
  (`vehicles/actions.ts`), server-side, with a consistent
  `{ error: string | null }` return shape the UI can render directly —
  rather than scattering `try/catch` around `supabase.from(...)` calls in
  client components.
- **Two SQL views + one summary function, not four separate queries
  crunched in the browser.** Directly the assignment's "server-computed
  analytics" option, and genuinely simpler than the client-side
  alternative — `dashboard_summary()` is one round trip for four numbers
  instead of fetching every vehicle and sale and reducing them in
  JavaScript.

## Hard parts / dead ends

- **A migration can report success without actually running.** The
  Supabase SQL Editor pops a confirmation dialog for statements it
  classifies as destructive (this includes `alter table ... enable row
  level security`, and apparently most multi-statement DDL scripts) — if
  that dialog isn't explicitly confirmed, the query never executes, but
  the results pane keeps showing whatever the *previous* successful query
  displayed. `0002_rls.sql` (RLS + policies) and `0003_analytics_views.sql`
  (views + `dashboard_summary`) both silently no-opped this way the first
  time — the editor showed "Success. No rows returned" for both, which
  was actually stale output left over from `0001_schema.sql`. This stayed
  invisible until the live app was actually clicked through: the Overview
  KPIs read 0 across the board (the `dashboard_summary` RPC was a genuine
  404 — the function didn't exist), and a signed-in salesperson could see
  every vehicle and the full revenue figure instead of just her own,
  because RLS had never actually been turned on (`relrowsecurity` was
  `false` on all three tables, `pg_policies` was empty). Both fixed by
  re-running the migrations and this time explicitly clicking "Run query"
  on the confirmation dialog, then verifying against `pg_class`,
  `pg_policies`, and `pg_proc` directly instead of trusting the results
  pane's text.
- **A `RETURNING INTO` bug in `seed.sql`.** The first insert into
  `vehicles` adds four rows in one statement but had `returning id into
  v4` tacked on — a scalar `INTO` on a multi-row `RETURNING` throws
  `P0003: query returned more than one row`. `v4` wasn't even used
  anywhere else in the script. Fixed by dropping the `RETURNING INTO`
  (and the unused `v1`–`v4` variables) from that insert entirely, since
  only the two single-row inserts further down actually need their id
  captured.
- **Hand-writing `Database` types instead of `supabase gen types`.**
  Without a live project there's nothing to generate types from. My first
  attempt was missing the `Relationships`, `Enums`, and `CompositeTypes`
  fields that real generated types include — `@supabase/supabase-js`'s
  generics silently fell back to `never` for every `Row`/`Insert` type
  without them, which showed up as a wall of confusing TypeScript errors
  (`Object literal may only specify known properties, and 'make' does not
  exist in type 'never[]'`) that had nothing obviously to do with the real
  cause. Fixed by matching the real generated shape exactly.
- **A leftover scaffolded `src/app/page.tsx` silently won the `/` route**
  over my actual dashboard page at `src/app/(dashboard)/page.tsx` — both
  resolve to the same URL, and Next.js picked the ungrouped file instead
  of erroring on the conflict. Caught by actually reading `next build`'s
  route table (`○ /` — static — for a page that should never be static)
  rather than assuming a clean build meant a correct one. Deleted the
  leftover file.
- **`/` was building as a static page even after that fix**, until I
  added `export const dynamic = "force-dynamic"` to the dashboard layout.
  Next's static-generation pass doesn't automatically treat "this page
  calls `cookies()` two function calls away" as disqualifying it from
  static rendering the way I expected — for an authenticated,
  per-user-RLS-scoped dashboard, that would have meant every visitor
  getting the same cached build-time snapshot. Worth explicitly checking
  the build output's route table (`ƒ` vs `○`) on any Next.js + Supabase
  Auth app, not assuming it's handled automatically.

## How I verified it works

- `npm run build` and `npm run lint`: clean, zero errors, zero warnings —
  including the type-check pass, which caught the Database-types issue
  above.
- Provisioned a real Supabase project (`alba-cars-dashboard`), ran all
  three migrations and the seed script against it, created the two demo
  auth users, and populated `.env.local` with the real project URL and
  publishable key.
- Ran the app locally (`npm run dev`) and clicked through it as both demo
  accounts: signed in as admin (Overview/Inventory/Sales all showed real
  seeded data), marked a vehicle sold end-to-end and watched the sale
  appear on `/sales` and the revenue KPI update immediately, then signed
  in as the salesperson and confirmed she saw only her own 4 vehicles and
  her one AED 93,000 sale — not the admin's 6 vehicles or AED 417,000.
- This live run is what surfaced the two real bugs above (the silently
  skipped RLS/analytics migrations, and the seed script's `RETURNING
  INTO` error) — neither was visible from reading the SQL alone, which is
  exactly why "reviewed carefully" and "verified" needed to stop being
  treated as the same claim for this assignment.

## Known limitations

- No automated tests. The RLS policies in particular would benefit from a
  small test suite that signs in as two different users and asserts what
  each can and can't see — the manual script in the README, made
  automatic. This matters more than usual here, since the RLS bug above
  is exactly the kind of regression a signed-in-as-both-roles test would
  catch instantly instead of needing a manual click-through to notice.
- Admins can't reassign an existing vehicle to a different salesperson
  from the edit form — the assignment picker only appears when adding a
  new vehicle. A real version of this app would need that; it just wasn't
  essential to prove the RLS/analytics story for the assessment.
- No pagination on the vehicles/sales tables — fine for a demo dataset,
  would matter at real dealership scale.

## Time spent

- Schema + RLS policy design: ~40 min
- Analytics views + dashboard_summary function: ~20 min
- Next.js/Supabase auth wiring (client/server/middleware helpers): ~25 min
- CRUD pages, forms, Server Actions: ~55 min
- Charts: ~20 min
- Bug fixing (Database types, duplicate route, static-rendering bug): ~30 min
- Live provisioning (Supabase project, running migrations/seed, demo
  users, `.env.local`) and end-to-end click-through as both roles: ~35 min
- Debugging the silently-skipped-migration and seed script bugs found
  during that live run: ~20 min
- Docs (README, this log): ~35 min
