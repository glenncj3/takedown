import { describe, it, expect } from 'vitest';
import type { ActionCard } from '../types';
import { FIXTURE_CARDS, emptyState, makeInstance, makePlaced } from '../test/fixtures';
import { aiTakeTurn } from './play';

const { weak, strong, balanced } = FIXTURE_CARDS;

describe('aiTakeTurn', () => {
  it('picks the highest-flip move', () => {
    // Top has one strong card. Center placement flips 4 weak neighbors.
    // Corner placement flips at most 2. AI must pick center (cell 4).
    const state = emptyState({
      hands: { bottom: [], top: [makeInstance(strong, 't1')] },
      turn: 'top',
    });
    state.board[1] = makePlaced(weak, 'bottom', 1);
    state.board[3] = makePlaced(weak, 'bottom', 3);
    state.board[5] = makePlaced(weak, 'bottom', 5);
    state.board[7] = makePlaced(weak, 'bottom', 7);

    const next = aiTakeTurn(state);
    expect(next.board[4]?.controller).toBe('top');
    expect(next.board[4]?.instanceId).toBe('t1');
    // All 4 neighbors flipped to top.
    for (const c of [1, 3, 5, 7] as const) {
      expect(next.board[c]?.controller).toBe('top');
    }
  });

  it('breaks ties deterministically using the seeded RNG', () => {
    // Empty board. AI has weak (no flips possible). All four corners score 2,
    // all four edges score 1, center scores 0. Best = 4 corners (tie).
    // Seeded RNG picks one corner.
    const baseState = emptyState({
      hands: { bottom: [], top: [makeInstance(weak, 't1')] },
      turn: 'top',
      rngState: 12345,
    });

    const a = aiTakeTurn(baseState);
    const b = aiTakeTurn(baseState);
    // Same input → same result.
    const aCell = a.board.findIndex((c) => c?.instanceId === 't1');
    const bCell = b.board.findIndex((c) => c?.instanceId === 't1');
    expect(aCell).toBe(bCell);
    // Result is a corner.
    expect([0, 2, 6, 8]).toContain(aCell);

    // Different seed → can pick a different corner.
    const c = aiTakeTurn({ ...baseState, rngState: 99 });
    const cCell = c.board.findIndex((ci) => ci?.instanceId === 't1');
    expect([0, 2, 6, 8]).toContain(cCell);
    // (Not asserting cCell !== aCell — different seeds may coincidentally pick
    //  the same index. The deterministic property is: same seed → same pick.)
  });

  it('never picks an illegal move', () => {
    // Eight cells occupied. AI must place into the only empty cell (8).
    const state = emptyState({
      hands: { bottom: [], top: [makeInstance(strong, 't1')] },
      turn: 'top',
      placementCount: 8,
    });
    for (let i = 0; i < 8; i++) {
      state.board[i] = makePlaced(balanced, 'bottom', i as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7);
    }

    const next = aiTakeTurn(state);
    expect(next.board[8]?.instanceId).toBe('t1');
    expect(next.phase).toBe('ended');
  });

  it('plays a qualifying action card when hand size is below threshold', () => {
    const drawTwo: ActionCard = {
      id: 'draw-two',
      type: 'action',
      name: 'Draw Two',
      abilities: [
        { abilityId: 'draw-card', trigger: 'on-play', params: { count: 2 } },
      ],
    };
    const state = emptyState({
      hands: { bottom: [], top: [makeInstance(drawTwo, 'a1')] }, // hand size 1 < 2
      decks: {
        bottom: [],
        top: [makeInstance(weak, 'd1'), makeInstance(strong, 'd2')],
      },
      turn: 'top',
    });
    const next = aiTakeTurn(state);
    // Action card should have been played and replaced; then a placement
    // happened with one of the drawn unit cards.
    expect(next.discards.top).toHaveLength(1);
    expect(next.discards.top[0]?.instanceId).toBe('a1');
    // A unit landed on the board.
    const placed = next.board.filter((c) => c !== null);
    expect(placed.length).toBeGreaterThanOrEqual(1);
  });

  it('does not play an action card when hand size is at or above threshold', () => {
    const drawTwo: ActionCard = {
      id: 'draw-two',
      type: 'action',
      name: 'Draw Two',
      abilities: [
        { abilityId: 'draw-card', trigger: 'on-play', params: { count: 2 } },
      ],
    };
    const state = emptyState({
      hands: {
        bottom: [],
        top: [
          makeInstance(drawTwo, 'a1'),
          makeInstance(strong, 't1'),
          makeInstance(weak, 't2'),
        ],
      },
      decks: { bottom: [], top: [makeInstance(weak, 'd1')] },
      turn: 'top',
    });
    const next = aiTakeTurn(state);
    expect(next.discards.top).toHaveLength(0);
    expect(next.hands.top.find((c) => c.instanceId === 'a1')).toBeDefined();
  });

  it('returns state unchanged when no legal placement exists', () => {
    // Top has no unit cards and no qualifying action cards.
    const state = emptyState({
      hands: { bottom: [], top: [] },
      turn: 'top',
    });
    const next = aiTakeTurn(state);
    expect(next).toBe(state);
  });

  it('does nothing when phase is not "placing"', () => {
    const state = emptyState({
      hands: { bottom: [], top: [makeInstance(strong, 't1')] },
      turn: 'top',
      phase: 'ended',
    });
    expect(aiTakeTurn(state)).toBe(state);
  });
});
