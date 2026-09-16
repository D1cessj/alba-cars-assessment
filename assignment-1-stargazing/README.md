# Nightscope — Stargazing Conditions Explorer

**Live demo:** https://assignment-1-stargazing.vercel.app
**Assignment:** Alba Cars take-home, Assignment 1 (Creative, API-Integrated Web App)

Nightscope answers one question for any city on Earth: **"Is tonight good for
stargazing?"** It fuses live weather data, a computed moon-brightness signal,
and NASA's daily astronomy photo into a single 0–100 score with the reasoning
behind it.

## Feature list

- Search any city worldwide (debounced, disambiguates same-name cities by
  region/country) or use your current location.
- A single fused **Stargazing Score** (0–100) with a plain-English breakdown
  of *why* — cloud cover, moon phase/brightness, rain risk.
- NASA's Astronomy Picture of the Day, shown alongside tonight's conditions.
- Shareable links — picking a location updates the URL
  (`?lat=&lon=&name=`), so any result can be copy-pasted and reopens to the
  exact same view.
- Loading skeletons, empty state with quick-pick cities, and graceful error
  states (a failed weather call shows a real error message; a failed NASA
  call degrades to "no photo today" without breaking the rest of the page).
- Dark, animated starfield background as the app's visual signature.

## Architecture

```
Browser  →  Next.js Route Handler (/api/stargazing)  →  Open-Meteo (weather)
                                                       →  NASA APOD API
```

The **browser never calls NASA or Open-Meteo directly** — it calls our own
`/api/stargazing?lat=&lon=&name=` route, which is a small backend-for-frontend
(BFF) that:

1. Calls NASA's APOD API server-side, so the API key (if you set one) never
   reaches the client. Cached for 6 hours with Next's `fetch` cache, since
   the photo only changes once a day and NASA's free `DEMO_KEY` is capped at
   30 requests/hour.
2. Calls Open-Meteo for current cloud cover, precipitation probability,
   temperature, and sunrise/sunset for the given coordinates. Cached for 10
   minutes — long enough to avoid hammering the API, short enough to stay
   accurate.
3. Computes the current moon phase/illumination itself (`src/lib/moon.ts`) —
   this is plain math (a fixed synodic-month cycle), not a third API.
4. Fuses weather + moon into the score (`src/lib/scoring.ts`) and returns one
   JSON payload.
5. Wraps both upstream calls in `fetchWithRetry` (`src/lib/fetchWithRetry.ts`)
   — retries transient failures (429/5xx/network errors) with exponential
   backoff, gives up immediately on real 4xx errors.
6. **Fails gracefully, not totally**: if NASA is down, the route still
   returns the weather + score with `apod: null` and a human-readable
   `apodError` — the page shows everything except the photo. If the weather
   call fails, the whole request 502s with a message, since the score is
   meaningless without it.

### Why this counts as the "own backend" advanced option

The BFF is the reason API keys stay server-side, caching exists at all, and
a NASA outage doesn't take down the whole page — none of that would be true
if the browser called both APIs directly.

### Why this counts as "multi-API data fusion"

Cloud cover (Open-Meteo) and moon brightness (computed) each say nothing
about stargazing on their own. The score is a genuine synthesis — a country
club could tell you it's 0% cloud cover on a full-moon night and you'd still
have a mediocre view of faint stars. Nothing upstream tells you that; the
fusion does.

## API quirks I ran into

- **NASA's `DEMO_KEY` rate limit is real and shared** across everyone who
  hasn't set their own key — 30 req/hour, 50/day. The 6-hour cache is there
  specifically so a few page loads in a row don't burn through it.
- **APOD occasionally returns a video, not an image** (`media_type: "video"`)
  when the "picture" of the day is footage — handled with an `<iframe>`
  fallback in `ApodCard`.
- **Open-Meteo's `is_day` field** is a `0`/`1` integer, not a boolean — worth
  knowing before you write `if (data.is_day)` and get it backwards.
- Using a plain `<img>` for the APOD image (not `next/image`) is deliberate:
  NASA serves images from a handful of different subdomains depending on the
  day, so a `remotePatterns` allowlist would need frequent updates or a
  wildcard that defeats the point of the allowlist.

## Good practices

- Accessible: the search input has an `aria-label`, the error state uses
  `role="alert"`, all interactive elements are real `<button>`s.
- Responsive down to mobile (tested at 375px width) — single-column layout,
  no horizontal scroll, gauge and text scale down cleanly.
- No secrets in client code — `NASA_API_KEY` is read only in the route
  handler (`src/app/api/stargazing/route.ts`), never sent to the browser.
- Clean `npm run build` and `npm run lint` — zero errors, zero warnings.

## Running it locally

```bash
npm install
cp .env.local.example .env.local   # optional — works with NASA's DEMO_KEY unset
npm run dev
```

Open http://localhost:3000. `NASA_API_KEY` is optional; get a free one
instantly at https://api.nasa.gov/ if you want a higher rate limit than the
shared `DEMO_KEY`.

## Tech stack

- **Next.js 16** (App Router, Route Handlers) — the assignment explicitly
  calls out a Next.js backend as the "own backend" advanced option, so this
  wasn't a hard choice.
- **TypeScript** throughout, including the API response shape shared between
  server and client (`src/lib/types.ts`).
- **Tailwind CSS v4** for styling — fast to iterate on a distinctive dark
  theme without hand-rolling a CSS architecture.
- No external animation library — the starfield, score gauge, and
  fade/skeleton transitions are all plain CSS keyframes + a `requestAnimationFrame`
  count-up, which is enough for 60fps here and one less dependency.

## How I tested this

- Manually, in a real browser, at desktop and mobile (375px) widths.
- Verified real, different data end-to-end for multiple cities (Dubai,
  Tokyo, Reykjavik) — cloud cover, score, and score color genuinely differ
  per city, confirming the fusion isn't hardcoded.
- Verified the shareable-URL feature by copying a generated URL into a fresh
  tab and confirming it restores the exact same result without any
  interaction.
- Verified `npm run build` and `npm run lint` are clean.
- Did **not** get to write automated tests in the time-boxed window — see
  `BUILD_LOG.md` for what I'd add with more time.
