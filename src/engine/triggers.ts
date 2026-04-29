// Trigger orchestration. Called from placeCard / playActionCard to fan
// abilities out to the registry. Handles recursive on-play firing for
// cards placed via play-from-deck, with a depth cap to bound any
// pathological card data.

import { getHandler } from '../abilities/registry';
import type { AbilityContext, AbilitySource } from '../abilities/types';
import type {
  AbilityInstance,
  CellIndex,
  GameState,
  Player,
  Trigger,
} from '../types';
import { resolvePlacement } from './resolve';

const ABILITY_DEPTH_CAP = 16;

// Fires `trigger` on `source`'s abilities (in declared order). Handlers
// run sequentially; each sees the state left by the previous one. If a
// handler signals `cardsPlaced`, on-play recurses for those new cards
// and a flip chain resolves around them.
export function fireTriggers(
  state: GameState,
  source: AbilitySource,
  trigger: Trigger,
  controller: Player,
  depth = 0,
): GameState {
  if (depth > ABILITY_DEPTH_CAP) {
    if (typeof console !== 'undefined') {
      console.warn(
        `[takedown] ability depth cap (${ABILITY_DEPTH_CAP}) exceeded; aborting trigger chain`,
      );
    }
    return state;
  }

  const abilities = getAbilities(source, trigger);
  if (abilities.length === 0) return state;

  let next = state;
  for (const ability of abilities) {
    const handler = getHandler(ability.abilityId);
    if (!handler) continue;

    const refreshed = refreshSource(next, source);
    if (!refreshed) continue;

    const ctx: AbilityContext = {
      state: next,
      trigger,
      source: refreshed,
      controller,
      cellIndex:
        refreshed.kind === 'placed' ? refreshed.card.cellIndex : undefined,
    };
    const delta = handler(ctx, ability.params);
    next = delta.state;

    if (delta.cardsPlaced && delta.cardsPlaced.length > 0) {
      for (const cell of delta.cardsPlaced) {
        next = resolveNewlyPlaced(next, cell, controller, depth + 1);
      }
    }
  }
  return next;
}

// For a card that just landed on the board: fire its on-play, then run the
// full flip chain (with on-flip per flip).
export function resolveNewlyPlaced(
  state: GameState,
  cellIndex: CellIndex,
  controller: Player,
  depth = 0,
): GameState {
  let next = state;
  const placed = next.board[cellIndex];
  if (!placed) return next;

  next = fireTriggers(
    next,
    { kind: 'placed', card: placed },
    'on-play',
    controller,
    depth,
  );

  next = resolvePlacement(next, cellIndex, {
    onFlip: (s, flippedCell) => {
      const flipped = s.board[flippedCell];
      if (!flipped) return s;
      // The flipped card's new controller is the one whose abilities should
      // benefit from any draw / play-from-deck on-flip effects.
      return fireTriggers(
        s,
        { kind: 'placed', card: flipped },
        'on-flip',
        flipped.controller,
        depth,
      );
    },
  });

  return next;
}

// Iterates cells 0-8 and fires on-end-of-turn on every card the active
// player controls. Order is deterministic (cell-index ascending). Cards
// flipped by an end-of-turn effect aren't re-iterated.
export function fireEndOfTurnTriggers(
  state: GameState,
  player: Player,
): GameState {
  let next = state;
  // Snapshot the cells to iterate, since handlers can mutate the board.
  const cells: CellIndex[] = [];
  for (let i = 0; i < 9; i++) {
    if (next.board[i]?.controller === player) cells.push(i as CellIndex);
  }
  for (const cell of cells) {
    const placed = next.board[cell];
    // Re-check controller — earlier handlers may have flipped or moved this
    // card. Only fire if the card is still controlled by the same player.
    if (!placed || placed.controller !== player) continue;
    next = fireTriggers(
      next,
      { kind: 'placed', card: placed },
      'on-end-of-turn',
      player,
    );
  }
  return next;
}

function getAbilities(source: AbilitySource, trigger: Trigger): AbilityInstance[] {
  const abilities = source.kind === 'placed'
    ? source.card.card.abilities
    : source.card.abilities;
  if (!abilities) return [];
  return abilities.filter((a) => a.trigger === trigger);
}

// After mutations to state, re-look-up the source so cellIndex / stats are
// current. For action sources, the card is in the discard or in flight and
// is not re-looked up — the original reference is fine.
function refreshSource(
  state: GameState,
  source: AbilitySource,
): AbilitySource | null {
  if (source.kind === 'action') return source;
  const refreshed = state.board[source.card.cellIndex];
  if (!refreshed) return null;
  // Match by instanceId in case the cell was overwritten by another card
  // (which shouldn't happen mid-resolution, but guard anyway).
  if (refreshed.instanceId !== source.card.instanceId) return null;
  return { kind: 'placed', card: refreshed };
}
