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

  // Regression: top-controlled placers must use the rotated-frame stat
  // mapping, not the world-direction stat. The visual touching-edge number
  // is what the player sees, and the engine must match.
  describe('top-controlled placer (rotated 180°)', () => {
    it('does NOT flip on a tied touching edge (5 vs 5)', () => {
      // Captain stats: top=5, bottom=6, left=5, right=5.
      // Knight stats:  top=5, bottom=5, left=6, right=6.
      // Captain (top) above Knight (bottom). Direction down.
      // Touching edges (visual):
      //   Captain south = Captain.data.top   = 5  (rotated, so top moves to south)
      //   Knight  north = Knight.data.top    = 5  (upright, top is on north)
      // Both 5 → tie → no flip.
      const captain: import('../types').UnitCard = {
        id: 'captain', type: 'unit', name: 'Captain',
        stats: { top: 5, bottom: 6, left: 5, right: 5 },
      };
      const knight: import('../types').UnitCard = {
        id: 'knight', type: 'unit', name: 'Knight',
        stats: { top: 5, bottom: 5, left: 6, right: 6 },
      };
      const state = emptyState();
      state.board[4] = makePlaced(captain, 'top', 4);
      state.board[7] = makePlaced(knight, 'bottom', 7);
      expect(computeFlips(state, 4)).toEqual([]);
    });

    it('DOES flip when its touching-edge stat beats the neighbor', () => {
      // Scout stats:  top=3, bottom=3, left=4, right=4.
      // Militia stats:top=4, bottom=2, left=4, right=4.
      // Scout (top) below Militia (bottom). Direction up from scout.
      // Touching edges (visual):
      //   Scout   north = Scout.data.bottom   = 3  (rotated, so bottom moves to north)
      //   Militia south = Militia.data.bottom = 2  (upright, bottom is on south)
      // 3 > 2 → flip.
      const scout: import('../types').UnitCard = {
        id: 'scout', type: 'unit', name: 'Scout',
        stats: { top: 3, bottom: 3, left: 4, right: 4 },
      };
      const militia: import('../types').UnitCard = {
        id: 'militia', type: 'unit', name: 'Militia',
        stats: { top: 4, bottom: 2, left: 4, right: 4 },
      };
      const state = emptyState();
      state.board[7] = makePlaced(scout, 'top', 7);
      state.board[4] = makePlaced(militia, 'bottom', 4);
      expect(computeFlips(state, 7)).toEqual([4]);
    });

    it('left/right also swap for a rotated placer', () => {
      // Place a top-rotated card to the LEFT of an upright bottom card.
      // Direction "right" from placer. With rotation, the placer's east
      // edge displays its data.left value, so the comparison must use
      // .left (not .right).
      const placer: import('../types').UnitCard = {
        id: 'p', type: 'unit', name: 'P',
        stats: { top: 1, bottom: 1, left: 9, right: 1 },
      };
      const neighbor: import('../types').UnitCard = {
        id: 'n', type: 'unit', name: 'N',
        stats: { top: 5, bottom: 5, left: 5, right: 5 },
      };
      const state = emptyState();
      state.board[3] = makePlaced(placer, 'top', 3);
      state.board[4] = makePlaced(neighbor, 'bottom', 4);
      // Touching edges:
      //   placer  east = data.left  = 9 (rotated)
      //   neighbor west = data.left = 5 (upright)
      // 9 > 5 → flip.
      expect(computeFlips(state, 3)).toEqual([4]);
    });
  });
});
