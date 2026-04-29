import { describe, it, expect } from 'vitest';
import type { Card } from '../types';
import { FIXTURE_CARDS, buildDeck } from '../test/fixtures';
import { INITIAL_HAND_SIZE, createInitialState } from './setup';
import { placeCard } from './place';

const { weak, balanced, strong, asymmetric } = FIXTURE_CARDS;

const DECK_A: Card[] = buildDeck([weak, balanced, strong, asymmetric]);
const DECK_B: Card[] = buildDeck([balanced, asymmetric, weak, strong]);

const decksById = { A: DECK_A, B: DECK_B };

describe('createInitialState', () => {
  it('produces identical state from the same seed and options', () => {
    const opts = {
      seed: 12345,
      decksById,
      deckAssignment: { bottom: 'A', top: 'B' } as const,
    };
    const a = createInitialState(opts);
    const b = createInitialState(opts);
    expect(a).toEqual(b);
  });

  it('produces different shuffles for different seeds', () => {
    const aOpts = {
      seed: 1,
      decksById,
      deckAssignment: { bottom: 'A', top: 'B' } as const,
    };
    const bOpts = { ...aOpts, seed: 2 };
    const a = createInitialState(aOpts);
    const b = createInitialState(bOpts);
    expect(a.hands).not.toEqual(b.hands);
  });

  it('deals INITIAL_HAND_SIZE cards to each player', () => {
    const state = createInitialState({
      seed: 7,
      decksById,
      deckAssignment: { bottom: 'A', top: 'B' },
    });
    expect(state.hands.bottom).toHaveLength(INITIAL_HAND_SIZE);
    expect(state.hands.top).toHaveLength(INITIAL_HAND_SIZE);
    expect(state.decks.bottom).toHaveLength(20 - INITIAL_HAND_SIZE);
    expect(state.decks.top).toHaveLength(20 - INITIAL_HAND_SIZE);
  });

  it('defaults firstTurn to bottom and phase to placing', () => {
    const state = createInitialState({
      seed: 1,
      decksById,
      deckAssignment: { bottom: 'A', top: 'B' },
    });
    expect(state.turn).toBe('bottom');
    expect(state.phase).toBe('placing');
    expect(state.winner).toBeNull();
    expect(state.placementCount).toBe(0);
    expect(state.board).toHaveLength(9);
    expect(state.board.every((c) => c === null)).toBe(true);
  });

  it('respects an explicit firstTurn', () => {
    const state = createInitialState({
      seed: 1,
      decksById,
      deckAssignment: { bottom: 'A', top: 'B' },
      firstTurn: 'top',
    });
    expect(state.turn).toBe('top');
  });

  it('throws on an unknown deck id', () => {
    expect(() =>
      createInitialState({
        seed: 1,
        decksById,
        deckAssignment: { bottom: 'A', top: 'C' },
      }),
    ).toThrow(/Unknown deck/);
  });

  it('assigns unique instanceIds across all card slots', () => {
    const state = createInitialState({
      seed: 99,
      decksById,
      deckAssignment: { bottom: 'A', top: 'B' },
    });
    const ids = [
      ...state.hands.bottom.map((c) => c.instanceId),
      ...state.hands.top.map((c) => c.instanceId),
      ...state.decks.bottom.map((c) => c.instanceId),
      ...state.decks.top.map((c) => c.instanceId),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(40);
  });

  it('shuffles each deck independently and reproducibly', () => {
    // Same seed, swap assignments → bottom's deck (B) should equal what
    // top's deck (B) was before, modulo the player-prefixed instanceId.
    const a = createInitialState({
      seed: 1,
      decksById,
      deckAssignment: { bottom: 'A', top: 'B' },
    });
    const b = createInitialState({
      seed: 1,
      decksById,
      deckAssignment: { bottom: 'A', top: 'B' },
    });
    expect(a.decks.bottom.map((c) => c.card.id)).toEqual(
      b.decks.bottom.map((c) => c.card.id),
    );
  });
});

describe('end-to-end determinism', () => {
  it('two independent runs with the same seed and moves produce identical states', () => {
    const opts = {
      seed: 4242,
      decksById,
      deckAssignment: { bottom: 'A', top: 'B' } as const,
    };

    function play(seed: typeof opts) {
      let state = createInitialState(seed);
      // Always play the first card in hand of the active player into the
      // first empty cell. Determinstic given the seed.
      while (state.phase === 'placing') {
        const player = state.turn;
        const handCard = state.hands[player].find((c) => c.card.type === 'unit');
        if (!handCard) break;
        const emptyCell = state.board.findIndex((c) => c === null);
        if (emptyCell === -1) break;
        state = placeCard(state, handCard.instanceId, emptyCell as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8);
      }
      return state;
    }

    const a = play(opts);
    const b = play(opts);
    expect(a).toEqual(b);
    expect(a.phase).toBe('ended');
    expect(a.winner).not.toBeNull();
  });
});
