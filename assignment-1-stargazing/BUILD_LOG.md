# Build Log: Assignment 1 — Nightscope (Stargazing Conditions Explorer)

## Goal & scope decision

Built a single-purpose app that fuses live weather (Open-Meteo) with NASA's
Astronomy Picture of the Day into one "is tonight good for stargazing"
score. Chose this over the brief's own worked example (country + weather +
currency) deliberately — that combo is given as an example in the
assignment itself, so I assumed a meaningful share of submissions would use
it near-verbatim, and picked something that still hits "multi-API fusion"
but isn't the handed-to-you answer.

Deliberately left out: user accounts/saved locations, a "compare two
cities" view, and a proper astronomy library for moon phase (used a
lightweight approximation instead — see Known Limitations). None of those
were needed to hit the core + advanced requirements, and adding them would
have eaten the time-box without changing the grade-relevant story.

## Stack & tooling

- **Next.js 16** (App Router, Route Handlers) — the assignment names
  Next.js explicitly for the "own backend" option.
- **TypeScript**, strict mode, shared types between the API route and the
  client.
- **Tailwind CSS v4** for styling.
- No animation library, no chart library, no state management library —
  the app is small enough that `useState`/`useEffect` and plain CSS
  keyframes are the right amount of complexity, not less.
- AI assistance: used throughout for scaffolding and implementation, with
  every generated piece read, tested in the browser, and in a couple of
  cases (see Hard Parts) debugged and corrected by hand.

## Key decisions & trade-offs

- **Backend-for-frontend instead of calling APIs from the client**:
  because it's the assignment's own "big bonus" advanced option, and
  because it's the only way to keep the NASA key server-side. Trade-off:
  one more file/layer than a client-only app would need.
- **Compute moon phase myself instead of a third API**: keeps the app to
  two real external dependencies instead of three, and a phase/illumination
  approximation from a fixed synodic-month cycle is accurate enough for "will
  the moon wash out the stars tonight" — it doesn't need arc-second
  precision. Alternative considered: a dedicated moon-phase API — rejected,
  since it would've added an external dependency for something pure math
  handles fine.
- **Weighted-sum scoring formula (cloud 55%, moon 30%, rain 15%) instead of
  a "smarter" model**: a transparent, tunable formula is easier to justify
  and to explain than a black-box calculation, and there's no training data
  to justify anything more sophisticated anyway.
- **Plain `<img>` for the APOD photo instead of `next/image`**: NASA serves
  images from a handful of different subdomains that change day to day;
  `next/image`'s `remotePatterns` allowlist doesn't fit that well. Traded
  automatic image optimization for not having to maintain a wildcard
  allowlist that would defeat the point of having one.
- **City search calls Open-Meteo's geocoding API directly from the browser,
  not through my backend**: it needs no API key and returns nothing
  sensitive, so proxying it would've added a hop for no security or
  caching benefit.

## Hard parts / dead ends

- **Hydration mismatch on the animated starfield.** The star positions are
  derived from a seeded pseudo-random function so server and client agree
  on layout, but the raw floating-point values (e.g.
  `89.12263821047124%`) got serialized with different precision on the
  server-rendered HTML vs. the client's re-computed inline styles, which
  React's hydration check treats as a real mismatch. Fixed by rounding
  every generated value to 3 decimal places before it ever reaches a style
  attribute, so both sides produce byte-identical strings.
- **A new stricter lint rule (`react-hooks/set-state-in-effect`) flagged
  three legitimate patterns**: resetting search results on a short query,
  showing a "searching…" flag before a debounced fetch, and restoring a
  shared location from the URL on mount. I initially tried satisfying it by
  deferring the state updates with `queueMicrotask`, which turned out to be
  the wrong call for the URL-restore case — it didn't actually break
  anything (a live retest confirmed the feature works fine either way; my
  first "it's broken" conclusion was from an insufficiently long test wait
  in a heavily-hot-reloaded dev session), but it also wasn't buying
  anything real, since there's no derivable value being avoided here — it's
  a genuine one-time side effect. Ended up: fixing the two cases that
  really were "derive this instead of an effect" problems (moving the reset
  logic into the `onChange` handler), and suppressing the rule with a
  one-line comment explaining why for the one legitimate "fetch on mount"
  case, rather than contorting the code to satisfy an overly strict rule.
- **CSS `drop-shadow()` on the SVG score ring produced a visible hard-edged
  box** around the glow instead of a soft halo. Root cause: the filter's
  default region is sized to the element's own bounding box, which clips a
  wide blur on a thin partial arc. Fixed by defining an explicit SVG
  `<filter>` with a generous `x/y/width/height` region instead of the CSS
  shorthand.

## How I verified it works

- Manually clicked through the full flow in a real browser: quick-pick
  cities, city search with disambiguation (multiple "Tokyo"s), "use my
  location", and the shareable-URL restore (copied a generated URL into a
  fresh tab and confirmed it reproduced the exact same result with zero
  interaction).
- Confirmed the score and weather are genuinely different per city and
  change the gauge's color (Dubai: 91/green; Tokyo: 36-57/orange, varying
  with live conditions) — not hardcoded.
- Tested at 375px width (mobile) and full desktop width.
- `npm run build` and `npm run lint` both clean, no errors or warnings.
- What I'd add with more time: an automated test for `computeStargazingScore`
  and `getMoonData` (both are pure functions, trivial to unit test, just
  didn't fit the time-box), and a deliberate test of the NASA-down code path
  (currently verified by code review, not by actually forcing NASA to fail).

## Known limitations

- Moon illumination is a mathematical approximation (~1-2% accuracy), not
  from an ephemeris — documented in the code and in the README so it's not
  mistaken for precise astronomy data.
- No automated tests. The scoring and moon-phase logic are pure functions
  that would be easy and valuable to unit test with more time.
- The NASA-fails-gracefully path is verified by reading the code and the
  `try/catch`, not by an actual observed NASA outage during testing.
- No dedicated "no results" empty state illustration for city search beyond
  a text message — functional, not particularly delightful.

## Time spent

- Planning/API research: ~20 min
- Scaffolding + backend route + scoring/moon logic: ~45 min
- UI components (starfield, gauge, search, weather, APOD card, skeletons): ~70 min
- Bug fixing (hydration mismatch, lint errors, SVG filter): ~30 min
- Manual testing across cities/viewports: ~20 min
- Docs (README, this log): ~25 min
