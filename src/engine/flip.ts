import type { CellIndex, GameState, Player, Stat } from '../types';
import {
  DIRECTION_STAT,
  getNeighbors,
  type Direction,
} from './board';

const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

// The data-stat name displayed on a card's edge facing world `direction`,
// accounting for the 180° rotation top-controlled cards undergo. For an
// upright (bottom-controlled) card the world frame matches the data frame:
// world "down" = data "bottom". For a rotated (top-controlled) card the
// frame is inverted: world "down" = data "top" because rotation moved the
// `top` label from north-edge to south-edge.
//
// This is the load-bearing detail that makes the visual touching-edge
// numbers match the engine's flip decision regardless of who's the placer.
export function touchingEdgeStat(controller: Player, direction: Direction): Stat {
  return controller === 'bottom'
    ? DIRECTION_STAT[direction]
    : DIRECTION_STAT[OPPOSITE_DIRECTION[direction]];
}

// Returns neighbor cell indices that would flip if the card at `cellIndex`
// resolved its flip checks right now. Pure: does not modify state.
//
// The comparison is between each card's TOUCHING-EDGE stat in its own
// data frame. Because flips only happen between opposite-controlled cards
// (one upright, one rotated 180°), the two touching-edge stats always
// resolve to the same data label name — but it is NOT always the
// world-direction's name. See `touchingEdgeStat` above.
export function computeFlips(state: GameState, cellIndex: CellIndex): CellIndex[] {
  const placed = state.board[cellIndex];
  if (!placed) return [];

  const flips: CellIndex[] = [];
  for (const { cell: neighborCell, direction } of getNeighbors(cellIndex)) {
    const neighbor = state.board[neighborCell];
    if (!neighbor) continue;
    if (neighbor.controller === placed.controller) continue;

    const placerStat = touchingEdgeStat(placed.controller, direction);
    const neighborStat = touchingEdgeStat(
      neighbor.controller,
      OPPOSITE_DIRECTION[direction],
    );
    if (placed.stats[placerStat] > neighbor.stats[neighborStat]) {
      flips.push(neighborCell);
    }
  }
  return flips;
}
