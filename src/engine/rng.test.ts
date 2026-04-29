import { describe, it, expect } from 'vitest';
import { createRng } from './rng';

describe('createRng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('coerces a zero seed without producing the all-zero stream', () => {
    const rng = createRng(0);
    const values = Array.from({ length: 5 }, () => rng.next());
    expect(values.every((v) => v === 0)).toBe(false);
  });

  it('shuffles deterministically given the same seed', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const a = createRng(42).shuffle(input);
    const b = createRng(42).shuffle(input);
    expect(a).toEqual(b);
    // Sanity: shuffle preserves elements
    expect(a.slice().sort((x, y) => x - y)).toEqual(input);
  });

  it('shuffles produce different orders for different seeds (probabilistic)', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const a = createRng(1).shuffle(input);
    const b = createRng(2).shuffle(input);
    expect(a).not.toEqual(b);
  });

  it('shuffle does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5];
    const before = input.slice();
    createRng(7).shuffle(input);
    expect(input).toEqual(before);
  });

  it('nextInt returns values in [0, max)', () => {
    const rng = createRng(99);
    for (let i = 0; i < 100; i++) {
      const v = rng.nextInt(10);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
    }
  });

  it('nextInt rejects non-positive max', () => {
    const rng = createRng(1);
    expect(() => rng.nextInt(0)).toThrow();
    expect(() => rng.nextInt(-5)).toThrow();
    expect(() => rng.nextInt(1.5)).toThrow();
  });
});
