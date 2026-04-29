# Phased Development Plan

This plan accompanies `DESIGN.md`. Each phase produces a working, testable artifact. Do not skip ahead — earlier phases establish the foundations that later phases assume. Run lint, typecheck, and tests at the end of every phase; do not advance with red.

The reference implementation at `glenncj3/draft-mension-20` is available throughout. Consult it for: Tailwind config, ESLint flat config, the image pipeline, the ability registry pattern, and general code style. Adapt, don't copy wholesale — this is a new project.

---

## Phase 0 — Bootstrap

**Goal:** an empty project that mirrors the `draft-mension-20` stack, builds, lints, typechecks, and runs one trivial test.

**Tasks:**

1. `npm create vite@latest -- --template react-ts` in a new directory.
2. Install runtime dependencies: `@supabase/supabase-js`, `lucide-react`, `@fontsource/inter`, `@fontsource/bangers`, `zustand`.
3. Install dev dependencies: `tailwindcss`, `postcss`, `autoprefixer`, `vitest`, `happy-dom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `sharp`.
4. Configure Tailwind (`tailwind.config.js`, `postcss.config.js`, base CSS with `@tailwind` directives, font imports).
5. Configure ESLint with a flat config (`eslint.config.js`) mirroring the reference repo's setup.
6. Configure Vitest in `vite.config.ts` with `test: { environment: 'happy-dom', setupFiles: ['./src/test/setup.ts'] }`. Setup file imports `@testing-library/jest-dom`.
7. Split `tsconfig.app.json` and `tsconfig.node.json`. Add `typecheck` script: `tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit`.
8. Copy `scripts/convert-images.mjs` from the reference repo. Add `convert-images` script in `package.json`.
9. Create `.env.example` with `VITE_SUPABASE_URL=` and `VITE_SUPABASE_ANON_KEY=`. Add `.env` to `.gitignore`.
10. Replace `App.tsx` with a placeholder rendering the working title.
11. Add a trivial smoke test (`src/App.test.tsx`) that asserts the title renders.
12. Do **not** carry over `.bolt/` artifacts. Set a fresh `name` in `package.json`.

**Exit criteria:**

- `npm run dev` opens a page rendering the placeholder title.
- `npm test` passes (one test, green).
- `npm run lint` passes with zero warnings.
- `npm run typecheck` passes.

---

## Phase 1 — Domain types and pure game engine

**Goal:** a fully-tested game engine with no UI, no abilities, no networking. The engine is the heart of the system; everything later depends on it being correct and deterministic.

**Tasks:**

1. Create `src/types/` with the type definitions from `DESIGN.md` §6–§7: `Card`, `UnitCard`, `ActionCard`, `PlacedCard`, `GameState`, `Player`, `CellIndex`, `Stat`, `Trigger`, `AbilityInstance`.
2. `src/engine/rng.ts`: seedable xorshift32 PRNG. Exposes `createRng(seed: number)` returning `{ next(): number; nextInt(max: number): number; shuffle<T>(arr: T[]): T[] }`. The shuffle must be deterministic given the same seed.
3. `src/engine/board.ts`: helpers for adjacency. `getNeighbors(cell: CellIndex): { cell: CellIndex, direction: 'up' | 'down' | 'left' | 'right' }[]`.
4. `src/engine/flip.ts`: `computeFlips(state, cellIndex)` returns the list of neighbor cells that flip given the card at `cellIndex`. Uses the same-named-stat rule from `DESIGN.md` §4.
5. `src/engine/resolve.ts`: `resolvePlacement(state, cellIndex)` runs the chain (steps 4–5 of §5). Returns the new state. **No ability triggers yet** — that's Phase 3. Just stat comparisons and flips.
6. `src/engine/place.ts`: `placeCard(state, cardInstanceId, cell)` validates legality (cell empty, card in current player's hand, current player's turn), constructs the `PlacedCard`, calls `resolvePlacement`, increments turn/placementCount, transitions to ended state if 9th placement.
7. `src/engine/score.ts`: `scoreBoard(state)` returns `{ bottom: number, top: number, winner: Player | 'draw' }`.
8. `src/engine/draw.ts`: pure functions `drawCards(state, player, count)` returning new state with cards moved from deck to hand.
9. `src/engine/setup.ts`: `createInitialState({ seed, deckAssignment, decksById })` builds a fresh `GameState` ready for turn 1. Includes shuffling and initial 5-card draw.
10. Hardcode a placeholder card set sufficient for testing in `src/test/fixtures.ts` (e.g., 4 unit cards with varied stats).
11. **Tests** (Vitest, in `__tests__` adjacent to each file or in `src/engine/__tests__/`):
    - RNG determinism: same seed → same shuffle output.
    - Comparison rule on each of the four sides.
    - Tie does not flip.
    - Single-flip placement.
    - Multi-flip from one placement (card in middle, 4 weaker neighbors).
    - Chain flip (placement flips A, A flips B, both new flips occur).
    - Chain does not loop (a flipped card cannot flip the placer).
    - Corner placement (only 2 neighbors).
    - Edge placement (only 3 neighbors).
    - Win, loss, and draw conditions on full board.
    - Setup: deterministic deck assignment, shuffle, and initial draw given a seed.

**Exit criteria:**

- All engine functions covered by tests; tests pass.
- Lint, typecheck, test all green.
- Engine is fully deterministic: given a seed and a sequence of moves, two independent runs produce identical states.

---

## Phase 2 — Local hot-seat UI

**Goal:** a playable, stat-only game on a single screen. Two players share one machine. No abilities. No menu. No multiplayer. This phase exists to surface UI bugs early using only the engine logic from Phase 1.

**Tasks:**

1. Set up Tailwind theme: minimal palette, typography using Inter and Bangers, basic spacing tokens.
2. Create `useGameStore` (Zustand) with state matching `GameState` plus a `mode: 'hot-seat'` flag for now. Actions: `startGame()`, `placeCard(cell, cardInstanceId)`, `selectCard(cardInstanceId)`, `resetGame()`.
3. `<Board>`: renders a 3×3 grid of `<Cell>` components.
4. `<Cell>`: empty (clickable when a card is selected) or contains a `<Card>`.
5. `<Card>`: renders name and four stats positioned on the four edges. Apply `rotate-180` when `controller === 'top'`. Use `transition-transform duration-300` for flip animation.
6. `<Hand>`: renders the active player's hand. For hot-seat, both hands are visible (the simplest hot-seat UX). Add a `currentPlayer` indicator.
7. Selection model: clicking a card in hand selects it (highlight); clicking an empty cell places it; clicking the same card again deselects.
8. `<Scoreboard>`: shows live count of cards controlled per player.
9. After the 9th placement resolves, render a `<GameOver>` overlay with the winner and a "Play Again" button that calls `resetGame()` and starts a new hot-seat game with fresh decks.
10. Two placeholder decks of stat-only cards in `src/data/decks.ts` and `src/data/cards.json`. Ten distinct cards is fine; duplicate to fill 20-card decks.
11. **Tests** (RTL):
    - Initial render shows two hands of 5 cards.
    - Clicking a hand card and then an empty cell places the card on the board.
    - Flips render with the rotated controller orientation.
    - Score updates after a flip.
    - Game-over overlay appears after the 9th placement.

**Exit criteria:**

- A full hot-seat game is playable from start to finish.
- Flips animate visibly.
- Score and turn indicator are always correct.
- Lint, typecheck, test all green.

---

## Phase 3 — Ability and effect system

**Goal:** abilities trigger correctly. Action cards work.

**Tasks:**

1. Review `glenncj3/draft-mension-20`'s ability registry implementation. Adapt the pattern.
2. `src/abilities/types.ts`: `AbilityHandler`, `AbilityContext`, `AbilityDelta` (a structured description of state changes).
3. `src/abilities/registry.ts`: registry map. Export `getHandler(abilityId)`.
4. `src/abilities/handlers/` directory with one file per starter ability:
   - `statBuffSelf.ts`
   - `statBuffTarget.ts`
   - `statDebuffTarget.ts`
   - `drawCard.ts`
   - `playFromDeck.ts`
5. `src/engine/triggers.ts`: trigger queue. Functions:
   - `fireTriggers(state, trigger, source, controller, cellIndex?)` — looks up matching abilities on the source card, invokes handlers, applies deltas in order.
   - Integrate into `resolvePlacement`: fire `on-play` before initial flip evaluation, fire `on-flip` after each flip, fire `on-end-of-turn` at end of turn.
6. `src/engine/playAction.ts`: `playActionCard(state, cardInstanceId)` — validates (card in hand, type === 'action'), fires `on-play` triggers, moves card to discard. Does not advance the turn (action cards don't count toward placement).
7. Update `src/data/cards.json` to add abilities to several existing cards and add 2–3 action cards. Action cards should each include a `draw-card` or `play-from-deck` ability so they replace themselves.
8. Update Phase 2 UI: the hand renders action cards distinctly (different border/badge); clicking an action card plays it immediately rather than entering placement mode. Show action card resolution briefly in the UI before discarding.
9. Cap action-resolution depth at 16 (per `DESIGN.md` §11) — log a warning and abort the chain on overflow.
10. **Tests:**
    - Each starter ability in isolation, given a fixture state.
    - `on-play` ability that buffs the placed card's own stat changes flip outcomes correctly.
    - `on-flip` ability triggers when card is flipped and not when placed.
    - `on-end-of-turn` fires at the right moment.
    - Action card resolves and is discarded; player draws replacement.
    - Action card with `play-from-deck` puts a unit card on the board without consuming the placement turn.

**Exit criteria:**

- Cards with abilities behave per spec.
- Action cards playable and self-replacing.
- Lint, typecheck, test all green.

---

## Phase 4 — AI opponent

**Goal:** single-player mode against the heuristic AI from `DESIGN.md` §13.

**Tasks:**

1. `src/ai/heuristic.ts`: scoring function `scoreMove(state, cardInstanceId, cell): number`. Simulate placement (using engine), count flips, add corner/edge bonus. Use `rng.next()` for tie-breaking so AI behavior is deterministic given a seed.
2. `src/ai/play.ts`: `aiTakeTurn(state, rng): GameState` — runs the action phase per spec, then picks the best placement and applies it. Returns the post-turn state.
3. Add a `mode: 'ai'` to `useGameStore`. When `mode === 'ai'` and `turn === 'top'` after a player move, schedule `aiTakeTurn` with a 600ms delay (so the player can read the board).
4. Add a minimal main menu (`<Menu>`) with two buttons: "Play vs AI" and "Hot-seat" (keep hot-seat for testing). Start the appropriate mode on click. The full menu lands in Phase 6.
5. **Tests:**
    - Given a contrived state where one move flips 3 cards and another flips 1, AI picks the 3-flip move.
    - Given a tie between two moves, AI picks deterministically based on seeded RNG.
    - AI never picks an illegal move.
    - AI plays an action card when below the hand-size threshold.

**Exit criteria:**

- A full game vs AI plays without error.
- AI never soft-locks (always finds a legal move when one exists).
- Lint, typecheck, test all green.

---

## Phase 5 — Multiplayer

**Goal:** 1v1 over Supabase Realtime Broadcast with desync detection.

**Tasks:**

1. **Supabase setup:**
   - `supabase/migrations/001_rooms.sql`: create the `rooms` table per `DESIGN.md` §12. Include RLS policies allowing anonymous insert, select, and update.
   - Document the setup steps in the README.
2. `src/net/supabase.ts`: singleton client constructed from env vars.
3. `src/net/roomCode.ts`: generator for 6-character codes from the alphabet `[A-HJ-NP-Z2-9]`.
4. `src/net/room.ts`: `createRoom(hostName)`, `joinRoom(code, joinerName)`, `getRoom(code)`. Returns row data plus a Realtime channel handle.
5. `src/net/channel.ts`: thin wrapper around Supabase Realtime Broadcast. Exposes `broadcast(event)` and `onEvent(handler)`. Events match `DESIGN.md` §12: `init`, `move`, `hash`.
6. `src/engine/hash.ts`: `hashState(state): string`. Canonicalize the state (sorted keys, no functions, normalize Map/Set order) and FNV-1a hash the JSON.
7. **Lobby UI:**
   - `<HostLobby>`: shows generated code with a copy button, host display name input (saved to localStorage), waiting indicator. When joiner connects, broadcasts `init` and transitions to game screen.
   - `<JoinLobby>`: code input, joiner display name input. On submit, validates code, joins channel, waits for `init`, transitions to game screen.
8. **Multiplayer game flow:**
   - When `init` arrives, both clients run identical setup with the shared seed and deck assignment.
   - Local player's moves dispatch through the engine AND broadcast a `move` event.
   - Remote moves arriving via `move` are applied through the same engine.
   - After each move, both clients compute and broadcast `hash`. On mismatch, surface a "desync detected" toast and transition to a `screen: 'desync'` error state with a "Return to menu" button. Do not auto-recover.
9. **Determinism test (critical):** a Vitest test that constructs an init payload + a sequence of moves, runs the resolver twice, and asserts identical final states and identical hashes at every step. This is the single most important test of this phase.
10. **Tests:**
    - Hash function: identical state → identical hash; minimal state difference → different hash.
    - Room code generator: never produces ambiguous chars.
    - Resolver determinism (above).

**Exit criteria:**

- Two browsers (or two tabs) on the same Supabase project can play a full game.
- Desync detection fires when forced (e.g., manually mutate one client's state mid-game).
- Lint, typecheck, test all green.

---

## Phase 6 — Polish

**Goal:** the game is something you'd send to a friend.

**Tasks:**

1. `<Menu>` with three primary buttons: "Play vs AI", "Host friend game", "Join friend game". Display name input persisted in localStorage.
2. `<Results>` screen showing the final board, the winner, and "Back to menu" / "Rematch" buttons. (Rematch only for vs AI in this phase; rematch in multiplayer is deferred unless trivial.)
3. Card art pipeline: drop placeholder PNGs into `public/images/`, run `npm run convert-images` to emit AVIF/WebP siblings. `<Card>` uses a `<picture>` element preferring AVIF then WebP then PNG.
4. Animations: card draw (slide in from deck), card place (scale + fade), flip (the existing rotation transition), score increment (number tween).
5. README: setup instructions, env vars, Supabase migration steps, deploy notes.
6. (Optional, time-boxed) Sound effects: place, flip, victory.
7. (Optional) Vercel or Netlify deploy config; not on the critical path.

**Exit criteria:**

- All three play modes accessible from the main menu.
- Game looks intentional, not scaffolded.
- README is sufficient for someone else to clone and run.
- Lint, typecheck, test all green.

---

## Standing rules across all phases

- **No phase ships with red.** Lint, typecheck, and tests must all pass before moving on.
- **Engine purity.** Functions in `src/engine/` and `src/abilities/` must be pure (no I/O, no `Date.now()`, no `Math.random()` — use the seeded RNG). This is what makes multiplayer determinism work.
- **Imports.** Prefer named imports. Avoid default exports for non-component modules.
- **Tests live next to the code** they test (`foo.ts` + `foo.test.ts`) unless a separate `__tests__/` directory is meaningfully cleaner.
- **Card data is data.** Cards never contain functions; abilities are referenced by string ID. The registry is the only place where ability code lives.
- **One concern per file.** No 500-line files. If `resolve.ts` grows past ~200 lines, split it.
