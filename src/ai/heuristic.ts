import { computeFlips } from '../engine/flip';
import type { CellIndex, GameState, PlacedCard } from '../types';

const CORNER_CELLS: ReadonlySet<CellIndex> = new Set([0, 2, 6, 8]);
const EDGE_CELLS: ReadonlySet<CellIndex> = new Set([1, 3, 5, 7]);

// Per DESIGN §13: score = flips * 10 + corner_bonus + edge_bonus.
// We use computeFlips (initial neighbor flips only — no chain, no
// abilities) because the design explicitly says the v1 AI doesn't reason
// about abilities, and "immediate flips" is a cleaner, faster signal.
export function scoreMove(
  state: GameState,
  cardInstanceId: string,
  cell: CellIndex,
): number {
  const player = state.turn;
  const handCard = state.hands[player].find(
    (c) => c.instanceId === cardInstanceId,
  );
  if (!handCard || handCard.card.type !== 'unit') return -Infinity;
  if (state.board[cell] !== null) return -Infinity;

  const placed: PlacedCard = {
    card: handCard.card,
    instanceId: handCard.instanceId,
    controller: player,
    cellIndex: cell,
    stats: { ...handCard.card.stats },
  };
  const board = state.board.slice();
  board[cell] = placed;
  const sim: GameState = { ...state, board };

  const flips = computeFlips(sim, cell).length;
  return flips * 10 + positionBonus(cell);
}

export function positionBonus(cell: CellIndex): number {
  if (CORNER_CELLS.has(cell)) return 2;
  if (EDGE_CELLS.has(cell)) return 1;
  return 0;
}
