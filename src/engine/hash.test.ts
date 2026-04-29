import { describe, it, expect } from 'vitest';
import { FIXTURE_CARDS, emptyState, makePlaced } from '../test/fixtures';
import { canonicalize, fnv1a, hashState } from './hash';

const { weak, balanced } = FIXTURE_CARDS;

describe('canonicalize', () => {
  it('sorts object keys deterministically', () => {
    const a = { b: 2, a: 1 };
    const b = { a: 1, b: 2 };
    expect(canonicalize(a)).toEqual(canonicalize(b));
  });

  it('preserves array order', () => {
    expect(canonicalize([3, 1, 2])).toBe('[3,1,2]');
  });

  it('handles nested objects', () => {
    expect(canonicalize({ x: { z: 3, y: 2 }, a: 1 })).toBe(
      '{"a":1,"x":{"y":2,"z":3}}',
    );
  });

  it('handles null and primitives', () => {
    expect(canonicalize(null)).toBe('null');
    expect(canonicalize(42)).toBe('42');
    expect(canonicalize('hi')).toBe('"hi"');
    expect(canonicalize(true)).toBe('true');
  });
});

describe('fnv1a', () => {
  it('returns an 8-character hex string', () => {
    expect(fnv1a('hello')).toMatch(/^[0-9a-f]{8}$/);
  });

  it('matches the known FNV-1a output for the canonical test string', () => {
    // Reference: FNV-1a 32-bit of 'hello' is 0x4f9f2cab.
    expect(fnv1a('hello')).toBe('4f9f2cab');
  });

  it('produces different hashes for different inputs', () => {
    expect(fnv1a('a')).not.toBe(fnv1a('b'));
  });
});

describe('hashState', () => {
  it('produces identical hashes for identical states', () => {
    const a = emptyState();
    const b = emptyState();
    expect(hashState(a)).toBe(hashState(b));
  });

  it('produces different hashes for minimally different states', () => {
    const a = emptyState();
    const b = emptyState();
    b.board[0] = makePlaced(weak, 'bottom', 0);
    expect(hashState(a)).not.toBe(hashState(b));
  });

  it('is order-independent for object key insertion', () => {
    const a = emptyState();
    a.board[4] = makePlaced(balanced, 'bottom', 4);
    // Construct another state with the same data but different key order on
    // the placed card — JSON.stringify alone would differ; canonicalize fixes.
    const b = emptyState();
    const card = a.board[4]!;
    b.board[4] = {
      cellIndex: card.cellIndex,
      controller: card.controller,
      stats: { right: card.stats.right, left: card.stats.left, top: card.stats.top, bottom: card.stats.bottom },
      instanceId: card.instanceId,
      card: card.card,
    };
    expect(hashState(a)).toBe(hashState(b));
  });
});
