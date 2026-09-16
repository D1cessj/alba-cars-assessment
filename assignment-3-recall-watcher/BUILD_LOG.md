# Build Log: Assignment 3 — Vehicle Recall Watcher & Digest

## Goal & scope decision

Built a daily automation that cross-checks Alba Cars' inventory against
NHTSA's public vehicle recall database, chosen over the brief's other
example ideas (a lead-follow-up reminder, a review-request sender)
because it's the one that's actually load-bearing for a dealership —
missing a real recall is a liability and a customer-trust problem in a
way a delayed follow-up email isn't. It also forces the harder engineering
problem (idempotency, not sending the same alert every day) rather than
the easier one (send an email on a trigger).

## Stack & tooling

- **n8n** (Cloud) for the workflow engine — visual retry/branching and a
  first-class Google Sheets node meant no client library to write or
  maintain for what's fundamentally a scheduled ETL job.
- **Google Sheets** as the data layer: `Inventory`, `SeenRecalls`,
  `RunLog` — chosen deliberately over a real database because this data
  is exactly what a dealership's own ops team would want to open and
  eyeball directly.
- **NHTSA's public `recallsByVehicle` API** — no key, no auth, and it's
  the actual source of truth a real compliance process would use.
- **Gmail node** for the digest — the brief explicitly allows email or
  Sheets for delivery; email is the one that actually interrupts someone
  rather than requiring them to go check a sheet.

## Key decisions & trade-offs

- **A separate `SeenRecalls` ledger, not "only alert on recalls newer
  than last run's timestamp."** A timestamp-based approach breaks the
  moment NHTSA backfills or corrects a recall's reported date, or the
  moment the workflow doesn't run for a day. Keying on `CampaignNumber`
  (NHTSA's own stable ID) instead is idempotent regardless of *when*
  something is reported — it only cares *whether* it's been seen, ever.
  Trade-off: the sheet grows forever; fine at dealership scale, would
  need archiving at real fleet-management scale.
- **`RunLog` writes on every run, success or empty.** The tempting
  version only logs when something interesting happens. That version is
  indistinguishable from "the workflow silently stopped running weeks
  ago" — which is the single worst failure mode for an unattended
  compliance-adjacent automation. A boring row every day is the point.
- **`onError: continueRegularOutput` on the HTTP node, not the default
  "stop workflow."** A single vehicle with a weird API response
  shouldn't take down the recall check for every other car in inventory.
  Trade-off: the Code node downstream has to actually inspect each
  response for an error shape instead of trusting a clean array — more
  code, but the alternative is a systemic single point of failure.
- **HTML built by hand in a Code node instead of an email template
  service.** For one table in one digest email, pulling in a templating
  dependency would be solving a problem this doesn't have yet.

## Hard parts / dead ends

- **NHTSA returns HTTP 400 with a usable JSON body for some vehicles.**
  Found this while first wiring up the HTTP node with default error
  behavior — some vehicles killed the whole run even though NHTSA's
  response body, once actually read, either had a real (if unhelpfully
  shaped) answer or an explicit error message worth showing rather than
  discarding. Fixed by setting `continueRegularOutput` on the HTTP node
  and having the downstream Code node check `response.error` itself
  instead of relying on the HTTP status code to mean what it's supposed
  to mean.
- **First idempotency design used the recall's reported date, not its
  campaign number.** Looked fine on paper — "only alert on recalls
  reported since last run" — until realizing NHTSA doesn't guarantee a
  recall's reported date is stable if it's later amended, which would
  either re-surface an old recall or (worse) permanently hide a legitimately
  new one that happened to share a stale date. Switched to keying on
  `CampaignNumber`, NHTSA's own stable identifier, before this shipped —
  caught during design, not after a false alert.
- **Google Sheets node's "append" needs the exact same column schema
  every time.** The `Log Run (Found Recalls)` and `Log Run (No New
  Recalls)` branches both write to `RunLog` but read different upstream
  fields (`Build Digest`'s `newCount` vs. `Filter New Recalls`'
  `errorCount`) — easy to end up with two branches whose output columns
  don't actually line up. Solved by keeping both append nodes' column
  lists identical and explicit rather than relying on n8n's auto-mapping.

## How I verified it works

- Ran the workflow manually end-to-end from n8n's canvas (not just
  "looks right" — actually executed).
- **First run**: real new recalls surfaced for the seeded inventory,
  digest email sent, rows landed in both `SeenRecalls` and `RunLog`.
- **Second run, immediately after, same inventory**: zero new recalls
  (everything was now in `SeenRecalls`), zero emails sent, `RunLog` shows
  `NewRecallsFound: 0` — this is the actual proof the idempotency logic
  works, since a naive version would have re-sent the same digest.
- Read every node's parameters and the two Code nodes end to end, tracing
  what happens to a vehicle whose NHTSA call fails vs. succeeds vs.
  returns zero recalls.

## Known limitations

- Sequential, one HTTP call per vehicle — would need batching for a real
  fleet larger than a few hundred vehicles.
- No retry/backoff on the Google Sheets nodes themselves, only on the
  NHTSA HTTP call — Google Sheets' API is reliable enough at this volume
  that it wasn't the priority, but it's the obvious next hardening step.
- Digest email is a single flat HTML table — no grouping by
  make/severity, no unsubscribe/preferences, which a production version
  aimed at multiple recipients would need.
- The exported `workflow.json` in this repo has its digest recipient
  redacted to a placeholder before committing (see this folder's README)
  — the live n8n workflow itself is untouched.

## Time spent

- Workflow design (nodes, idempotency approach, error handling): ~35 min
- Building and wiring the n8n canvas: ~30 min
- Google Sheet setup (three tabs, schemas): ~15 min
- Debugging the NHTSA 400-with-valid-body quirk: ~15 min
- Live verification (two real back-to-back runs): ~15 min
- Docs (this log, README, exporting/redacting the workflow JSON): ~25 min
