import { describe, it, expect } from 'vitest';
import type { ActionCard } from '../types';
import { FIXTURE_CARDS, emptyState, makeInstance, makePlaced } from '../test/fixtures';
import { placeCard } from './place';

const { weak, strong, balanced } = FIXTURE_CARDS;

describe('placeCard', () => {
  it('places a card from hand onto an empty cell', () => {
    const state = emptyState({
      hands: { bottom: [makeInstance(weak, 'b1')], top: [] },
    });
    const next = placeCard(state, 'b1', 4);
    expect(next.board[4]?.instanceId).toBe('b1');
    expect(next.board[4]?.controller).toBe('bottom');
    expect(next.hands.bottom).toHaveLength(0);
  });

  it('passes the turn to the opponent after a placement', () => {
    const state = emptyState({
      hands: { bottom: [makeInstance(weak, 'b1')], top: [] },
      turn: 'bottom',
    });
    const next = placeCard(state, 'b1', 0);
    expect(next.turn).toBe('top');
  });

  it('increments placementCount and moveSeq', () => {
    const state = emptyState({
      hands: { bottom: [makeInstance(weak, 'b1')], top: [] },
      moveSeq: 7,
    });
    const next = placeCard(state, 'b1', 0);
    expect(next.placementCount).toBe(1);
    expect(next.moveSeq).toBe(8);
  });

  it('runs the flip chain on placement', () => {
    const state = emptyState({
      hands: { bottom: [makeInstance(strong, 'placer')], top: [] },
    });
    state.board[1] = makePlaced(weak, 'top', 1);
    const next = placeCard(state, 'placer', 4);
    expect(next.board[4]?.controller).toBe('bottom');
    expect(next.board[1]?.controller).toBe('bottom');
  });

  it('rejects placement onto an occupied cell', () => {
    const state = emptyState({
      hands: { bottom: [makeInstance(weak, 'b1')], top: [] },
    });
    state.board[4] = makePlaced(balanced, 'top', 4);
    expect(() => placeCard(state, 'b1', 4)).toThrow(/occupied/);
  });

  it('rejects placement of a card not in the active player\'s hand', () => {
    const state = emptyState({
      hands: { bottom: [], top: [makeInstance(weak, 't1')] },
      turn: 'bottom',
    });
    expect(() => placeCard(state, 't1', 0)).toThrow(/not in bottom's hand/);
  });

  it('rejects placement of an action card', () => {
    const action: ActionCard = {
      id: 'scout-report',
      type: 'action',
      name: 'Scout Report',
      abilities: [],
    };
    const state = emptyState({
      hands: { bottom: [makeInstance(action, 'a1')], top: [] },
    });
    expect(() => placeCard(state, 'a1', 0)).toThrow(/not "unit"/);
  });

  it('rejects placement when phase is not "placing"', () => {
    const state = emptyState({
      hands: { bottom: [makeInstance(weak, 'b1')], top: [] },
      phase: 'ended',
    });
    expect(() => placeCard(state, 'b1', 0)).toThrow(/phase is "ended"/);
  });

  it('ends the game and sets winner after the 9th placement', () => {
    // Eight cards already placed (5 bottom, 3 top). The 9th placement
    // brings top to 4, leaving bottom with the win.
    const state = emptyState({
      hands: { bottom: [], top: [makeInstance(weak, 't9')] },
      turn: 'top',
      placementCount: 8,
    });
    state.board[0] = makePlaced(balanced, 'bottom', 0);
    state.board[1] = makePlaced(balanced, 'bottom', 1);
    state.board[2] = makePlaced(balanced, 'bottom', 2);
    state.board[3] = makePlaced(balanced, 'bottom', 3);
    state.board[4] = makePlaced(balanced, 'bottom', 4);
    state.board[5] = makePlaced(balanced, 'top', 5);
    state.board[6] = makePlaced(balanced, 'top', 6);
    state.board[7] = makePlaced(balanced, 'top', 7);
    // Cell 8 is empty.
    const next = placeCard(state, 't9', 8);
    expect(next.phase).toBe('ended');
    expect(next.winner).toBe('bottom');
    expect(next.placementCount).toBe(9);
  });

  it('declares draw on a 9th placement that produces a 5-4 (not draw) or 5-5? — actually 9 cells produces odd sum, so a true draw on a stat-only game requires equal counts which is only possible mid-game with empty cells', () => {
    // With 9 cells filled and integer counts, draw requires 4.5/4.5 which is
    // impossible — at minimum it's 5-4. But abilities-driven flips can leave
    // unbalanced final boards. We test the draw path at the score level
    // directly in score.test.ts; here we just confirm the engine returns a
    // non-null winner after the 9th placement.
    const state = emptyState({
      hands: { bottom: [], top: [makeInstance(weak, 't9')] },
      turn: 'top',
      placementCount: 8,
    });
    for (let i = 0; i < 8; i++) {
      const player = i % 2 === 0 ? 'bottom' : 'top';
      state.board[i] = makePlaced(balanced, player, i as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7);
    }
    const next = placeCard(state, 't9', 8);
    expect(next.phase).toBe('ended');
    expect(next.winner).not.toBeNull();
  });

  it('does not pass the turn when the game ends', () => {
    const state = emptyState({
      hands: { bottom: [], top: [makeInstance(weak, 't9')] },
      turn: 'top',
      placementCount: 8,
    });
    for (let i = 0; i < 8; i++) {
      state.board[i] = makePlaced(balanced, 'bottom', i as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7);
    }
    const next = placeCard(state, 't9', 8);
    expect(next.turn).toBe('top');
    expect(next.phase).toBe('ended');
  });

  it('handles corner placement (only 2 neighbors)', () => {
    const state = emptyState({
      hands: { bottom: [makeInstance(strong, 'corner')], top: [] },
    });
    state.board[1] = makePlaced(weak, 'top', 1);
    state.board[3] = makePlaced(weak, 'top', 3);
    state.board[4] = makePlaced(weak, 'top', 4); // not adjacent to corner 0
    const next = placeCard(state, 'corner', 0);
    expect(next.board[1]?.controller).toBe('bottom');
    expect(next.board[3]?.controller).toBe('bottom');
    // cell 4 is NOT adjacent to the placer at cell 0. Chain re-eval from
    // cell 1 (now bottom-controlled, but its stats are still weak's 1/1/1/1)
    // checks down → cell 4: weak.bottom (1) vs weak.bottom (1) → tie → no flip.
    expect(next.board[4]?.controller).toBe('top');
  });

  it('handles edge placement (only 3 neighbors)', () => {
    const state = emptyState({
      hands: { bottom: [makeInstance(strong, 'edge')], top: [] },
    });
    // Place at cell 1 (top edge): neighbors 0, 2, 4.
    state.board[0] = makePlaced(weak, 'top', 0);
    state.board[2] = makePlaced(weak, 'top', 2);
    state.board[4] = makePlaced(weak, 'top', 4);
    state.board[7] = makePlaced(weak, 'top', 7); // NOT adjacent to cell 1
    const next = placeCard(state, 'edge', 1);
    expect(next.board[0]?.controller).toBe('bottom');
    expect(next.board[2]?.controller).toBe('bottom');
    expect(next.board[4]?.controller).toBe('bottom');
    // cell 7 may chain-flip via cell 4. Check whichever is correct: 4 is now
    // bottom-weak (1/1/1/1), and 7's stats are weak too — 1 vs 1 is tie, no flip.
    expect(next.board[7]?.controller).toBe('top');
  });
});
