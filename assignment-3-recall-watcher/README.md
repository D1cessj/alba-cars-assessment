# Alba Cars — Vehicle Recall Watcher & Digest

**Workflow:** https://saifo009.app.n8n.cloud/workflow/ZrtaWogP6jDpacm6 (n8n Cloud —
this link opens the canvas but requires my personal n8n login; n8n Cloud's
Personal plan shares workflows by inviting a specific account, not via a
public read-only link, so it isn't something I can hand to an arbitrary
reviewer's email in advance. The exported [`workflow.json`](./workflow.json)
in this folder is the actual reviewable artifact — see "Importing this
workflow" below for how to run it yourself in about five minutes.)
**Data store:** [Alba Cars - Recall Watcher](https://docs.google.com/spreadsheets/d/1KyaswUqG17pbKoS1N4L0Ihcm9C7ar_RsrKm-4SKdEPo) (Google Sheets, private — same reasoning)
**Assignment:** Alba Cars take-home, Assignment 3 (n8n Automation Workflow)

A daily workflow that checks every vehicle in the dealership's inventory
against NHTSA's public recall database, and only tells a human about the
recalls that are actually **new** — not the same ones re-announced every
day the workflow happens to run.

## What it does

Once a day (08:00, configurable), for every vehicle in the "Inventory"
sheet: call NHTSA's public recall API for that make/model/year, compare
any results against everything already logged in "SeenRecalls", and if
there's anything genuinely new, build an HTML digest and email it. Every
run — whether it found something or not — writes a row to "RunLog", so
there's a record that the automation actually ran, not just that it's
configured to.

## Why idempotency, not the API call, was the real problem

Calling a public recall API is the easy 20% of this. The actual
engineering problem is: NHTSA doesn't know or care that you already told
someone about a recall yesterday — every call returns the *full* recall
history for that vehicle, every time. Without tracking what's already
been surfaced, this workflow would email the same 3-year-old recall every
single morning forever, which is worse than not automating this at all —
it trains the person reading the digest to ignore it.

`SeenRecalls` (keyed on NHTSA's `CampaignNumber`, one row per
already-alerted recall) is what makes new alert. New emails go out for
NHTSA campaign numbers, tested twice back-to-back to prove it (see
"How I verified it").

## Workflow structure

```
Schedule Trigger (daily 08:00)
        │
        ▼
Read Inventory  ──(Google Sheets: "Inventory" tab — Make / Model / Year)
        │
        ▼
Get NHTSA Recalls  ──(HTTP GET, per vehicle, retry ×3 on failure)
        │
        ▼
Read Seen Recalls  ──(Google Sheets: "SeenRecalls" tab)
        │
        ▼
Filter New Recalls  ──(Code node: diff against seen CampaignNumbers)
        │
        ▼
Any New Recalls?  ──(IF)
   │ true                        │ false
   ▼                             ▼
Build Digest             Log Run (No New Recalls)
   │  └──────────────┐            └──(Google Sheets: "RunLog")
   ▼                 ▼
Send Digest Email   Append to SeenRecalls
   │                    └──(Google Sheets: "SeenRecalls")
   ▼
Log Run (Found Recalls)
   └──(Google Sheets: "RunLog")
```

Full node definitions, parameters, and the two Code nodes: [`workflow.json`](./workflow.json)
(exported directly from n8n — see "Importing this workflow" below).

### Node by node

| Node | Type | What it does | Data in → out |
|---|---|---|---|
| **Schedule Trigger** | Schedule Trigger | Fires once a day at 08:00. | — → nothing (just starts the run) |
| **Read Inventory** | Google Sheets (read) | Reads every row of the `Inventory` tab. | — → one item per vehicle (`Make`, `Model`, `Year`) |
| **Get NHTSA Recalls** | HTTP Request | Calls `GET /recalls/recallsByVehicle` once per vehicle, using that vehicle's Make/Model/Year in the query. Retries 3× on failure; on a non-2xx response it continues instead of aborting the run (see the NHTSA quirk below). | one item per vehicle → that vehicle's raw NHTSA response |
| **Read Seen Recalls** | Google Sheets (read) | Reads every row of `SeenRecalls` once (`executeOnce`), regardless of how many vehicles are being checked. | — → every previously-seen `CampaignNumber` |
| **Filter New Recalls** | Code | The core logic. Cross-references `$('Read Inventory')` and `$('Get NHTSA Recalls')` item-by-item against the seen set from `Read Seen Recalls`. Emits one item per genuinely new recall (`isNewRecall: true`), or, if none are new, a single summary item (`isNewRecall: false`, plus `vehiclesChecked`/`errorCount`/`errors`). | 3 inputs merged → either N new-recall items or 1 "nothing new" item |
| **Any New Recalls?** | IF | Branches on `isNewRecall`. | → true branch or false branch |
| **Build Digest** *(true branch)* | Code | Turns the new-recall items into one HTML table (vehicle, campaign #, component, summary). | N recall items → 1 item (`htmlBody`, `newCount`) |
| **Send Digest Email** *(true branch)* | Gmail | Emails the HTML digest. | `htmlBody` → sent email |
| **Append to SeenRecalls** *(true branch, parallel to Build Digest)* | Google Sheets (append) | Writes each new recall's `CampaignNumber` etc. into `SeenRecalls`, so it's never treated as new again. | N recall items → N sheet rows |
| **Log Run (Found Recalls)** *(true branch, after the email sends)* | Google Sheets (append) | Writes one `RunLog` row: timestamp, vehicles checked, how many new recalls, `Errors: 0`. | — → 1 sheet row |
| **Log Run (No New Recalls)** *(false branch)* | Google Sheets (append) | Writes one `RunLog` row using the summary item's `vehiclesChecked`/`errorCount` — `NewRecallsFound: 0`. | 1 summary item → 1 sheet row |

### The sheet is doing three separate jobs, on purpose

- **Inventory** — the dealership's actual stock (Make/Model/Year). Stands
  in for a real DMS export.
- **SeenRecalls** — the idempotency ledger. Every recall this workflow has
  ever surfaced, so it never gets re-announced.
- **RunLog** — the audit trail. One row per execution (`Timestamp`,
  `VehiclesChecked`, `NewRecallsFound`, `Errors`), whether or not anything
  new was found. This is what proves the automation is actually running
  daily, not just sitting there configured and forgotten.

## A real NHTSA API quirk

Some vehicle/year/make combinations make NHTSA's `recallsByVehicle`
endpoint respond with **HTTP 400** while still returning a completely
valid, parseable JSON body (sometimes an empty `results` array, sometimes
an actual error message inside a 200-shaped payload). Trusting the HTTP
status code alone would silently drop those vehicles from every run with
no visibility into why.

Fixed two ways:
- The HTTP Request node has `retryOnFail` (3 attempts) for genuinely
  transient failures, but `onError: continueRegularOutput` so a real 400
  doesn't kill the whole execution.
- The `Filter New Recalls` Code node inspects the response body itself
  (`response.error`) rather than trusting the HTTP layer, and collects
  anything that couldn't be checked into an `errors` array that ends up in
  that run's `RunLog` row — so a bad vehicle shows up as a visible error
  count, not a silent gap.

## How I verified it

Ran it for real, twice, back-to-back, against the live Google Sheet. This
is the actual `RunLog` data from those two runs (2026-09-16):

| Timestamp | VehiclesChecked | NewRecallsFound | Errors |
|---|---|---|---|
| 2026-09-16T02:xx:xx | 8 | **52** | 0 |
| 2026-09-16T02:xx:xx | 8 | **0** | 3 |

1. **First run** — 8 vehicles checked, 52 recalls found across NHTSA's
   *full* recall history for those make/model/years (NHTSA doesn't limit
   this to "recent" recalls — a vehicle can easily have a dozen campaigns
   across its production run). All 52 were new, so they went out in one
   digest email and all 52 `CampaignNumber`s were appended to
   `SeenRecalls`.
2. **Second run, immediately after** — same 8 vehicles, same NHTSA data.
   Every `CampaignNumber` was now already in `SeenRecalls`, so
   `NewRecallsFound: 0` and **zero emails sent**. This run also happened
   to hit NHTSA lookup errors on 3 vehicles (visible in the `Errors`
   column, not silently dropped) — a live, unplanned demonstration of the
   error-handling path described below, not a scripted one.

That second row is the actual proof this works — anyone can make an
automation send an email once. Making it correctly send *nothing* on the
second identical run, while still surfacing that 3 lookups failed, is the
part that's easy to get wrong (and the part a demo usually skips).

## Importing this workflow

1. Create a Google Sheet with three tabs: `Inventory` (columns `Make`,
   `Model`, `Year`), `SeenRecalls` (`CampaignNumber`, `Make`, `Model`,
   `Year`, `Component`, `Summary`, `DateSeen`), `RunLog` (`Timestamp`,
   `VehiclesChecked`, `NewRecallsFound`, `Errors`).
2. In n8n: **Workflows → Import from File** → select [`workflow.json`](./workflow.json).
3. Reconnect the two credential slots it'll ask for (Google Sheets OAuth2,
   Gmail OAuth2) — credentials are never included in an n8n export, by
   design, so there's nothing to configure beyond picking your own
   accounts.
4. Point the three Google Sheets nodes at your new sheet's ID, update the
   `Send Digest Email` node's recipient (the committed copy uses a
   placeholder address, not a real one — see "A note on the export"
   below), and activate the workflow.
5. **To run it immediately** rather than waiting for 08:00: open the
   canvas and click **Execute workflow** (bottom toolbar) — this runs the
   whole pipeline once, right now, and you'll see each node light up
   green/red as it completes, with the item count it produced. That's the
   fastest way to confirm the import worked before trusting the schedule.

### A note on the export

The version of `workflow.json` in this repo has the digest recipient
replaced with a placeholder (`you@albacars.demo`) before committing — the
live n8n workflow sends to a real address, but this repo is public and
that's not something that needs to be. Credentials themselves were never
at risk either way: n8n exports reference credentials by name/ID only,
never by token, so importing this file elsewhere always requires
reconnecting your own Google/Gmail accounts regardless.

## Tech / service choices

- **n8n** over a cron job + script: visual retry/error branching, a
  Google Sheets integration with no client library to write, and a canvas
  that's debuggable by looking at it rather than reading logs — the right
  tradeoff for something that has to run unattended and be trusted.
- **Google Sheets** as the data store, not a database: this data
  (inventory, seen recalls, run log) is exactly the shape a real
  dealership's ops team would want to open and read directly, without a
  UI in between. That's a feature here, not a limitation.
- **NHTSA's public `recallsByVehicle` API**: no API key required, no rate
  limit that matters at this scale, and it's the same data source a real
  compliance team would already trust.

## Known limitations

- One HTTP call per vehicle, sequential — fine for a demo inventory of a
  handful of cars, would want batching or a queue in front of it at real
  dealership scale (hundreds of vehicles).
- No dedupe within a single run if two inventory rows are genuinely
  identical (same make/model/year) — they'd just be checked twice, which
  is wasteful but not incorrect, since `SeenRecalls` still prevents a
  duplicate email either way.
- The digest email's HTML is built by hand in a Code node rather than a
  template — fine at this scale, would move to a proper template if the
  digest format grew more complex.
