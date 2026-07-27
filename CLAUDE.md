# Geo Quizzes

Interactive geography quiz web app: sign up with email/password, play
map-based quiz games, compete on per-game leaderboards. See `README.md` for
stack summary and local setup/run commands — this file covers conventions
and gotchas an agent working in this repo needs to know.

## Architecture gotchas (read before touching auth/state/data)

- **Auth is Credentials-based (email + password + bcrypt), not OAuth.**
  `POST /api/auth/register` creates the `User` row (hashed password via
  `bcryptjs` — pure JS, no native binary, same reasoning as the Prisma
  adapter below). `lib/auth.ts`'s `authorize()` looks the user up and
  compares the password. There's no email verification or password-reset
  flow — out of scope unless asked for.
- **Auth is split into two files** to keep Prisma/bcrypt out of the Edge
  runtime: `lib/auth.config.ts` is the Edge-safe base (a stub Credentials
  provider whose `authorize` is never actually called — middleware only
  verifies the JWT, it never invokes a provider) and is what `proxy.ts` uses
  directly. `lib/auth.ts` extends it with the *real* `authorize()` and the
  Prisma adapter, for use only in pages/API routes. Don't import
  `lib/auth.ts` from `proxy.ts` or anything else that runs in Edge middleware.
- **`proxy.ts`** (Next.js 16 renamed `middleware.ts` → `proxy.ts`) gates all
  page routes behind login except `/`, `/sign-in`, `/sign-up`, but its matcher
  **excludes `/api/*` entirely** — API routes return their own 401 JSON via
  each route's own `auth()` check, rather than being redirected to an HTML
  page. It also redirects already-logged-in users away from `/sign-in` and
  `/sign-up` to `/games`.
- **State management is `nanostores`, not Recoil.** Recoil was the original
  choice but turned out to be fundamentally incompatible with React 19 —
  not just an SSR/prerender issue, it crashes at runtime in the browser too
  (`useRecoilState` reaches into
  `React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher`,
  whose shape changed in React 19, and Recoil hasn't been updated since).
  `lib/state/useGameState.ts` wraps `@nanostores/react`'s `useStore` to mirror
  `useRecoilState`'s exact `[state, setState]` shape (setState accepts a
  value or an updater function), so game components barely changed — see
  `lib/state/gameAtoms.ts` for the atom definitions. Use `useGameState` for
  any new per-component game state; there's no cross-component sharing
  currently, so plain nanostores atoms (not computed/derived stores) are
  the right level of complexity.
- **`GlobeView` (`components/GlobeView.tsx`) wraps `react-globe.gl`, not raw
  `globe.gl`.** An earlier version hand-rolled globe.gl's imperative Kapsule
  API directly (manual container ref, `new Globe(container)` in a
  `useEffect`, imperative `.polygonsData()`/`.onPointClick()`/etc. chains) and
  hit two rounds of real DOM-lifecycle crashes (`domNode.innerHTML = ""`
  throwing because the container was null/detached — confirmed both times by
  decompiling the actual crashing chunk, not guessed). `react-globe.gl` (same
  author, maintained React binding) handles all of that correctly — **pass
  layer data as props** (`polygonsData`, `pointColor`, `onPolygonClick`,
  `onGlobeClick`, etc., driven by component state/props) rather than calling
  methods imperatively on an instance. Use the forwarded `ref`
  (`useRef<GlobeMethods>(null)`) only for the couple of ref-only methods:
  `pointOfView()` and `controls()` (to set `enableRotate = false`). See
  `ClickDotMode.tsx` / `ProximityMode.tsx` for the pattern (point-based
  "guess the location" games, where a sphere is the more honest
  representation of the task). Don't reintroduce a manual globe.gl wrapper.
- **`polygonCapColor` can't have a nonzero-alpha "idle" fill on a
  many-polygon *globe* game.** three-globe's polygon cap material is
  `transparent` with `depthWrite: true` — a known bad combination once more
  than a couple of same-frame polygons use it: confirmed by bisecting an
  earlier globe-based US States prototype (50 states) that 2 simultaneously-
  tinted caps render clean but 3+ produce a hazy color wash across the
  *entire* globe, not just the polygons themselves. This is why click-a-
  region games moved to `MapView` (below) instead of chasing this further —
  if a future game ever renders many polygons on `GlobeView`, the fix is:
  return fully transparent (`"rgba(0, 0, 0, 0)"`, not a low-alpha tint) for
  every "idle" polygon, and only return a real color for the handful (1-2)
  actually highlighted for correct/wrong feedback at any instant.
- **`MapView` (`components/MapView.tsx`) is a flat 2D map (d3-geo + SVG),
  used for click-a-region games instead of `GlobeView`.** Stockholm
  Districts and US States both moved off `GlobeView` to `MapView` — a flat
  projection is easier to click precisely than a rotatable sphere, and
  sidesteps globe-only problems entirely (the `polygonCapColor` bug above,
  Alaska/Hawaii camera framing, rotation-lock tradeoffs). Pass
  `regionsData`/`fill`/`stroke`/`onRegionClick`/`label` as props, same
  props-driven pattern as `GlobeView`. Gotchas specific to it:
  - **Projection choice matters more than it looks.** `"mercator"` (default)
    is fine for a single contiguous landmass. `"albersUsa"` natively insets
    Alaska/Hawaii for the US States game. `"pacific"` (Mercator rotated
    180°) exists because Oceania's own countries straddle the antimeridian
    (Fiji spans -180..180, Kiribati -171.7..174.8) — the default Mercator's
    `fitSize` bounding-box blows up to ~360° of longitude and squeezes every
    country into a sliver otherwise. Add more rotated variants here rather
    than fixing it in each game's data.
  - **A real, non-self-intersecting polygon can still render as an unfilled
    hole near the poles.** Confirmed with Canada's Ellesmere Island
    (82.5°N): `@turf/kinks` found zero self-intersections in the source
    geometry, so this is a d3-geo Mercator-at-extreme-latitude edge case,
    not a data bug — neither rewinding (`@turf/rewind`) nor
    `fillRule="evenodd"` fixed it. The data-prep-side fix is to drop any
    ring reaching past ±80° latitude (see `scripts/build-world-countries.js`'s
    `dropTinyRings`) — the same kind of threshold real web maps use (Web
    Mercator caps at ~85.05°N/S).
  - **A disproportionately large transcontinental country can dominate a
    continent map's `fitSize` bounds.** Russia's Asian extent squeezed all
    of Western/Central Europe into unclickable slivers on the Europe map —
    fixed by clipping Russia's *map* geometry to west of the Urals
    specifically (`scripts/build-world-countries.js`'s
    `clipToEuropeanRussia`); its capital/flag data is unaffected since
    those don't depend on the polygon extent.
  - **`MapView` also renders LineString/MultiLineString features (roads),
    not just Polygon/MultiPolygon** — `d3.geoPath`/`fitSize` are
    geometry-type-agnostic so this needed no change to path generation
    itself; a caller just passes `fill={() => "none"}` and the (now
    per-feature-function) `strokeWidth` prop for a visible line. Two things
    had to change to make this safe: `strokeWidth` became a
    `(feature) => number` prop (default `() => 1`, so every existing caller
    is unaffected) instead of a hardcoded `1`, since a highlighted road
    needs a thicker stroke than a clickable region's border; and
    `smallRegions` (the too-small-to-click marker logic) is now gated to
    only run on `Polygon`/`MultiPolygon` features — it used to assume every
    feature was one and would compute a nonsense degenerate-ring
    `area()`/`centroid()` off a LineString's `coordinates` otherwise. There's
    also a `markers` prop (`{lat, lng, label}[]`) for arbitrary point labels
    independent of `regionsData` — e.g. a road's two endpoint places —
    projected via the same d3 projection `pathFor` uses internally (which is
    why `pathFor`'s `useMemo` is now split into a `proj` memo and a `pathFor
    = geoPath(proj)` memo chained off it, rather than one combined memo that
    only ever exposed the wrapped `geoPath`).
  - **`fitSize` fits content edge-to-edge with zero margin** — for a
    bounding box whose aspect ratio happens to match the container, the
    shape's stroke touches (and visually seems to bleed past) the
    container's own border, reported as "the filling goes outside of the
    borders" in issue #11 (most visible on the Unofficial States "Map" mode,
    below, where a single entity is fit to its own bounding box with
    nothing else in view). Fixed by switching to `fitExtent` with a small
    (`FIT_PADDING_PX = 24`, clamped so it can't exceed a quarter of either
    dimension) inset box instead of `fitSize` — applies to every `MapView`
    caller, not just Map mode, since none of them wanted edge-to-edge
    framing in the first place.
- **Prisma uses `prisma-client-js` with `engineType = "client"`**, output to
  `app/generated/prisma/`. Import from `@/app/generated/prisma`, not
  `@prisma/client` directly. `lib/prisma.ts` constructs the client with
  `@prisma/adapter-neon` (connects over HTTP/WebSocket, not a direct TCP
  connection) — there is **no native query-engine binary** to bundle, which
  is what makes this work inside a Netlify Function at all. Two things that
  look like reasonable fixes but are dead ends, already tried:
  - The newer `prisma-client` TS generator doesn't implement the `adapter`
    option at all (prisma/prisma#28073).
  - Passing `{ adapter }` to `PrismaClient` with `prisma-client-js` but
    *without* `engineType = "client"` silently does nothing — it still loads
    the native library engine. Verify any future Prisma changes by removing
    the local `query_engine-windows.dll.node` and confirming queries still
    work; if they don't, the adapter isn't actually being used.
  - `prisma.config.ts` (not the `package.json` `prisma` key) drives the CLI.
- **React 19's stricter effect-rules lint** (`react-hooks/set-state-in-effect`,
  `react-hooks/refs`) will fail CI-equivalent checks if you call `setState`
  synchronously in an effect body (do it inside a `.then`/callback instead) or
  mutate a ref during render (assign it inside a `useEffect`). Run
  `npx tsc --noEmit && npm run lint` after any change.
- Score types are `POINTS` (higher is better) or `TIME_MS` (lower is better);
  `app/api/games/[slug]/leaderboard/route.ts` sorts ascending/descending
  accordingly based on the mode's `scoreType` in the registry.

## Adding a new game

Use the **`new-game` skill** (`.claude/skills/new-game/SKILL.md`) — it covers
choosing points-vs-polygons data shape, sourcing coordinates from GeoNames
without fabricating them, the two canonical JSON envelopes, registering in
`lib/games/registry.ts`, and the page-scaffolding patterns (GlobeView,
nanostores atom shape via `useGameState`, score submission, leaderboard).
Don't invent a third data shape or reimplement patterns it already
documents. The skill predates `MapView` and `useRoundGame` (see the
gotchas above and the Countries-of-`<continent>` games below) — for a new
click-a-region game, prefer `MapView` over `GlobeView` unless the game is
genuinely globe-scale/rotatable; for a new game that's really N near-
identical instances of the same round shape (e.g. one per continent/
category), prefer `useRoundGame` + a shared mode component over one-off
per-instance files.

`lib/games/registry.ts` is the single source of truth for game/mode slugs,
display names, and data file paths — both the UI and the API routes read
from it. `lib/games/data.ts` has the shared fetch helpers (`fetchRegions`/
`fetchPoints`, plus `fetchDistricts`/`fetchCities` aliases for the existing
games).

## Games implemented

1. **Stockholm Districts** (`/games/stockholm-stadsdelar`) — district named,
   click its border on the map; POINTS, one pass through all districts.
2. **Sweden's Biggest Cities** (`/games/sweden-cities`) — three modes:
   - *Type them all* — free recall of the top 100, autocomplete kicks in only
     after 5+ chars typed **and** an unambiguous match remains; TIME_MS,
     scored only on full completion (giving up doesn't submit a score).
   - *Click the city* — named city, click its dot; POINTS.
   - *Guess the location* (maptap-style) — 5 random cities, click your guess
     on the map, scored by distance via `lib/games/geo.ts`
     (`haversineDistanceKm`/`proximityScore`); POINTS.

`public/data/sweden_largest_cities.json` coordinates were sourced from the
GeoNames Sweden dump and matched programmatically (`scripts/match-city-coords.js`)
— two localities (Västerhaninge, Nordöstra Göteborg) use documented proxy
coordinates since no exact GeoNames entry exists for those SCB locality
names; see the file's `note` field.

3. **Five Cities Across the World** (`/games/world-cities`) — one mode,
   *Guess the location*: 5 random cities from the top 120 most populous
   cities worldwide, click your guess on the freely-rotatable globe; POINTS,
   scored by distance via `proximityScore(distanceKm, decayKm)` — this game
   passes a much larger `decayKm` (3000, vs. the 600 default tuned for
   Sweden's country-scale game) so a right-continent guess still earns
   partial credit at world scale.

`public/data/world_largest_cities.json` coordinates and populations come
from GeoNames' worldwide `cities15000` dump, filtered to feature class `P`
and sorted by population (`scripts/build-world-cities.js`) — no per-item
proxying needed, unlike the Sweden data.

4. **US States** (`/games/us-states`) — one mode, *Click the state*: a
   state is named, click its outline on a `MapView` using the `"albersUsa"`
   projection, which natively insets Alaska/Hawaii near the mainland;
   POINTS, one pass through all 50 states.

`public/data/us_states.json` borders come from geoBoundaries' USA ADM1
boundaries (public domain), filtered down to the 50 states (dropping DC +
5 territories that geoBoundaries includes in the same set) and simplified
(`scripts/build-us-states.js`) — both for file size (the raw simplified
release is still ~5MB, mostly Alaska/Hawaii coastline) and render
performance (Alaska alone had 586 separate island rings before dropping
ones under 0.5% of its largest ring's area).

5. **List All Countries** (`/games/world-countries`) — one mode, *Type them
   all*: free recall of all 197 sovereign countries, same autocomplete-and-
   guess pattern as Sweden's cities game; TIME_MS.
6. **Countries of Africa/Asia/Europe/North America/South America/Oceania**
   (`/games/countries-<continent>`) — each with three modes, all POINTS,
   one pass through that continent's countries:
   - *Countries* — named country, click its outline on a `MapView`
     (Oceania uses the `"pacific"` projection — see the `MapView` gotcha
     above).
   - *Capitals* — named country, type its capital.
   - *Flags* — flag shown, type the country name.

   These three modes are shared components (`components/games/
   {CountriesMapMode,CapitalsMode,FlagsMode}.tsx`) parameterized by
   `gameSlug` + country data, not one-off per-continent files — with 6
   continents × 3 modes being 18 near-identical instances of the same
   round-progression shape, that's genuinely warranted (see
   `lib/games/useRoundGame.ts`, and `getRoundState(key)` in
   `lib/state/gameAtoms.ts` for the per-instance persistent atom factory),
   unlike the one-off mode files every other game uses.

`public/data/world_countries.json` (points format) and
`public/data/countries_<continent>.json` (GeoJSON, one per continent) come
from Natural Earth's 1:50m Admin-0 country boundaries (public domain) for
borders/continent, GeoNames' `countryInfo.txt` for capitals, and
flagcdn.com for flag images (referenced by URL, not downloaded) —
`scripts/build-world-countries.js`. Natural Earth's raw set includes
dependencies/territories (Puerto Rico, Greenland, Hong Kong, etc.) and a
few disputed territories alongside real countries; the script filters
those out and documents exactly what's dropped and why in the output
file's own `note` field.

7. **Swedish Roads** (`/games/swedish-roads`) — a road's route is
   highlighted on a `MapView` (drawn together with Sweden's own outline for
   context, reused from the Europe continent game's data rather than a
   dedicated Sweden-only file), type its route/designation number; five
   modes split by road tier (all/motorways/national/county/secondary
   county), all POINTS, 5 random roads per run from that tier's pool.

`public/data/swedish_roads.json` route designations + place-list order
come from Swedish Wikipedia's road-numbering articles, actual route
geometry from OpenStreetMap via the Overpass API — both fetched live by
`scripts/build-swedish-roads-{primary,secondary}.js` (see that script's own
header for the Overpass endpoint/rate-limit/curl-not-fetch specifics also
relied on by the two games below).

8. **Guess the City** (`/games/city-streets`) — one mode, *Street
   pattern*: only a major city's street network is shown (no labels,
   borders, or coastline — the road pattern is the only clue), type which
   city it is; POINTS, 5 random cities per run from a pool of 30.

`public/data/city_streets.json` major-road geometry (motorway/trunk/
primary only, clipped to a several-km box around each city's center, then
simplified for file size) comes from OpenStreetMap via Overpass, the same
endpoint/technique as the Swedish Roads game above —
`scripts/build-city-streets.js`. The 30-city list is a deliberate curation,
not a population-rank cut: every city is unambiguously major, but was
specifically chosen for having a visually distinctive street layout (a
ring road, a radial star, a strict grid, a unique planned shape) — a raw
top-N-by-population list would include many huge but visually generic
sprawl cities indistinguishable from one another by streets alone, which
would make "recognize the city from its road pattern" unwinnable for most
of them. Coordinates are reused as-is from `world_largest_cities.json`
(no re-geocoding). See the script's header comment for the full list and
each city's distinctive feature.

9. **Higher or Lower** (`/games/higher-or-lower`) — two modes (Population,
   Area): a reference country is shown on the left with its value, a second
   country on the right with its value hidden — guess whether it's higher
   or lower; POINTS, scored as the length of the correct streak (ends on
   the first wrong guess, matching the classic "higher/lower" mechanic).
   This is the one game whose round shape doesn't fit `useRoundGame` (no
   fixed shuffled order — an open-ended streak instead), so it has its own
   state shape/factory (`HigherLowerState`/`getHigherLowerState` in
   `lib/state/gameAtoms.ts`) rather than reusing `RoundGameState`.

`public/data/country_stats.json` population + area (km²) come from
GeoNames' `countryInfo.txt`, cross-referenced by ISO alpha-2 against the
existing 197-country list in `world_countries.json` (id/name/lat/lng/
flagUrl reused from there rather than re-derived) —
`scripts/build-country-stats.js`. Kept as its own data file rather than
adding population/area fields onto `world_countries.json` itself, so as
not to risk the 6 continent games that already depend on that file's exact
shape.

10. **Unofficial States & Territories** — 6 separate games (`/games/
    de-facto-states`, `/games/autonomous-territories`, `/games/
    disputed-territories`, `/games/separatist-movements`, `/games/
    historical-states`, `/games/micronations`), each with a *Flags* mode
    (flag shown, type the name) and a *Map* mode (a filled-in outline shown
    on `MapView`, zoomed to fit that one entity — `regionsData` holding only
    the single target feature, same trick `CityStreetsMode` already relies
    on for its per-city zoom — type the name), both POINTS. Started as a
    scoped-down, Europe-only answer to issue #2's original ask; expanded
    worldwide with all 6 named types as modes of one game per explicit
    follow-up direction; then split into 6 separate games and given the Map
    mode per issue #7. Each game is one category from issue #2's original
    wording, deliberately curated rather than exhaustive — same "small
    well-documented set, note what's excluded" approach as every other
    data-filtering decision in this codebase:
    - **De Facto States** (7): Kosovo, Northern Cyprus, Transnistria, South
      Ossetia, Abkhazia, Taiwan, Somaliland.
    - **Autonomous Territories** (22): recognized as part of a sovereign
      state but with their own flag and real self-government — Greenland,
      Faroe Islands, Hong Kong, Macau, Scotland, Wales, Northern Ireland,
      Åland Islands, Puerto Rico, Gibraltar, Isle of Man, Jersey, Guernsey,
      Aruba, Curaçao, Sint Maarten, Bermuda, Cook Islands, Niue, American
      Samoa, Guam, Kurdistan Region.
    - **Disputed Territories** (5, deliberately small): Western Sahara,
      Donetsk People's Republic, Luhansk People's Republic, Kherson Oblast
      (Russian-administered), Zaporizhzhia Oblast (Russian-administered) —
      unlike every other mode here, this one *does* include active/ongoing
      disputes (per explicit direction), not just long-settled cases.
      Excludes Kashmir and the Golan Heights: neither has a flag distinct
      from the states disputing them, so there's nothing to actually
      show/guess. Kherson/Zaporizhzhia were added per issue #15 (prompted by
      the Wikipedia article on the 2022 Russian annexation of Donetsk,
      Kherson, Luhansk and Zaporizhzhia oblasts): unlike Donetsk/Luhansk —
      pre-existing 2014 separatist "People's Republics" with their own
      branding — Russia annexed Kherson/Zaporizhzhia directly as its own
      federal subjects with no separate breakaway government, but it did
      present/adopt a distinct flag for each as a federal subject (all four
      flags — DPR, LPR, and the new Kherson/Zaporizhzhia ones — were
      presented 30 Sept 2022 and formally adopted 4 Oct 2022), which is what
      clears this dataset's bar (a real, distinct, sourceable flag) the same
      way it excludes Kashmir/Golan Heights above. Wikidata carries these as
      their own "federal subject of Russia" items, distinct from Ukraine's
      own same-named oblasts (Q114331288 "Kherson Oblast", Q114333615
      "Zaporozhye Oblast"), each with its own P41 flag/P36 capital/P625
      coordinate — no overrides needed, though note Zaporozhye Oblast's P36
      capital resolves to Melitopol, not Zaporizhzhia city itself (which has
      remained Ukrainian-held throughout, so Russia's occupation
      administration is actually seated in Melitopol instead — an accurate
      reflection of the claim, not a data error).
    - **Separatist Movements** (4): Catalonia (shown with the Estelada —
      the movement's own flag, distinct from Catalonia's official flag),
      Bougainville, Kanaky/New Caledonia (shown with the FLNKS flag),
      Padania. Screened to movements represented by a real, distinct flag
      used by a *legitimate political* movement/party — explicitly
      excludes militant/currently-designated-terrorist organizations (e.g.
      Tamil Eelam/LTTE, Balochistan insurgent groups, West Papua's OPM,
      Chechnya/Ichkeria) even though Disputed Territories does include
      active disputes; that's a distinction between "politically sensitive
      but peaceful" and "armed conflict/terror designation," not a
      contradiction.
    - **Historical States** (11, 20th-century-dissolved cutoff — otherwise
      unbounded): Soviet Union, Yugoslavia, Czechoslovakia, East Germany,
      Austria-Hungary, Ottoman Empire, United Arab Republic, South Vietnam,
      Zaire, Prussia, Republic of Artsakh (Nagorno-Karabakh's de facto
      government, dissolved 2024 — belongs here now rather than Disputed
      Territories since it no longer exists as an active claim).
    - **Micronations** (5, lowest sensitivity): Sealand, Molossia,
      Liberland, Ladonia, Kugelmugel.

`public/data/unofficial_states.json` (Flags mode data, shared read-only
across all 6 games) is plain GeoJSON (`Point` geometry per entity, a
`properties.category` field matching each game's slug exactly) rather than
the "points" envelope, purely so it satisfies `CountryFeature`'s existing
type shape and `FlagsMode` needed only one small change — see below. Flags
come from flagcdn.com where a code already exists (most autonomous
territories, matching `world_countries.json`'s convention) or Wikidata
property P41 (Commons `Special:FilePath`) otherwise; capitals from P36,
coordinates from P625 — via `scripts/build-unofficial-states.js`, with
documented per-entity overrides where the raw Wikidata value would be
misleading (e.g. the Ottoman Empire's P36 capital is Söğüt, the dynasty's
13th-century founding capital, not Constantinople/Istanbul; Czechoslovakia's
P41 flag file is literally named "Flag of the Czech Republic.svg" since the
Czech Republic kept the same design after the 1993 split — the dedicated
"Flag of Czechoslovakia.svg" file is used instead for clarity). `iso2` is
*not* a real ISO 3166-1 code for any of these — a locally-invented short id
kept only to satisfy the shared type.

`public/data/unofficial_states_borders.json` (Map mode data, added for issue
#7) is a *separate* file rather than repurposing `unofficial_states.json`'s
own `Point` geometry — same "own file, join by name" precedent as
`country_stats.json`/`country_coat_of_arms.json` not being bolted onto
`world_countries.json`. It only has a feature for the 45 of 49
non-Micronation entities a real public boundary source actually exists for
— De Facto States (all 7, via Natural Earth's Admin-0 Map Subunits layer for
most + OpenStreetMap/Nominatim for Transnistria/South Ossetia/Abkhazia,
which aren't in Natural Earth), Autonomous Territories (all 22, Map
Subunits), Disputed Territories (all 5 — Western Sahara via Map Subunits;
Donetsk People's Republic, Luhansk People's Republic, Kherson Oblast
(Russian-administered), and Zaporizhzhia Oblast (Russian-administered) all
via Natural Earth's Admin-1 States/Provinces layer instead, matched to each
entity's underlying pre-war Ukrainian oblast by name — see below), Separatist
Movements (3 of 4 — Padania was never formally bounded by any administrative
act), Historical States (8 of 11 — via `aourednik/historical-basemaps`, one
representative year per entity rather than a multi-era slider; United Arab
Republic/South Vietnam/Republic of Artsakh excluded, see `scripts/
build-unofficial-states-borders.js`'s header for why each specifically
doesn't have a trustworthy match). All 5 Micronations are excluded
entirely — no real administrative boundary exists at any usable scale for
an offshore platform, a family's yard, or a single house. Per explicit
product direction, this is meant to be additive, not a hardcoded exclusion
list elsewhere: a category with zero border features (only Micronations,
today) simply doesn't show a Map mode button at all, and any entity gains
one automatically the next time this file is rebuilt with more coverage —
see `components/games/UnofficialStatesGamePage.tsx`'s `effectiveGame`
mode-filtering.

Donetsk/Luhansk People's Republics and Kherson/Zaporizhzhia Oblast
(Russian-administered) all draw their Map mode border from the same place:
their underlying pre-war Ukrainian oblast's own Natural Earth Admin-1
boundary — i.e. the internationally-recognized Donetsk/Luhansk/Kherson/
Zaporizhzhia Oblast administrative shape each entity is named after and
claims the whole of, not the actual current front line/line of control
(which shifts constantly and would go stale within weeks of any rebuild).
This was a deliberate research decision for issue #15 (prompted by the
Wikipedia article on the 2022 Russian annexation of these four oblasts):
Nominatim was re-tried for the "People's Republic" names specifically
(English and Russian) and still returned nothing usable, confirming this
file's previous documented finding — but it also quotes Kremlin
spokesperson Dmitry Peskov stating Russia's Donetsk/Luhansk annexation
uses "their 2014 borders" (i.e. the Soviet-era oblast boundary, the same
one used here), while Kherson/Zaporizhzhia's borders were, per the same
article, "not legally defined" by Russia at all — making the oblast's own
official boundary the best-documented, most defensible stand-in available
for those two as well. This also mirrors how Western Sahara's own feature
in this file already works (the historical Spanish Sahara territorial
extent, not just the Polisario-controlled Free Zone east of the berm) —
both represent the maximal claimed/administrative territory, not
moment-to-moment military control.

`components/games/FlagsMode.tsx`'s optional `modeSlug` prop (defaulting to
`"flags"`, so its other callers — every countries-`<continent>` game, and
now each of these 6 separate games — are unaffected) predates the split
(originally needed so 6 categories sharing *one* game could each get
independent round-state/leaderboard keying); now that each category is its
own gameSlug, the default alone is enough, but the prop itself stays for the
same reason `components/games/RoadsMode.tsx`'s own `modeSlug` prop exists.
`components/games/MapGuessMode.tsx` is the new Map mode component — same
round shape as `FlagsMode` (one full pass, POINTS), a filled `MapView`
shape instead of a flag image as the clue; it also picks `"pacific"`
instead of the default `"mercator"` projection per-round when the target
entity's own longitude span exceeds 180° (only the Soviet Union's Chukotka
Peninsula triggers this today), same antimeridian-seam fix as Oceania's
countries game, just decided per-target instead of hardcoded to one
game/continent. As originally shipped this fit the target to its own
bounding box alone (the same `CityStreetsMode` per-city-zoom trick) — issue
#11 reported that this gave players no sense of where on Earth the shape
actually was, and made the zoom level jump around round to round depending
on each entity's own bounding box (a huge one like the Soviet Union framed
very differently than a compact one like Gibraltar). Fixed by drawing the
target together with `fetchWorldBackdrop()`'s modern-day country outlines
as a light, non-interactive backdrop (same layering trick
`EmpireHistoryViewer` already uses, see below) — `fitSize`/`fitExtent` runs
over the *combined* set, so every round now frames at the same whole-world
zoom level regardless of the target's own extent, with the target
highlighted on top and the player free to zoom in via `MapView`'s existing
zoom controls for a closer look. `fetchWorldBackdrop` itself moved from
`lib/info/data.ts` to `lib/games/data.ts` (the former now just re-exports
it) once a games component needed it too — it never depended on anything
Empires-specific, just `RegionFeature`.
`components/games/UnofficialStatesGamePage.tsx` is a shared
page body all 6 route files render (each still its own `page.tsx` — Next.js
needs a real file per route — passing only its own `gameSlug`, since all 6
would otherwise duplicate identical fetch/filter/mode-gating logic): it
fetches both data files, filters each by `properties.category === gameSlug`
(the category slugs were chosen to exactly match the registered game slugs,
so no separate switch statement, unlike Swedish Roads' `filterByMode`), and
computes the `effectiveGame` passed to `GameShell` — `game.modes` from the
registry always includes both `"flags"` and `"map"` (even for Micronations)
so a future data addition needs no registry change, but `effectiveGame`
drops `"map"` from the *button list* when zero border features were found
for that category.

11. **National Coat of Arms** (`/games/national-coat-of-arms`) — one mode,
    *Coat of Arms*: a country's coat of arms is shown, type which country it
    belongs to; POINTS. `components/games/CoatOfArmsMode.tsx` is copy-adapted
    from `FlagsMode.tsx` (same sibling pattern as Capitals/CountriesMap/
    Flags) rather than reusing it directly, since the data is points-shaped
    (`CountryCoatOfArms`, not `CountryFeature`) and the image box uses
    `object-contain` on a white background instead of `object-cover` — coats
    of arms have far more varied aspect ratios and transparent backgrounds
    than flags, so cropping to fill a wide rectangle chops off real content
    in a way that never happens with a flag.

`public/data/country_coat_of_arms.json` coat-of-arms images come from
Wikidata (property P94), matched by ISO alpha-2 (P297) against the existing
197-country list in `world_countries.json` (id/name/lat/lng reused from
there, same "kept as its own file" precedent as `country_stats.json`) —
`scripts/build-country-coat-of-arms.js`. Image URLs are Wikimedia Commons
`Special:FilePath` links (redirect straight to the current file, Wikimedia's
documented stable hotlink form — same "reference directly, never download"
approach as flagcdn.com elsewhere in this codebase). Wikidata's bulk SPARQL
query service can lag a few days behind live edits, so a country whose P94
value is genuinely present but not yet indexed there (seen for Turkey as of
this script's original run) is caught by a live per-entity fallback lookup
rather than being silently dropped — see the script for both paths.

## Informational pages (`/info`)

A second, non-game content section for read-only geography content (issue
#3) — no scoring, no leaderboard, no `useRoundGame`. `lib/info/registry.ts`
mirrors `lib/games/registry.ts`'s pattern (a typed array + `getInfoPage(slug)`
lookup) but is a deliberately separate registry/data module
(`lib/info/data.ts`), not an extension of the games one, since this content
doesn't share any game data envelope. `app/info/page.tsx` is a hub/list page
structurally identical to `app/games/page.tsx` (search + card list). Reached
from `components/Header.tsx`'s "Info" link, shown next to "Play Games" only
when signed in — like every other page route, `/info/*` is already gated by
`proxy.ts`'s existing "everything except /, /sign-in, /sign-up" matcher, so
no middleware changes were needed.

1. **Empires Through History** (`/info/empires`, issue #4) — pick an empire,
   drag a slider through the eras it's tracked at, see its border on a world
   map. `components/info/EmpireHistoryViewer.tsx` reuses `MapView` (not
   `GlobeView` — same click-precision-vs-rotation reasoning as every other
   region game) with two combined layers: the 6 existing continent files
   merged client-side (`fetchWorldBackdrop()`, in `lib/games/data.ts` — also
   reused by the Unofficial States "Map" mode, see issue #11 above) as a
   neutral modern-day backdrop for orientation, and the selected empire's
   single era polygon highlighted on top. No click interaction, no scoring —
   `onRegionClick` is simply omitted.

   `public/data/empires_history.json` border polygons come from
   `aourednik/historical-basemaps` (GitHub), a collection of ~54 world
   political-border snapshots by year — **GPL-3.0 licensed**, a deliberate,
   flagged-and-accepted exception to every other geo source this project
   uses elsewhere (Natural Earth/GeoNames/geoBoundaries/OSM are all public-
   domain or permissively licensed) — `scripts/build-empires-history.js`.
   Only 4 empires are covered, each one this dataset happens to track under
   one *stable, single* name across many years: Ottoman Empire (14 eras,
   1400-1914), Byzantine Empire (8 eras, 800-1400), Russian Empire (6 eras,
   1783-1914), Mongol Empire (only 2 eras, 1100 and 1200 — the dataset
   doesn't track it as one polity outside that narrow window). Deliberately
   excludes empires the dataset only tracks as several separately-named
   constituent territories per year (e.g. no single "British Empire" feature
   exists in any year — only holdings like "British Raj"/"British
   Somaliland" — so stitching those together would mean the build script
   inventing a classification the source data doesn't make), chains of
   historically distinct empires that happen to share a region (Achaemenid/
   Sassanid/Safavid/Qajar Persia are different empires across different
   centuries, not one continuous state), and — caught by manually inspecting
   bounding boxes before trusting the data, not assumed — the Ottoman
   Empire's own 1920/1930 snapshots, which turned out to be an identical,
   already-collapsed-to-central-Anatolia placeholder in the source dataset
   rather than an accurate picture of its actual final years, so those two
   were dropped rather than presented as real history.

## Infra / deployment status

- **GitHub**: `https://github.com/GITZMBE/Geo-quizzes.git` (repo has been
  renamed twice — `Geo-quiz` → `Geo-quizes` → `Geo-quizzes`; local folder and
  all in-repo references renamed to match each time — `geo-quizzes` is the
  canonical slug used in `package.json`, Docker Postgres credentials, etc.)
- **Database**: Neon Postgres, project `geo-quizzes` (id
  `patient-shape-66081015`, region `aws-eu-central-1` — id and connection
  hostname are stable across the project's display-name renames). Connection
  string is in the local `.env` only (never committed). Initial migration has
  been applied directly against it.
- **Netlify**: site `geo-quizzes` (account `gitzmbe`) is linked to
  `GITZMBE/Geo-quizzes` on branch `master` for continuous deployment (reusing
  the account's existing GitHub App installation — linked via the Netlify API
  since local `netlify deploy` can't work on Windows: the Next.js plugin's
  packaging step needs symlinks, which are unprivileged-blocked on Windows).
  `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL` are set as env vars.
  `netlify.toml` build command runs `prisma migrate deploy && prisma generate`
  before `next build`, so schema migrations apply automatically each deploy.
  **Verified live and working** (`/api/games/*/leaderboard` returns 200,
  login redirect gating works, `/api/auth/session` clean) as of the
  `@prisma/adapter-neon` + `engineType = "client"` fix — this took several
  deploy cycles to get right, see the Prisma bullet above for the two dead
  ends already ruled out.
- **Auth**: switched from Google OAuth to a Credentials (email/password)
  provider — see the architecture bullet above. No `AUTH_GOOGLE_*` env vars
  needed anywhere anymore.
