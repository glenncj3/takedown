import { describe, it, expect } from 'vitest';
import type { ActionCard } from '../../types';
import { FIXTURE_CARDS, emptyState, makeInstance } from '../../test/fixtures';
import { playFromDeck } from './playFromDeck';
import type { AbilityContext } from '../types';

const { weak, balanced, strong } = FIXTURE_CARDS;

const dummyAction: ActionCard = {
  id: 'caster',
  type: 'action',
  name: 'Caster',
  abilities: [],
};

function actionCtx(state: import('../../types').GameState): AbilityContext {
  return {
    state,
    trigger: 'on-play',
    source: { kind: 'action', card: dummyAction, instanceId: 'a1' },
    controller: 'bottom',
  };
}

describe('playFromDeck handler', () => {
  it('places the top of deck onto a specified empty cell', () => {
    const state = emptyState({
      decks: {
        bottom: [makeInstance(weak, 'b1'), makeInstance(strong, 'b2')],
        top: [],
      },
    });
    const delta = playFromDeck(actionCtx(state), { cell: 4 });
    expect(delta.state.board[4]?.instanceId).toBe('b2'); // top of deck = end of array
    expect(delta.state.decks.bottom).toHaveLength(1);
    expect(delta.cardsPlaced).toEqual([4]);
    expect(delta.state.placementCount).toBe(1);
  });

  it('chooses a random empty cell when cell is "random" and consumes RNG', () => {
    const state = emptyState({
      decks: { bottom: [makeInstance(weak, 'b1')], top: [] },
      rngState: 999,
    });
    const delta = playFromDeck(actionCtx(state), { cell: 'random' });
    // Some cell is occupied, RNG state advanced
    const placedCount = delta.state.board.filter((c) => c !== null).length;
    expect(placedCount).toBe(1);
    expect(delta.state.rngState).not.toBe(999);
    expect(delta.cardsPlaced).toHaveLength(1);
  });

  it('produces the same random cell for the same rngState (determinism)', () => {
    const state = emptyState({
      decks: { bottom: [makeInstance(weak, 'b1')], top: [] },
      rngState: 12345,
    });
    const a = playFromDeck(actionCtx(state), { cell: 'random' });
    const b = playFromDeck(actionCtx(state), { cell: 'random' });
    const aCell = a.state.board.findIndex((c) => c !== null);
    const bCell = b.state.board.findIndex((c) => c !== null);
    expect(aCell).toBe(bCell);
  });

  it('skips action cards on top of the deck', () => {
    const state = emptyState({
      decks: { bottom: [makeInstance(dummyAction, 'a1')], top: [] },
    });
    const delta = playFromDeck(actionCtx(state), { cell: 4 });
    expect(delta.state).toBe(state);
  });

  it('no-ops on an empty deck', () => {
    const state = emptyState();
    const delta = playFromDeck(actionCtx(state), { cell: 4 });
    expect(delta.state).toBe(state);
  });

  it('no-ops if specified cell is occupied', () => {
    const state = emptyState({
      decks: { bottom: [makeInstance(weak, 'b1')], top: [] },
    });
    state.board[4] = {
      card: balanced,
      instanceId: 'occupier',
      controller: 'top',
      cellIndex: 4,
      stats: { ...balanced.stats },
    };
    const delta = playFromDeck(actionCtx(state), { cell: 4 });
    expect(delta.state).toBe(state);
  });

  it('no-ops if all cells are occupied for "random"', () => {
    const state = emptyState({
      decks: { bottom: [makeInstance(weak, 'b1')], top: [] },
    });
    for (let i = 0; i < 9; i++) {
      state.board[i] = {
        card: balanced,
        instanceId: `occ${i}`,
        controller: 'top',
        cellIndex: i as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
        stats: { ...balanced.stats },
      };
    }
    const delta = playFromDeck(actionCtx(state), { cell: 'random' });
    expect(delta.state).toBe(state);
  });
});
