import { describe, it, expect } from 'vitest';
import { FIXTURE_CARDS, emptyState, makePlaced } from '../../test/fixtures';
import { statDebuffTarget } from './statDebuffTarget';
import type { AbilityContext } from '../types';

const { balanced } = FIXTURE_CARDS;

describe('statDebuffTarget', () => {
  it('treats a positive amount as a subtraction', () => {
    const state = emptyState();
    const source = makePlaced(balanced, 'bottom', 4);
    state.board[4] = source;
    state.board[1] = makePlaced(balanced, 'top', 1);

    const ctx: AbilityContext = {
      state,
      trigger: 'on-play',
      source: { kind: 'placed', card: source },
      controller: 'bottom',
      cellIndex: 4,
    };
    const delta = statDebuffTarget(ctx, {
      stat: 'top',
      amount: 2,
      targeting: 'all-opponent',
    });
    expect(delta.state.board[1]?.stats.top).toBe(3);
  });

  it('treats a negative amount as a subtraction (uses absolute value)', () => {
    const state = emptyState();
    const source = makePlaced(balanced, 'bottom', 4);
    state.board[4] = source;
    state.board[1] = makePlaced(balanced, 'top', 1);

    const ctx: AbilityContext = {
      state,
      trigger: 'on-play',
      source: { kind: 'placed', card: source },
      controller: 'bottom',
      cellIndex: 4,
    };
    const delta = statDebuffTarget(ctx, {
      stat: 'top',
      amount: -2,
      targeting: 'all-opponent',
    });
    expect(delta.state.board[1]?.stats.top).toBe(3);
  });
});
