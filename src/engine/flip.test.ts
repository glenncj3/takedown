import { describe, it, expect } from 'vitest';
import { FIXTURE_CARDS, emptyState, makePlaced } from '../test/fixtures';
import { computeFlips } from './flip';

const { weak, strong, balanced, asymmetric } = FIXTURE_CARDS;

describe('computeFlips', () => {
  it('returns empty when the cell is empty', () => {
    const state = emptyState();
    expect(computeFlips(state, 4)).toEqual([]);
  });

  it('flips a single weaker opponent neighbor', () => {
    const state = emptyState();
    state.board[4] = makePlaced(strong, 'bottom', 4);
    state.board[1] = makePlaced(weak, 'top', 1);
    expect(computeFlips(state, 4)).toEqual([1]);
  });

  it('does not flip a stronger opponent neighbor', () => {
    const state = emptyState();
    state.board[4] = makePlaced(weak, 'bottom', 4);
    state.board[1] = makePlaced(strong, 'top', 1);
    expect(computeFlips(state, 4)).toEqual([]);
  });

  it('does not flip on a tie (strict greater required)', () => {
    const state = emptyState();
    state.board[4] = makePlaced(balanced, 'bottom', 4);
    state.board[1] = makePlaced(balanced, 'top', 1);
    state.board[3] = makePlaced(balanced, 'top', 3);
    state.board[5] = makePlaced(balanced, 'top', 5);
    state.board[7] = makePlaced(balanced, 'top', 7);
    expect(computeFlips(state, 4)).toEqual([]);
  });

  it('does not flip same-controller neighbors', () => {
    const state = emptyState();
    state.board[4] = makePlaced(strong, 'bottom', 4);
    state.board[1] = makePlaced(weak, 'bottom', 1);
    expect(computeFlips(state, 4)).toEqual([]);
  });

  it('flips multiple opponents in one placement', () => {
    const state = emptyState();
    state.board[4] = makePlaced(strong, 'bottom', 4);
    state.board[1] = makePlaced(weak, 'top', 1);
    state.board[3] = makePlaced(weak, 'top', 3);
    state.board[5] = makePlaced(weak, 'top', 5);
    state.board[7] = makePlaced(weak, 'top', 7);
    expect(computeFlips(state, 4).sort()).toEqual([1, 3, 5, 7]);
  });

  it('compares the correct stat per direction (up = top vs top)', () => {
    const state = emptyState();
    // Asymmetric: top:9, bottom:2, left:8, right:3
    // Place asymmetric at 4 (center), opponent balanced (5/5/5/5) on each side.
    // up neighbor (cell 1): compare placer.top (9) vs neighbor.top (5) → flip
    // down neighbor (cell 7): compare placer.bottom (2) vs neighbor.bottom (5) → no flip
    // left neighbor (cell 3): compare placer.left (8) vs neighbor.left (5) → flip
    // right neighbor (cell 5): compare placer.right (3) vs neighbor.right (5) → no flip
    state.board[4] = makePlaced(asymmetric, 'bottom', 4);
    state.board[1] = makePlaced(balanced, 'top', 1);
    state.board[7] = makePlaced(balanced, 'top', 7);
    state.board[3] = makePlaced(balanced, 'top', 3);
    state.board[5] = makePlaced(balanced, 'top', 5);

    expect(computeFlips(state, 4).sort()).toEqual([1, 3]);
  });

  it('uses live PlacedCard.stats, not the underlying card definition', () => {
    const state = emptyState();
    // The card is "weak" (1/1/1/1) but we override stats to make it strong.
    const buffed = makePlaced(weak, 'bottom', 4, 'buffed', { top: 9 });
    state.board[4] = buffed;
    state.board[1] = makePlaced(balanced, 'top', 1);
    expect(computeFlips(state, 4)).toEqual([1]);
  });
});
