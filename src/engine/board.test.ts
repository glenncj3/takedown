import { describe, it, expect } from 'vitest';
import { ALL_CELLS, getNeighbors } from './board';

describe('getNeighbors', () => {
  it('returns 2 neighbors for each corner', () => {
    for (const corner of [0, 2, 6, 8] as const) {
      expect(getNeighbors(corner)).toHaveLength(2);
    }
  });

  it('returns 3 neighbors for each edge', () => {
    for (const edge of [1, 3, 5, 7] as const) {
      expect(getNeighbors(edge)).toHaveLength(3);
    }
  });

  it('returns 4 neighbors for the center', () => {
    expect(getNeighbors(4)).toHaveLength(4);
  });

  it('totals 24 neighbor links across the board (each adjacency counted twice)', () => {
    const total = ALL_CELLS.reduce<number>(
      (acc, c) => acc + getNeighbors(c).length,
      0,
    );
    expect(total).toBe(24);
  });

  it('neighbor relationships are symmetric and use opposite directions', () => {
    const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' } as const;
    for (const cell of ALL_CELLS) {
      for (const { cell: nCell, direction } of getNeighbors(cell)) {
        const back = getNeighbors(nCell).find((x) => x.cell === cell);
        expect(back).toBeDefined();
        expect(back?.direction).toBe(opposite[direction]);
      }
    }
  });

  it('returns expected neighbors for cell 4 (center)', () => {
    const neighbors = getNeighbors(4);
    const map = Object.fromEntries(neighbors.map((n) => [n.direction, n.cell]));
    expect(map).toEqual({ up: 1, down: 7, left: 3, right: 5 });
  });

  it('returns expected neighbors for cell 0 (top-left corner)', () => {
    const map = Object.fromEntries(
      getNeighbors(0).map((n) => [n.direction, n.cell]),
    );
    expect(map).toEqual({ down: 3, right: 1 });
  });

  it('returns expected neighbors for cell 8 (bottom-right corner)', () => {
    const map = Object.fromEntries(
      getNeighbors(8).map((n) => [n.direction, n.cell]),
    );
    expect(map).toEqual({ up: 5, left: 7 });
  });
});
