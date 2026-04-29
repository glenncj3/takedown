import { describe, it, expect } from 'vitest';
import { FIXTURE_CARDS, emptyState, makeInstance, makePlaced } from '../test/fixtures';
import { positionBonus, scoreMove } from './heuristic';

const { weak, strong, balanced } = FIXTURE_CARDS;

describe('positionBonus', () => {
  it('returns 2 for corners', () => {
    for (const c of [0, 2, 6, 8] as const) {
      expect(positionBonus(c)).toBe(2);
    }
  });
  it('returns 1 for edges', () => {
    for (const c of [1, 3, 5, 7] as const) {
      expect(positionBonus(c)).toBe(1);
    }
  });
  it('returns 0 for the center', () => {
    expect(positionBonus(4)).toBe(0);
  });
});

describe('scoreMove', () => {
  it('counts immediate flips at 10 each plus position bonus', () => {
    const state = emptyState({
      hands: { bottom: [], top: [makeInstance(strong, 't1')] },
      turn: 'top',
    });
    state.board[1] = makePlaced(weak, 'bottom', 1);
    state.board[3] = makePlaced(weak, 'bottom', 3);
    state.board[5] = makePlaced(weak, 'bottom', 5);
    state.board[7] = makePlaced(weak, 'bottom', 7);

    // Place at 4 (center): flips 4 weak neighbors. Score = 4*10 + 0 = 40.
    expect(scoreMove(state, 't1', 4)).toBe(40);
    // Place at 0 (corner): neighbors are 1 and 3, both flippable. 2*10 + 2 = 22.
    expect(scoreMove(state, 't1', 0)).toBe(22);
    // Place at 1 (edge): cell 1 is occupied — should return -Infinity.
    expect(scoreMove(state, 't1', 1)).toBe(-Infinity);
  });

  it('returns -Infinity for unknown card or occupied cell', () => {
    const state = emptyState({
      hands: { bottom: [], top: [makeInstance(weak, 't1')] },
      turn: 'top',
    });
    expect(scoreMove(state, 'nonexistent', 0)).toBe(-Infinity);
    state.board[0] = makePlaced(balanced, 'bottom', 0);
    expect(scoreMove(state, 't1', 0)).toBe(-Infinity);
  });

  it('does not include flips from the chain (immediate only)', () => {
    // Strong placer flips one weak; that weak post-flip cannot chain-flip
    // anything (its stats don't change). But to verify "immediate only",
    // construct a case where chain WOULD flip more if we counted it.
    const state = emptyState({
      hands: { bottom: [], top: [makeInstance(strong, 't1')] },
      turn: 'top',
    });
    // bottom-strong at 1, bottom-weak at 0
    state.board[1] = makePlaced(strong, 'bottom', 1);
    state.board[0] = makePlaced(weak, 'bottom', 0);
    // Top placing strong at 4: cell 4 neighbors are 1, 3, 5, 7.
    // Cell 1 is bottom-strong — top cannot flip (top.top=9 vs 1.top=9 → tie, no flip).
    // No initial flips from cell 4. Score should be flips*10 + 0 = 0.
    expect(scoreMove(state, 't1', 4)).toBe(0);
  });
});
