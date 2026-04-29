import type { CellIndex, GameState, PlacedCard, Player } from '../types';
import { computeFlips } from './flip';

// Callback fired after each individual flip during chain resolution. Phase 3
// wires this up to the ability trigger queue so that on-flip handlers run
// between flips — meaning a flipped card's stat changes (from its on-flip
// ability) influence subsequent chain steps. May modify state.
export type OnFlipHook = (state: GameState, flippedCell: CellIndex) => GameState;

export interface ResolveContext {
  onFlip?: OnFlipHook;
}

// Runs the chain resolution from DESIGN §5 steps 4-5: initial flips against
// the placed card's neighbors, then iterative flip evaluation against each
// newly-flipped card. Pure: returns a new GameState.
export function resolvePlacement(
  state: GameState,
  cellIndex: CellIndex,
  ctx?: ResolveContext,
): GameState {
  const onFlip: OnFlipHook = ctx?.onFlip ?? ((s) => s);
  let next = state;

  const initial = computeFlips(next, cellIndex);
  if (initial.length === 0) return next;

  const flippedThisChain = new Set<CellIndex>();
  const queue: CellIndex[] = [];

  for (const cell of initial) {
    next = applyFlip(next, cell);
    next = onFlip(next, cell);
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
      next = onFlip(next, flipCell);
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
