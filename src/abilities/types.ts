// Ability system types. Adapted from draft-mension-20's registry pattern,
// reshaped around board-game triggers (on-play / on-flip / on-end-of-turn).
//
// Handlers are pure functions: they take a context (current state, source
// card, controller) and the ability's params, and return a delta describing
// how state changed. The trigger resolver applies the delta and recurses
// for any cards placed as a side effect (with a depth cap).

import type {
  ActionCard,
  CellIndex,
  GameState,
  PlacedCard,
  Player,
  Trigger,
} from '../types';

export type AbilitySource =
  | { kind: 'placed'; card: PlacedCard }
  | { kind: 'action'; card: ActionCard; instanceId: string };

export interface AbilityContext {
  state: GameState;
  trigger: Trigger;
  source: AbilitySource;
  controller: Player;
  // For placed sources, mirrors source.card.cellIndex for handler convenience.
  // Undefined when the source is an action card.
  cellIndex?: CellIndex;
}

export interface AbilityDelta {
  state: GameState;
  // Cells where this handler caused new cards to land on the board. The
  // trigger resolver fires on-play for each of these in cell order, after
  // the parent handler returns. Used for play-from-deck and similar.
  cardsPlaced?: CellIndex[];
}

export type AbilityHandler = (
  ctx: AbilityContext,
  params: Record<string, unknown> | undefined,
) => AbilityDelta;
