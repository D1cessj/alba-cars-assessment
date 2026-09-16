# Alba Cars — Vehicle Recall Watcher & Digest

**Live workflow:** https://saifo009.app.n8n.cloud/workflow/ZrtaWogP6jDpacm6 (n8n Cloud)
**Data store:** [Alba Cars - Recall Watcher](https://docs.google.com/spreadsheets/d/1KyaswUqG17pbKoS1N4L0Ihcm9C7ar_RsrKm-4SKdEPo) (Google Sheets)
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

Ran it for real, twice, back-to-back:

1. **First run** — found recalls for the seeded inventory that weren't yet
   in `SeenRecalls`, sent the digest email, appended them to
   `SeenRecalls`, logged the run.
2. **Second run, immediately after** — same inventory, same NHTSA data,
   but every `CampaignNumber` was now already in `SeenRecalls`. Result:
   **zero emails sent**, `RunLog` shows `NewRecallsFound: 0` for that run.

That second run is the actual proof this works — anyone can make an
automation send an email once. Making it correctly send *nothing* on the
second identical run is the part that's easy to get wrong (and the part a
demo usually skips).

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
