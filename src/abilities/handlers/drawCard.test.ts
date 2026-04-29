import { describe, it, expect } from 'vitest';
import { FIXTURE_CARDS, emptyState, makeInstance } from '../../test/fixtures';
import { drawCard } from './drawCard';
import type { AbilityContext } from '../types';

const { weak, balanced, strong } = FIXTURE_CARDS;

describe('drawCard handler', () => {
  it('draws N cards from the controller deck', () => {
    const state = emptyState({
      decks: {
        bottom: [
          makeInstance(weak, 'b1'),
          makeInstance(balanced, 'b2'),
          makeInstance(strong, 'b3'),
        ],
        top: [],
      },
    });
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
    const delta = drawCard(ctx, { count: 2 });
    expect(delta.state.hands.bottom).toHaveLength(2);
    expect(delta.state.decks.bottom).toHaveLength(1);
  });

  it('caps at the deck size when drawing more than available', () => {
    const state = emptyState({
      decks: { bottom: [makeInstance(weak, 'b1')], top: [] },
    });
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
    const delta = drawCard(ctx, { count: 5 });
    expect(delta.state.hands.bottom).toHaveLength(1);
    expect(delta.state.decks.bottom).toHaveLength(0);
  });

  it('no-ops on missing or non-positive count', () => {
    const state = emptyState({
      decks: { bottom: [makeInstance(weak, 'b1')], top: [] },
    });
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
    expect(drawCard(ctx, undefined).state).toBe(state);
    expect(drawCard(ctx, { count: 0 }).state).toBe(state);
    expect(drawCard(ctx, { count: -3 }).state).toBe(state);
  });
});
