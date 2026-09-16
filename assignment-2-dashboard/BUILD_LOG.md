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

- **No Docker, no Supabase CLI, no existing Supabase account in this
  environment.** This is the big one — see "Known limitations" below. I
  can't spin up `supabase start` locally (needs Docker) and creating a new
  cloud Supabase account is account-creation, which I don't do on someone
  else's behalf even with permission. Consequence: every SQL file and
  every Supabase query in this repo has been read and re-read for
  correctness, but not executed.
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
- Manually re-read every RLS policy against every query the app issues,
  tracing what a `salesperson` vs an `admin` can and can't do for each of
  select/insert/update/delete on all three tables.
- Confirmed in a real browser that the "Supabase not configured" fallback
  renders correctly with no environment variables set.
- **Did not verify** (see Known limitations): sign-in, CRUD against real
  rows, the RLS boundary actually holding under a live two-user test, or
  the charts rendering real data. The README's "Verifying the security
  boundary" section is written as a script for me (or you) to run once a
  real project exists — not a report of having already run it.

## Known limitations

- **Untested against a live database.** This is the honest, important
  one. Everything here is my best, careful work reading SQL and
  TypeScript rather than watching it run. Standard Supabase/Postgres/RLS
  patterns are well-trodden ground and I'm confident in the approach, but
  "confident" and "verified" are different claims, and I'm not
  overstating which one this is.
- Admins can't reassign an existing vehicle to a different salesperson
  from the edit form — the assignment picker only appears when adding a
  new vehicle. A real version of this app would need that; it just wasn't
  essential to prove the RLS/analytics story for the assessment.
- No pagination on the vehicles/sales tables — fine for a demo dataset,
  would matter at real dealership scale.
- No automated tests. The RLS policies in particular would benefit from a
  small test suite that signs in as two different users and asserts what
  each can and can't see — exactly the manual script in the README, made
  automatic.

## Time spent

- Schema + RLS policy design: ~40 min
- Analytics views + dashboard_summary function: ~20 min
- Next.js/Supabase auth wiring (client/server/middleware helpers): ~25 min
- CRUD pages, forms, Server Actions: ~55 min
- Charts: ~20 min
- Bug fixing (Database types, duplicate route, static-rendering bug): ~30 min
- Docs (README, this log): ~30 min
