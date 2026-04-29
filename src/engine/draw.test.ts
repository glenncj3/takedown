import { describe, it, expect } from 'vitest';
import { FIXTURE_CARDS, emptyState, makeInstance } from '../test/fixtures';
import { drawCards } from './draw';

const { weak, balanced, strong } = FIXTURE_CARDS;

describe('drawCards', () => {
  it('moves N cards from the top of the deck into the hand', () => {
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
    const next = drawCards(state, 'bottom', 2);
    expect(next.decks.bottom).toHaveLength(1);
    expect(next.hands.bottom).toHaveLength(2);
    // Top of deck = end of array. Draws pop from the end.
    expect(next.hands.bottom[0]?.instanceId).toBe('b3');
    expect(next.hands.bottom[1]?.instanceId).toBe('b2');
    expect(next.decks.bottom[0]?.instanceId).toBe('b1');
  });

  it('draws as many as available when deck is shorter than count', () => {
    const state = emptyState({
      decks: { bottom: [makeInstance(weak, 'b1')], top: [] },
    });
    const next = drawCards(state, 'bottom', 5);
    expect(next.decks.bottom).toEqual([]);
    expect(next.hands.bottom).toHaveLength(1);
  });

  it('is a no-op for count <= 0', () => {
    const state = emptyState({
      decks: { bottom: [makeInstance(weak, 'b1')], top: [] },
    });
    expect(drawCards(state, 'bottom', 0)).toBe(state);
    expect(drawCards(state, 'bottom', -3)).toBe(state);
  });

  it('does not mutate the input state', () => {
    const original = emptyState({
      decks: { bottom: [makeInstance(weak, 'b1')], top: [] },
    });
    const beforeDeck = original.decks.bottom.slice();
    const beforeHand = original.hands.bottom.slice();
    drawCards(original, 'bottom', 1);
    expect(original.decks.bottom).toEqual(beforeDeck);
    expect(original.hands.bottom).toEqual(beforeHand);
  });

  it('only affects the specified player', () => {
    const state = emptyState({
      decks: {
        bottom: [makeInstance(weak, 'b1')],
        top: [makeInstance(weak, 't1'), makeInstance(weak, 't2')],
      },
    });
    const next = drawCards(state, 'bottom', 1);
    expect(next.decks.top).toEqual(state.decks.top);
    expect(next.hands.top).toEqual(state.hands.top);
  });
});
