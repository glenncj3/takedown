# Takedown

A 1v1 grid-based card game. Hobby project.

Two play modes:

- **Vs AI** — single-player against a heuristic opponent.
- **Vs friend** — two clients connect via a shared room code, exchanging
  moves over Supabase Realtime Broadcast.

The full design and phased build plan live in `DESIGN.md` and `PLAN.md`.

## Local dev

```bash
npm install
npm run dev
```

Open the URL Vite prints. The "Play vs AI" and "Hot-seat" buttons work
immediately. Multiplayer ("Host" / "Join") needs Supabase configured —
see below.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | ESLint over the project |
| `npm run typecheck` | tsc on app + node configs (no emit) |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest, watch mode |
| `npm run images:convert` | Convert `public/images/*.png` to AVIF + WebP siblings |

## Multiplayer setup (Supabase)

The multiplayer modes need a Supabase project. The trust model is
"clients trust each other" — there's no server-side validation; mismatched
state is detected via post-move hash exchange and surfaced as a desync
screen.

1. Create a free Supabase project at <https://supabase.com>.
2. In the SQL editor, run the migration from
   `supabase/migrations/001_rooms.sql`. This creates the `rooms` table
   and the row-level-security policies for anonymous access.
3. Enable **Realtime** for the project (Project Settings → Realtime).
   Broadcast channels work without enabling postgres_changes.
4. Copy `.env.example` to `.env` and fill in the project URL and the
   anon key (Project Settings → API).
5. Restart `npm run dev`.

To clean up stale rooms (rooms older than 1 hour with no joiner), run a
one-line cron in Supabase or just leave them — there is no security
boundary.

## Code map

```
src/
├── types/         Domain types (Card, GameState, etc.)
├── engine/        Pure game engine — placement, flip resolution, hash, RNG
├── abilities/     Ability registry + handler implementations
├── ai/            Heuristic AI opponent
├── net/           Supabase client, room ops, Realtime channel wrapper
├── store/         Zustand stores (game state + UI state)
├── components/    React components (Board, Hand, Card, Menu, lobbies, …)
├── data/          Card definitions and deck lists
├── test/          Shared test fixtures
└── App.tsx        Top-level screen router
```

## Reference

This project mirrors patterns from a sibling repo (`draft-mension-20`):
the Tailwind setup, the ESLint flat config, the image pipeline, and the
ability-registry pattern. The card data, game rules, and UI are
all original to this project.
