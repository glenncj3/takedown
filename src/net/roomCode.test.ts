import { describe, it, expect } from 'vitest';
import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  generateRoomCode,
  isValidRoomCode,
} from './roomCode';

describe('generateRoomCode', () => {
  it('produces a code of the configured length', () => {
    for (let i = 0; i < 100; i++) {
      expect(generateRoomCode()).toHaveLength(ROOM_CODE_LENGTH);
    }
  });

  it('never produces ambiguous characters (I, O, 0, 1)', () => {
    for (let i = 0; i < 1000; i++) {
      const code = generateRoomCode();
      expect(code).not.toMatch(/[IO01]/);
    }
  });

  it('only uses characters from the alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode();
      for (const c of code) {
        expect(ROOM_CODE_ALPHABET).toContain(c);
      }
    }
  });

  it('is deterministic when given a seeded RNG', () => {
    const rng = pseudoRng(42);
    const a = generateRoomCode(rng);
    const b = generateRoomCode(pseudoRng(42));
    expect(a).toBe(b);
  });
});

describe('isValidRoomCode', () => {
  it('accepts codes from the alphabet of the right length', () => {
    expect(isValidRoomCode('ABC234')).toBe(true);
    expect(isValidRoomCode('ZZZZZZ')).toBe(true);
  });

  it('rejects wrong length', () => {
    expect(isValidRoomCode('ABC23')).toBe(false);
    expect(isValidRoomCode('ABC2345')).toBe(false);
    expect(isValidRoomCode('')).toBe(false);
  });

  it('rejects codes with disallowed chars', () => {
    expect(isValidRoomCode('ABCIO0')).toBe(false);
    expect(isValidRoomCode('abcdef')).toBe(false); // lowercase not in alphabet
    expect(isValidRoomCode('ABC-23')).toBe(false);
  });
});

// Tiny LCG for deterministic test sequences.
function pseudoRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
