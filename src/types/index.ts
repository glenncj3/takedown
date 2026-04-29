// Domain types for the Takedown card game.
// Reference: DESIGN.md §6 (Card data model) and §7 (Game state model).

export type Player = 'bottom' | 'top';

export type CellIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type Stat = 'top' | 'bottom' | 'left' | 'right';

export type Trigger = 'on-play' | 'on-flip' | 'on-end-of-turn';

export interface AbilityInstance {
  abilityId: string;
  trigger: Trigger;
  params?: Record<string, unknown>;
}

export interface CardStats {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface UnitCard {
  id: string;
  type: 'unit';
  name: string;
  stats: CardStats;
  abilities?: AbilityInstance[];
  art?: string;
}

export interface ActionCard {
  id: string;
  type: 'action';
  name: string;
  abilities: AbilityInstance[];
  art?: string;
}

export type Card = UnitCard | ActionCard;

// A card occupying a slot in deck/hand/discard. Carries a per-game instance id
// so multiplayer move payloads can reference the exact card unambiguously,
// even when the same card definition appears multiple times in a deck.
export interface CardInstance {
  card: Card;
  instanceId: string;
}

// A unit card placed on the board. The instanceId carries through from the
// CardInstance that was in hand. Stats are mutable here (abilities can buff
// or debuff) and may diverge from card.stats over the course of a game.
export interface PlacedCard {
  card: UnitCard;
  instanceId: string;
  controller: Player;
  cellIndex: CellIndex;
  stats: CardStats;
}

export type Phase = 'placing' | 'resolving' | 'ended';

export type Winner = Player | 'draw';

export interface GameState {
  board: (PlacedCard | null)[];
  hands: Record<Player, CardInstance[]>;
  decks: Record<Player, CardInstance[]>;
  discards: Record<Player, CardInstance[]>;
  turn: Player;
  placementCount: number;
  phase: Phase;
  winner: Winner | null;
  rngSeed: number;
  // Current PRNG position. Initialized to the post-setup-shuffle state so
  // mid-game randomness (e.g. play-from-deck to a random cell) is
  // deterministic and replayable from the seed alone.
  rngState: number;
  moveSeq: number;
}
