# Geo Quizzes

Interactive geography quiz app. Sign up with an email and password to play map-based quizzes and climb the leaderboards.

## Stack

- **Next.js** (App Router, TypeScript) — frontend + API routes in one app
- **Tailwind CSS v4** — theme tokens defined in `app/globals.css` (`@theme`), used as `bg-primary`, `text-error`, etc.
- **nanostores** — client-side game state (`lib/state/useGameState.ts` wraps it with a `useRecoilState`-like API)
- **react-globe.gl** — interactive map/globe visualizations, driven declaratively via props (`components/GlobeView.tsx`)
- **Prisma + PostgreSQL** — users, games, scores (via `@prisma/adapter-neon`, no native query-engine binary — required for this to run in a Netlify Function at all)
- **Auth.js (NextAuth v5)** — email/password Credentials provider + bcrypt, JWT sessions (`lib/auth.config.ts` is the Edge-safe base used by `proxy.ts`; `lib/auth.ts` extends it with the real `authorize()` + Prisma adapter for use in routes/pages)
- **Docker** — app + Postgres via `docker-compose.yml`

## Games

- **Stockholm Districts** (`/games/stockholm-stadsdelar`) — a district is named, click its outline on the map.
- **Sweden's Biggest Cities** (`/games/sweden-cities`) — three modes:
  - *Type them all* — free recall of the top 100 cities, ranked list as you go.
  - *Click the city* — a city is named, click its dot on the map.
  - *Guess the location* — 5 random cities, click your guess, scored by proximity.
- **Five Cities Across the World** (`/games/world-cities`) — 5 random of the world's biggest cities, click your guess on the globe, scored by proximity.
- **US States** (`/games/us-states`) — a state is named, click its outline on the map.
- **List All Countries** (`/games/world-countries`) — free recall of all 197 sovereign countries.
- **Countries of Africa/Asia/Europe/North America/South America/Oceania** (`/games/countries-<continent>`) — three modes each: click a country's outline, type its capital, or name it from its flag.
- **Swedish Roads** (`/games/swedish-roads`) — a road's route is highlighted on the map, type its route number.
- **Guess the City** (`/games/city-streets`) — only a major city's street network is shown (no labels or borders), type which city it is.
- **Higher or Lower** (`/games/higher-or-lower`) — two modes (Population, Area): a reference country's value is shown, guess whether the next country's is higher or lower.

Game data lives in `public/data/*.json`. `lib/games/registry.ts` is the source of truth for game/mode slugs used by the UI and the API routes.

## API

- `POST /api/auth/register` — create an account (`{ email, password, name? }`).
- `POST /api/scores` — submit a result (`{ gameSlug, mode, value }`), requires auth.
- `GET /api/games/[slug]/leaderboard?mode=<mode>` — top 10 scores for a game/mode.
- `GET|POST /api/auth/*` — handled by Auth.js.

## Local development

```bash
cp .env.example .env   # fill in DATABASE_URL, AUTH_SECRET
npm install
npx prisma migrate dev
npm run dev
```

Generate `AUTH_SECRET` with `npx auth secret`.

## Docker

```bash
docker compose up --build
```

Runs the app + a Postgres container. Set `AUTH_SECRET` in your shell/`.env` before starting — `docker-compose.yml` passes it through.

## Deployment

Configured for **Netlify** (`netlify.toml`, `@netlify/plugin-nextjs`). Set the same env vars (`DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`) in the Netlify site's environment settings — the local Dockerized Postgres is dev-only, production needs a reachable hosted Postgres instance (this project uses Neon).
