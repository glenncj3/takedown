import type { CellIndex, GameState, PlacedCard } from '../../types';
import { rngNextInt } from '../../engine/rngState';
import type { AbilityHandler } from '../types';
import { parseCellIndex } from '../params';

// Plays the top card of the controller's deck onto the board. The cell is
// either a fixed CellIndex from params or 'random' (chosen uniformly from
// empty cells using the seeded RNG).
//
// Action cards on the deck top are skipped — only unit cards can be placed.
// If the chosen cell is occupied (when explicit), the handler no-ops.
//
// The trigger resolver picks up `cardsPlaced` and fires on-play for the
// new card and runs flip resolution, recursing with depth tracking.
//
// Params: { cell: 'random' | CellIndex }
export const playFromDeck: AbilityHandler = (ctx, params) => {
  let state = ctx.state;
  const player = ctx.controller;
  const deck = state.decks[player];
  if (deck.length === 0) return { state };

  const top = deck[deck.length - 1];
  if (top.card.type !== 'unit') return { state };

  const cellSpec = params?.cell;
  let cellIndex: CellIndex | null = null;

  if (cellSpec === 'random') {
    const empties = collectEmptyCells(state);
    if (empties.length === 0) return { state };
    const r = rngNextInt(state, empties.length);
    state = r.state;
    cellIndex = empties[r.value];
  } else {
    const parsed = parseCellIndex(cellSpec);
    if (parsed === null) return { state };
    if (state.board[parsed] !== null) return { state };
    cellIndex = parsed;
  }

  const newDeck = deck.slice(0, -1);
  const placed: PlacedCard = {
    card: top.card,
    instanceId: top.instanceId,
    controller: player,
    cellIndex,
    stats: { ...top.card.stats },
  };
  const board = state.board.slice();
  board[cellIndex] = placed;

  return {
    state: {
      ...state,
      board,
      decks: { ...state.decks, [player]: newDeck },
      placementCount: state.placementCount + 1,
    },
    cardsPlaced: [cellIndex],
  };
};

function collectEmptyCells(state: GameState): CellIndex[] {
  const out: CellIndex[] = [];
  for (let i = 0; i < 9; i++) {
    if (state.board[i] === null) out.push(i as CellIndex);
  }
  return out;
}
