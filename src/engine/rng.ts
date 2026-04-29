// Seedable xorshift32 PRNG. The same seed always yields the same sequence,
// which is what makes multiplayer determinism possible: both clients shuffle
// decks and resolve any random ability outcomes from the same stream.

export interface Rng {
  next(): number;
  nextInt(max: number): number;
  shuffle<T>(arr: readonly T[]): T[];
  // Current PRNG state. Capture this after a batch of consumptions to
  // resume the same stream later (used for in-state RNG persistence).
  state(): number;
}

export function createRng(seed: number): Rng {
  // xorshift32 is undefined for state 0; coerce to 1 so a 0 seed still works.
  let state = (seed >>> 0) || 1;

  function next(): number {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state;
  }

  function nextInt(max: number): number {
    if (!Number.isInteger(max) || max <= 0) {
      throw new Error(`nextInt requires a positive integer max, got ${max}`);
    }
    return next() % max;
  }

  function shuffle<T>(arr: readonly T[]): T[] {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = nextInt(i + 1);
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  return { next, nextInt, shuffle, state: () => state };
}
