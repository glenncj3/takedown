import type { CellIndex, GameState } from '../types';
import { DIRECTION_STAT, getNeighbors } from './board';

// Returns neighbor cell indices that would flip if the card at `cellIndex`
// resolved its flip checks right now. Pure: does not modify state.
//
// Per DESIGN §4: only opponent-controlled neighbors are eligible, the
// comparison is against the same-named stat, and ties do not flip.
export function computeFlips(state: GameState, cellIndex: CellIndex): CellIndex[] {
  const placed = state.board[cellIndex];
  if (!placed) return [];

  const flips: CellIndex[] = [];
  for (const { cell: neighborCell, direction } of getNeighbors(cellIndex)) {
    const neighbor = state.board[neighborCell];
    if (!neighbor) continue;
    if (neighbor.controller === placed.controller) continue;
    const stat = DIRECTION_STAT[direction];
    if (placed.stats[stat] > neighbor.stats[stat]) {
      flips.push(neighborCell);
    }
  }
  return flips;
}
