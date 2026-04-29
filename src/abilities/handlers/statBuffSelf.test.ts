import { describe, it, expect } from 'vitest';
import { FIXTURE_CARDS, emptyState, makePlaced } from '../../test/fixtures';
import { statBuffSelf } from './statBuffSelf';
import type { AbilityContext } from '../types';

const { balanced } = FIXTURE_CARDS;

function placedCtx(): AbilityContext {
  const state = emptyState();
  const placed = makePlaced(balanced, 'bottom', 4);
  state.board[4] = placed;
  return {
    state,
    trigger: 'on-play',
    source: { kind: 'placed', card: placed },
    controller: 'bottom',
    cellIndex: 4,
  };
}

describe('statBuffSelf', () => {
  it('adds amount to the source card stat', () => {
    const ctx = placedCtx();
    const delta = statBuffSelf(ctx, { stat: 'top', amount: 3 });
    expect(delta.state.board[4]?.stats.top).toBe(8); // 5 + 3
    expect(delta.state.board[4]?.stats.bottom).toBe(5);
  });

  it('handles negative amounts', () => {
    const ctx = placedCtx();
    const delta = statBuffSelf(ctx, { stat: 'left', amount: -2 });
    expect(delta.state.board[4]?.stats.left).toBe(3);
  });

  it('no-ops on missing or invalid params', () => {
    const ctx = placedCtx();
    expect(statBuffSelf(ctx, undefined).state).toBe(ctx.state);
    expect(statBuffSelf(ctx, { stat: 'wrong' }).state).toBe(ctx.state);
    expect(statBuffSelf(ctx, { stat: 'top' }).state).toBe(ctx.state);
    expect(statBuffSelf(ctx, { stat: 'top', amount: 'three' }).state).toBe(
      ctx.state,
    );
  });

  it('no-ops for action card sources', () => {
    const state = emptyState();
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
    const delta = statBuffSelf(ctx, { stat: 'top', amount: 1 });
    expect(delta.state).toBe(state);
  });

  it('does not mutate the input state', () => {
    const ctx = placedCtx();
    const originalStats = { ...ctx.state.board[4]!.stats };
    statBuffSelf(ctx, { stat: 'top', amount: 5 });
    expect(ctx.state.board[4]?.stats).toEqual(originalStats);
  });
});
