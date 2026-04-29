# Design Document — Card Game (working title TBD)

## Purpose of this document

This is the build spec for a new browser-based 1v1 card game. It is written to be the sole input for Claude Code; the human designer will not be available for clarification during the build. Reasonable engineering decisions not specified here are at Claude Code's discretion.

A reference implementation exists at `glenncj3/draft-mension-20`. Where that repo's patterns apply (notably the ability/effect registry, the Tailwind setup, the image pipeline, the ESLint flat config), Claude Code should adapt them rather than reinvent. This new project is a sibling, not a fork — it gets its own repo, its own card data, its own UI.

## 1. Overview

A 1v1 grid-based card game in the Triple Triad lineage, extended with action cards and triggered abilities. Two play modes:

- **Versus AI** — single-player against a heuristic opponent.
- **Versus friend** — two clients connect via a shared room code over Supabase Realtime Broadcast.

The game is a hobby project. There are no accounts, no persistence of game history, no anti-cheat requirements.

## 2. Glossary

- **Player** — one of `bottom` or `top`. The local user is always rendered as `bottom`; the opponent (AI or remote) is always rendered as `top`.
- **Controller** — the player who currently controls a placed card. A card's controller can change via flip.
- **Unit card** — a card with four stats and optional abilities. When played, it occupies a cell on the board.
- **Action card** — a card with no stats, only abilities. When played, its abilities resolve immediately and the card is discarded. Most action cards include a draw or play-from-deck effect so they replace themselves.
- **Cell** — one of nine positions on the 3×3 board.
- **Flip** — a change of a placed card's controller.
- **Chain** — a sequence of flips triggered by a single placement, propagating outward through subsequent flipped cards.

## 3. Board and orientation

The board is a 3×3 grid. Cells are indexed 0–8, row-major:

```
0 1 2
3 4 5
6 7 8
```

Cards are visually oriented by controller. Bottom-player cards are rendered right-side up; top-player cards are rotated 180°. Each card has four intrinsic stats stored in data: `top`, `bottom`, `left`, `right`. These never change in the data model based on orientation; only the visual position of each stat label changes.

## 4. Stat comparison and flip rule

When a card `C` controlled by player `P` is placed or flipped at cell `X`:

For each orthogonal neighbor `N` at cell `Y` where `N`'s controller ≠ `P`, compare each card's **touching-edge stat in its own data frame**:

- The touching edge is the one facing the neighbor.
- For an upright (bottom-controlled) card, the touching edge stat is named after the world direction: north-facing edge = `top`, south = `bottom`, west = `left`, east = `right`.
- For a 180°-rotated (top-controlled) card, the local frame is inverted: north-facing edge = `bottom`, south = `top`, west = `right`, east = `left`.

Concretely, for direction `d` from `C` to `N`:

```
C_stat = touchingEdgeStat(C.controller, d)
N_stat = touchingEdgeStat(N.controller, oppositeOf(d))
```

If `C.stats[C_stat] > N.stats[N_stat]`, `N` flips to `P`'s control. Ties do nothing.

Because `C` and `N` always have opposite controllers when a flip is possible (one upright, one rotated), `C_stat` and `N_stat` always end up being the same data label name — but it is **not** always the world-direction's name. Example: a top-controlled (rotated) placer above a bottom-controlled (upright) neighbor compares `C.top` vs `N.top`, because the rotated placer's south edge displays `data.top` (rotation moved that label from north to south). Treating the world-direction name as the stat name (e.g. always "down → bottom") produces the wrong answer when the placer is rotated.

This makes the visual touching-edge numbers — which is what the player sees — match the engine's flip decision exactly.

## 5. Turn flow

Each turn proceeds in this order:

1. **Action phase** — the active player may play zero or more action cards from hand. Each action card's abilities resolve immediately, then the card is discarded. Action cards do not count toward the alternating-placement turn structure.
2. **Placement phase** — the active player plays exactly one unit card from hand to an empty cell. (If they have no unit cards in hand and cannot generate one via an action card, they must pass — this is a soft-loss state; see §11.)
3. **On-play resolution** — abilities on the placed card with trigger `on-play` resolve. These may modify stats (including the placed card's own), draw cards, or trigger other effects.
4. **Initial flip resolution** — flip rule (§4) is evaluated against the placed card's neighbors using its current (possibly modified) stats.
5. **Chain resolution** — for each flipped card in evaluation order:
   1. `on-flip` abilities resolve.
   2. Flip rule is re-evaluated for that card against its opponent-controlled neighbors. Newly flipped cards enter the queue.
   3. Cards already flipped during this chain are not re-evaluated; chains never loop, because flipping unifies control between the flipper and flippee.
6. **End-of-turn resolution** — `on-end-of-turn` abilities resolve.
7. Turn passes to the other player.

The game ends when the 9th unit card is placed and its chain fully resolves. Final score = number of cards each player controls. Higher count wins; equal count is a draw.

## 6. Card data model

```ts
type Player = 'bottom' | 'top';
type CellIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type Stat = 'top' | 'bottom' | 'left' | 'right';
type Trigger = 'on-play' | 'on-flip' | 'on-end-of-turn';

interface AbilityInstance {
  abilityId: string;          // key into the ability registry
  trigger: Trigger;
  params?: Record<string, unknown>;
}

interface UnitCard {
  id: string;                 // unique card definition id
  type: 'unit';
  name: string;
  stats: { top: number; bottom: number; left: number; right: number };
  abilities?: AbilityInstance[];
  art?: string;               // path under public/images/
}

interface ActionCard {
  id: string;
  type: 'action';
  name: string;
  abilities: AbilityInstance[];
  art?: string;
}

type Card = UnitCard | ActionCard;
```

When a unit card is placed on the board, it becomes a `PlacedCard` instance, which carries mutable per-game state:

```ts
interface PlacedCard {
  card: UnitCard;             // reference to the definition
  instanceId: string;         // unique per game
  controller: Player;
  cellIndex: CellIndex;
  stats: { top: number; bottom: number; left: number; right: number };
  // ^ live stats; may differ from card.stats due to ability modifications
}
```

Stat modifications from abilities are permanent for the duration of the game and live on the `PlacedCard` instance, not the card definition.

## 7. Game state model

```ts
interface GameState {
  board: (PlacedCard | null)[];           // length 9
  hands: Record<Player, Card[]>;
  decks: Record<Player, Card[]>;          // top of deck = end of array
  discards: Record<Player, Card[]>;
  turn: Player;                           // whose placement turn it is
  placementCount: number;                 // 0..9
  phase: 'placing' | 'resolving' | 'ended';
  winner: Player | 'draw' | null;
  rngSeed: number;                        // for reproducibility
  moveSeq: number;                        // increments per move; for desync detection
}
```

State is treated as immutable per move; the engine returns new `GameState` objects rather than mutating.

## 8. Ability / effect system

This is the largest subsystem and should mirror the registry pattern in `draft-mension-20`. Claude Code should review that repo's implementation and adapt it.

**Triggers:** `on-play`, `on-flip`, `on-end-of-turn`. No passive auras.

**Registry:** a single map from `abilityId` to handler.

```ts
interface AbilityContext {
  state: GameState;
  source: PlacedCard | ActionCard;        // the card whose ability is firing
  controller: Player;                     // controller of the source at time of firing
  cellIndex?: CellIndex;                  // for unit cards on the board
}

type AbilityHandler = (
  ctx: AbilityContext,
  params: Record<string, unknown> | undefined
) => GameStateDelta;

const registry: Record<string, AbilityHandler> = { /* … */ };
```

Handlers are pure functions. They receive a context and params, return a delta describing changes (cells modified, cards drawn, stat changes applied, further triggers queued). The trigger resolver applies deltas to state in order.

**Starter ability set** (Phase 3 ships these; the designer will add more later):

- `stat-buff-self` — modify a stat on the source card. Params: `{ stat: Stat, amount: number }`.
- `stat-buff-target` — modify a stat on a target card. Params: `{ stat: Stat, amount: number, targeting: 'adjacent' | 'all-allied' | 'all-opponent' }`.
- `stat-debuff-target` — same, with negative amount semantics.
- `draw-card` — draw N from the controller's deck. Params: `{ count: number }`.
- `play-from-deck` — play the top card of the controller's deck to a specified or random empty cell. Params: `{ cell: 'random' | CellIndex }`.

The action-card replacement behavior (mentioned by the designer) is not a built-in property of action cards; it is implemented by giving each action card an `on-play` ability that draws or plays from deck. This keeps the rule "action cards always replace themselves" out of the engine and into the card data, where it belongs.

## 9. Decks and hand

Two predefined 20-card decks (Deck A, Deck B), defined in `src/data/decks.ts` as arrays of card IDs. At game start:

1. RNG seed is established (see §10).
2. Each deck is randomly assigned to one player.
3. Each deck is shuffled with the seeded PRNG.
4. Each player draws 5 from the top of their shuffled deck into their hand.

There is no automatic per-turn draw. A player only draws additional cards via abilities (typically from action cards).

## 10. Random number generation

A single 32-bit seed determines the entire random sequence of a game: deck assignment, deck shuffling, any random ability outcomes (e.g., `play-from-deck` to a random cell).

Implementation: `xorshift32`, ~10 lines, in `src/engine/rng.ts`. The PRNG is constructed with a seed and exposes `next()` returning a uint32 and `nextInt(max)` returning a uniform integer in `[0, max)`.

For single-player games, the seed is generated client-side at game start. For multiplayer, the host generates the seed and broadcasts it to the joiner during the init handshake. Both clients run identical PRNG steps in identical order, ensuring deterministic simulation.

## 11. Edge cases

- **No legal placement** — if the active player's hand contains no unit cards and they have no action card that produces one, they cannot complete the placement phase. Treat this as immediate loss. (This should be very rare given action cards replace themselves, but the engine must handle it.)
- **Action card stack overflow** — an action card's ability could in theory chain into another action card draw. Cap the action-resolution depth at a reasonable number (e.g., 16) and treat overflow as a bug to be logged.
- **Disconnect mid-game** — multiplayer only; the game is lost. No reconnection.

## 12. Multiplayer architecture

**Trust model:** clients trust each other. No server-side validation. The mitigation is desync detection, not desync prevention.

### Lifecycle

1. **Host creates room.** Host clicks "Play with friend." Client generates a 6-character room code from the alphabet `[A-HJ-NP-Z2-9]` (uppercase, ambiguous chars `I`, `O`, `0`, `1` excluded). Inserts into `rooms` table:
   ```sql
   { code TEXT PRIMARY KEY, host_name TEXT, joiner_name TEXT NULL,
     status TEXT, created_at TIMESTAMPTZ }
   ```
2. **Host opens channel.** Subscribe to a Supabase Realtime Broadcast channel keyed on the room code. Show code in lobby UI.
3. **Joiner joins.** Joiner enters code, client looks up the row, updates with `joiner_name`, opens the same channel.
4. **Init handshake.** Host generates RNG seed, decides deck assignment, broadcasts:
   ```ts
   { type: 'init', seed: number, deckAssignment: { bottom: 'A' | 'B', top: 'A' | 'B' },
     hostName: string, joinerName: string }
   ```
   Both clients run identical setup from this payload.
5. **Move broadcasting.** Each move is broadcast as:
   ```ts
   { type: 'move', seq: number,
     payload: { kind: 'place', cardInstanceId: string, cell: CellIndex }
            | { kind: 'action', cardInstanceId: string } }
   ```
   `seq` increments per move from each client. Receivers apply the move via the deterministic resolver.
6. **State hash exchange.** After each move resolves, each client computes a hash of the canonicalized game state (FNV-1a over a stable JSON serialization with sorted keys) and broadcasts:
   ```ts
   { type: 'hash', seq: number, hash: string }
   ```
   If the local and received hashes differ for the same `seq`, surface a "desync detected" toast and offer a "return to menu" button. Do not attempt automatic recovery.

### Persistence

Only the `rooms` row exists in Postgres. Game state is in-memory on each client. Rooms older than 1 hour can be garbage-collected by a cron or simply ignored.

### Authentication and RLS

Supabase anonymous access only. The `rooms` table allows anonymous insert and select; updates can also be anonymous. There is no security boundary; this is hobby-grade.

## 13. AI opponent

Heuristic, single-pass per turn. No tree search.

For each AI turn:

1. **Action phase.** For each action card in hand: if the AI has fewer than 2 cards in hand AND the action card has a `draw-card` or `play-from-deck` ability, play it. Otherwise skip. (More sophisticated logic deferred.)
2. **Placement phase.** For each (unit card in hand, empty cell) pair, simulate placement and count immediate flips. Score:
   ```
   score = flips * 10 + corner_bonus + edge_bonus
   corner_bonus = 2 if cell ∈ {0, 2, 6, 8} else 0
   edge_bonus = 1 if cell ∈ {1, 3, 5, 7} else 0
   ```
   Pick the highest-scoring move; tie-break with `rng.next()` for determinism.

The AI does not factor abilities into scoring in v1. Abilities still resolve through the same engine when the AI's card is placed; the AI just doesn't reason about them.

## 14. UI / screen architecture

**No router.** Top-level screen state lives in a Zustand store:

```ts
type Screen = 'menu' | 'host-lobby' | 'join-lobby' | 'game' | 'results';
```

The root component switches on `screen` and renders the corresponding view.

**State management:** Zustand. Two stores:

- `useUIStore` — `screen`, `displayName`, transient toasts.
- `useGameStore` — the full `GameState`, plus action methods like `placeCard(cell, cardInstanceId)`, `playAction(cardInstanceId)`, `endTurn()`, `resetGame()`.

The game store also holds the `mode: 'ai' | 'multiplayer'` flag and, for multiplayer, the broadcast channel handle and `localPlayer: Player` (which side this client controls).

**Component sketch:**

```
<App>
  <Menu />              // when screen = 'menu'
  <HostLobby />         // when screen = 'host-lobby'
  <JoinLobby />         // when screen = 'join-lobby'
  <Game>                // when screen = 'game'
    <Scoreboard />
    <Hand player="top" hidden />     // opponent hand, card backs only
    <Board>
      <Cell />          // x9
        <Card />        // when occupied; rotation by controller
    </Board>
    <Hand player="bottom" />          // local hand, faces visible
  </Game>
  <Results />           // when screen = 'results'
</App>
```

Card rotation is a single CSS transform: `rotate(180deg)` when `controller === 'top'`. Tailwind transitions handle the flip animation.

## 15. Tech stack

Mirror `draft-mension-20`:

- Vite 5 + React 18 + TypeScript 5.5 (`@vitejs/plugin-react`)
- Tailwind CSS 3.4 + PostCSS + Autoprefixer
- `@fontsource/inter`, `@fontsource/bangers`
- `lucide-react`
- `@supabase/supabase-js`
- Vitest 2 + happy-dom + React Testing Library
- ESLint 9 flat config + `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- `sharp` + `scripts/convert-images.mjs` for AVIF/WebP siblings under `public/images/`
- Split `tsconfig.app.json` / `tsconfig.node.json`, with `tsc --noEmit` for typechecking

**Add:**

- `zustand`

**Do not carry over:**

- `.bolt/` scaffolding from the source repo
- The original repo's `package.json` name field (start fresh)

## 16. Card JSON example

`src/data/cards.json`:

```json
[
  {
    "id": "footman",
    "type": "unit",
    "name": "Footman",
    "stats": { "top": 3, "bottom": 4, "left": 2, "right": 5 },
    "art": "footman.png"
  },
  {
    "id": "captain",
    "type": "unit",
    "name": "Captain",
    "stats": { "top": 5, "bottom": 5, "left": 4, "right": 4 },
    "abilities": [
      { "abilityId": "stat-buff-self", "trigger": "on-play",
        "params": { "stat": "top", "amount": 1 } }
    ],
    "art": "captain.png"
  },
  {
    "id": "scout-report",
    "type": "action",
    "name": "Scout Report",
    "abilities": [
      { "abilityId": "draw-card", "trigger": "on-play", "params": { "count": 2 } }
    ],
    "art": "scout-report.png"
  }
]
```

`src/data/decks.ts`:

```ts
export const DECK_A: string[] = [/* 20 card IDs */];
export const DECK_B: string[] = [/* 20 card IDs */];
```

For the build, Claude Code should generate a placeholder set of ~15 cards with simple stats, plus 2–3 sample action cards, sufficient to populate two 20-card decks (with duplicates allowed). The designer will replace this content later.

## 17. Out of scope

Decisions deferred to the designer, post-build:

- Final card list, names, art, balance
- Final deck composition
- Visual design beyond minimal Tailwind defaults
- Sound effects
- Spectator mode, reconnection, persistent stats, replays
- Tournaments, matchmaking, leaderboards

## 18. Open questions for the designer

These are not blockers for the build but should be answered before the game ships to friends:

- Should there be a per-turn limit on action cards played?
- Should there be a forfeit / surrender button?
- Should the game support a "rematch with sides swapped" flow on the results screen?
