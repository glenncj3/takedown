import type { CellIndex } from '../types';
import { Cell } from './Cell';

const CELL_INDICES: CellIndex[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export function Board() {
  return (
    <div
      role="grid"
      aria-label="Game board"
      className="grid grid-cols-3 gap-2 rounded-lg bg-slate-950/40 p-3"
    >
      {CELL_INDICES.map((idx) => (
        <Cell key={idx} index={idx} />
      ))}
    </div>
  );
}
