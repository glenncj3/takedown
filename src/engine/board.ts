import type { CellIndex, Stat } from '../types';

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Neighbor {
  cell: CellIndex;
  direction: Direction;
}

// Maps the direction from a card to its neighbor → which stat both cards
// compare on for the flip rule. See DESIGN §4: because opposing cards are
// rendered with 180° rotation, the touching edges of two opposing cards
// always represent their same-named stat.
export const DIRECTION_STAT: Record<Direction, Stat> = {
  up: 'top',
  down: 'bottom',
  left: 'left',
  right: 'right',
};

export const ALL_CELLS: CellIndex[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export function getNeighbors(cell: CellIndex): Neighbor[] {
  const out: Neighbor[] = [];
  if (cell >= 3) out.push({ cell: (cell - 3) as CellIndex, direction: 'up' });
  if (cell <= 5) out.push({ cell: (cell + 3) as CellIndex, direction: 'down' });
  if (cell % 3 !== 0) out.push({ cell: (cell - 1) as CellIndex, direction: 'left' });
  if (cell % 3 !== 2) out.push({ cell: (cell + 1) as CellIndex, direction: 'right' });
  return out;
}
