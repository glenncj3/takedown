import type { CellIndex, GameState, PlacedCard, Player } from '../types';
import { computeFlips } from './flip';

// Runs the chain resolution from DESIGN §5 steps 4-5: initial flips against
// the placed card's neighbors, then iterative flip evaluation against each
// newly-flipped card. Pure: returns a new GameState.
//
// Phase 1 is stat-only — no ability triggers. Phase 3 will splice on-play /
// on-flip / on-end-of-turn firings into the same flow.
export function resolvePlacement(state: GameState, cellIndex: CellIndex): GameState {
  let next = state;

  const initial = computeFlips(next, cellIndex);
  if (initial.length === 0) return next;

  const flippedThisChain = new Set<CellIndex>();
  const queue: CellIndex[] = [];

  for (const cell of initial) {
    next = applyFlip(next, cell);
    flippedThisChain.add(cell);
    queue.push(cell);
  }

  while (queue.length > 0) {
    const chainCell = queue.shift()!;
    const chainFlips = computeFlips(next, chainCell);
    for (const flipCell of chainFlips) {
      // Cards already flipped in this chain are not re-evaluated. The placer
      // itself is naturally skipped because its controller now matches every
      // newly-flipped card's controller (computeFlips ignores same-controller
      // neighbors).
      if (flippedThisChain.has(flipCell)) continue;
      next = applyFlip(next, flipCell);
      flippedThisChain.add(flipCell);
      queue.push(flipCell);
    }
  }

  return next;
}

function applyFlip(state: GameState, cellIndex: CellIndex): GameState {
  const placed = state.board[cellIndex];
  if (!placed) return state;
  const flipped: PlacedCard = {
    ...placed,
    controller: opposite(placed.controller),
  };
  const board = state.board.slice();
  board[cellIndex] = flipped;
  return { ...state, board };
}

function opposite(player: Player): Player {
  return player === 'bottom' ? 'top' : 'bottom';
}
