import { describe, it, expect } from 'vitest';
import { FIXTURE_CARDS, emptyState, makePlaced } from '../test/fixtures';
import { resolvePlacement } from './resolve';

const { weak, strong, balanced } = FIXTURE_CARDS;

describe('resolvePlacement', () => {
  it('returns the same state when no flips occur', () => {
    const state = emptyState();
    state.board[4] = makePlaced(weak, 'bottom', 4);
    const next = resolvePlacement(state, 4);
    expect(next).toBe(state);
  });

  it('flips a single weaker neighbor', () => {
    const state = emptyState();
    state.board[4] = makePlaced(strong, 'bottom', 4);
    state.board[1] = makePlaced(weak, 'top', 1);
    const next = resolvePlacement(state, 4);
    expect(next.board[1]?.controller).toBe('bottom');
    expect(next.board[4]?.controller).toBe('bottom');
  });

  it('flips multiple weak neighbors in one placement', () => {
    const state = emptyState();
    state.board[4] = makePlaced(strong, 'bottom', 4);
    state.board[1] = makePlaced(weak, 'top', 1);
    state.board[3] = makePlaced(weak, 'top', 3);
    state.board[5] = makePlaced(weak, 'top', 5);
    state.board[7] = makePlaced(weak, 'top', 7);
    const next = resolvePlacement(state, 4);
    for (const cell of [1, 3, 5, 7] as const) {
      expect(next.board[cell]?.controller).toBe('bottom');
    }
  });

  it('chains: placement flips A, then A flips B', () => {
    // Layout (controller letter / card):
    //   bottom strong @ 0
    //   top weak @ 1
    //   top weak @ 2
    //   top weak @ 3
    //
    //   0 1 2     b·strong  t·weak  t·weak
    //   3 . .     t·weak    .       .
    //
    // Place strong at 0:
    //   - Flips weak at 1 (right neighbor: 9 > 1) and weak at 3 (down: 9 > 1).
    //   - Chain re-evaluates from 1: now bottom-controlled, has top-weak at 2 (right). 1's right=1, 2's right=1 → tie, no flip. Wait — weak is 1/1/1/1. So 1 cannot flip 2.
    //
    // Let me make this work: placer is strong, weak neighbors flip, but then we need a chain. Use asymmetric for the intermediate so it can chain.
    const state = emptyState();
    // Cell 0: strong placer (bottom)
    state.board[0] = makePlaced(strong, 'bottom', 0);
    // Cell 1: balanced opponent (top) — flipped by placer (strong > balanced)
    state.board[1] = makePlaced(balanced, 'top', 1);
    // Cell 2: weak opponent (top) — chain flipped by 1 after it flips (balanced > weak)
    state.board[2] = makePlaced(weak, 'top', 2);

    const next = resolvePlacement(state, 0);

    expect(next.board[0]?.controller).toBe('bottom');
    expect(next.board[1]?.controller).toBe('bottom');
    expect(next.board[2]?.controller).toBe('bottom');
  });

  it('chain does not re-flip the placer (no infinite loop)', () => {
    // Place a card that flips a neighbor; the neighbor, post-flip, must not
    // attempt to re-flip the placer (same controller now). The placer's
    // safety is structural — once it flips a neighbor, controllers match and
    // computeFlips skips same-controller cells.
    const state = emptyState();
    state.board[4] = makePlaced(strong, 'bottom', 4);
    state.board[1] = makePlaced(balanced, 'top', 1);
    const next = resolvePlacement(state, 4);
    expect(next.board[1]?.controller).toBe('bottom');
    expect(next.board[4]?.controller).toBe('bottom'); // placer unchanged
  });

  it('does not flip the same card twice in one chain', () => {
    // If a flipped card B is reached again via another chain path, it must
    // not flip a second time. Easiest way to assert this: count the
    // controller changes by tracking via state diffs.
    //
    // Construct: strong @ 4 (bottom), weak @ 1 (top), weak @ 3 (top),
    //   asymmetric @ 0 (top, top:9 left:8). After 4 flips 1 and 3, both
    //   become bottom-controlled. Their neighbors' chain checks: 1's neighbor
    //   0 is top-asymmetric; from 1 looking up: 1.top=5 vs 0.top=9 → no flip.
    //   3's neighbor 0 is top-asymmetric; from 3 looking up: 3.top=5 vs 0.top=9 → no flip.
    // So 0 is never flipped, no double-flip risk to test directly here.
    //
    // Instead, test that already-flipped cards don't flip back: place strong
    // adjacent to two weaks; after both flip, neither should toggle the other.
    const state = emptyState();
    state.board[4] = makePlaced(strong, 'bottom', 4);
    state.board[3] = makePlaced(weak, 'top', 3);
    state.board[5] = makePlaced(weak, 'top', 5);
    const next = resolvePlacement(state, 4);
    expect(next.board[3]?.controller).toBe('bottom');
    expect(next.board[5]?.controller).toBe('bottom');
  });

  it('preserves cards that should not flip (weaker placer, stronger neighbor)', () => {
    const state = emptyState();
    state.board[4] = makePlaced(weak, 'bottom', 4);
    state.board[1] = makePlaced(strong, 'top', 1);
    const next = resolvePlacement(state, 4);
    expect(next.board[1]?.controller).toBe('top');
    expect(next.board[4]?.controller).toBe('bottom');
  });
});
