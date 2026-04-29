import { describe, it, expect } from 'vitest';
import { FIXTURE_CARDS, emptyState, makePlaced } from '../../test/fixtures';
import { statBuffTarget } from './statBuffTarget';
import type { AbilityContext } from '../types';

const { balanced } = FIXTURE_CARDS;

describe('statBuffTarget', () => {
  it('targets adjacent cells around a placed source', () => {
    const state = emptyState();
    const source = makePlaced(balanced, 'bottom', 4);
    state.board[4] = source;
    state.board[1] = makePlaced(balanced, 'bottom', 1); // adjacent
    state.board[3] = makePlaced(balanced, 'top', 3);    // adjacent
    state.board[0] = makePlaced(balanced, 'top', 0);    // NOT adjacent

    const ctx: AbilityContext = {
      state,
      trigger: 'on-play',
      source: { kind: 'placed', card: source },
      controller: 'bottom',
      cellIndex: 4,
    };
    const delta = statBuffTarget(ctx, { stat: 'top', amount: 2, targeting: 'adjacent' });
    expect(delta.state.board[1]?.stats.top).toBe(7); // adjacent
    expect(delta.state.board[3]?.stats.top).toBe(7); // adjacent
    expect(delta.state.board[0]?.stats.top).toBe(5); // not adjacent — unchanged
    expect(delta.state.board[4]?.stats.top).toBe(5); // source itself — not in adjacent set
  });

  it('targets all-allied including the source', () => {
    const state = emptyState();
    const source = makePlaced(balanced, 'bottom', 4);
    state.board[4] = source;
    state.board[0] = makePlaced(balanced, 'bottom', 0); // ally
    state.board[1] = makePlaced(balanced, 'top', 1);    // opponent

    const ctx: AbilityContext = {
      state,
      trigger: 'on-play',
      source: { kind: 'placed', card: source },
      controller: 'bottom',
      cellIndex: 4,
    };
    const delta = statBuffTarget(ctx, { stat: 'right', amount: 1, targeting: 'all-allied' });
    expect(delta.state.board[0]?.stats.right).toBe(6);
    expect(delta.state.board[4]?.stats.right).toBe(6);
    expect(delta.state.board[1]?.stats.right).toBe(5);
  });

  it('targets all-opponent', () => {
    const state = emptyState();
    const source = makePlaced(balanced, 'bottom', 4);
    state.board[4] = source;
    state.board[0] = makePlaced(balanced, 'top', 0);
    state.board[8] = makePlaced(balanced, 'top', 8);
    state.board[2] = makePlaced(balanced, 'bottom', 2);

    const ctx: AbilityContext = {
      state,
      trigger: 'on-play',
      source: { kind: 'placed', card: source },
      controller: 'bottom',
      cellIndex: 4,
    };
    const delta = statBuffTarget(ctx, {
      stat: 'left',
      amount: -3,
      targeting: 'all-opponent',
    });
    expect(delta.state.board[0]?.stats.left).toBe(2);
    expect(delta.state.board[8]?.stats.left).toBe(2);
    expect(delta.state.board[2]?.stats.left).toBe(5);
    expect(delta.state.board[4]?.stats.left).toBe(5);
  });

  it('adjacent targeting from an action source is a no-op', () => {
    const state = emptyState();
    state.board[0] = makePlaced(balanced, 'top', 0);
    const ctx: AbilityContext = {
      state,
      trigger: 'on-play',
      source: {
        kind: 'action',
        card: { id: 'a', type: 'action', name: 'A', abilities: [] },
        instanceId: 'a1',
      },
      controller: 'bottom',
    };
    const delta = statBuffTarget(ctx, { stat: 'top', amount: 5, targeting: 'adjacent' });
    expect(delta.state).toBe(state);
  });
});
