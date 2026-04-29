import { describe, it, expect } from 'vitest';
import type { ActionCard, AbilityInstance, UnitCard } from '../types';
import { FIXTURE_CARDS, emptyState, makeInstance, makePlaced } from '../test/fixtures';
import { placeCard } from './place';
import { playActionCard } from './playAction';

const { weak, balanced, strong } = FIXTURE_CARDS;

// Helper to build a unit card with a single ability.
function unitWithAbility(
  base: UnitCard,
  ability: AbilityInstance,
  idSuffix = 'wa',
): UnitCard {
  return {
    ...base,
    id: `${base.id}-${idSuffix}`,
    abilities: [ability],
  };
}

describe('on-play triggers', () => {
  it('on-play stat-buff-self changes flip outcomes', () => {
    // A 5/5/5/5 placer faces a 5/5/5/5 opponent at cell 1. Without a buff,
    // they tie and no flip occurs. With on-play "+1 top", the placer wins
    // and flips the neighbor.
    const buffer = unitWithAbility(balanced, {
      abilityId: 'stat-buff-self',
      trigger: 'on-play',
      params: { stat: 'top', amount: 1 },
    });

    const state = emptyState({
      hands: { bottom: [makeInstance(buffer, 'placer')], top: [] },
    });
    state.board[1] = makePlaced(balanced, 'top', 1);

    const next = placeCard(state, 'placer', 4);
    expect(next.board[1]?.controller).toBe('bottom');
    expect(next.board[4]?.stats.top).toBe(6);
  });

  it('on-play does NOT fire on-flip', () => {
    // Place a card with on-flip "draw 1". Because it's just placed (not
    // flipped), it should NOT draw. Then verify hand is unchanged.
    const drawerOnFlip = unitWithAbility(balanced, {
      abilityId: 'draw-card',
      trigger: 'on-flip',
      params: { count: 1 },
    });
    const state = emptyState({
      hands: { bottom: [makeInstance(drawerOnFlip, 'placer')], top: [] },
      decks: { bottom: [makeInstance(weak, 'd1'), makeInstance(weak, 'd2')], top: [] },
    });
    const next = placeCard(state, 'placer', 4);
    expect(next.hands.bottom).toHaveLength(0);
    expect(next.decks.bottom).toHaveLength(2);
  });
});

describe('on-flip triggers', () => {
  it('fire when a card is flipped, not when placed', () => {
    const drawerOnFlip = unitWithAbility(balanced, {
      abilityId: 'draw-card',
      trigger: 'on-flip',
      params: { count: 1 },
    });
    const state = emptyState({
      hands: { bottom: [makeInstance(strong, 'placer')], top: [] },
      decks: {
        bottom: [],
        top: [makeInstance(weak, 't1'), makeInstance(weak, 't2')],
      },
    });
    state.board[1] = makePlaced(drawerOnFlip, 'top', 1, 'flippee');

    const next = placeCard(state, 'placer', 4);
    expect(next.board[1]?.controller).toBe('bottom');
    // The on-flip handler runs under the new controller (bottom). Bottom's
    // deck is empty so the draw is a no-op for bottom; and TOP's deck is
    // unchanged because the trigger uses post-flip controller.
    expect(next.decks.top).toHaveLength(2);
    expect(next.hands.bottom).toHaveLength(0);
  });

  it('fire under the post-flip controller', () => {
    // Bottom flips a card with on-flip "draw 1". The newly-controlled
    // bottom should draw from BOTTOM's deck.
    const drawer = unitWithAbility(balanced, {
      abilityId: 'draw-card',
      trigger: 'on-flip',
      params: { count: 1 },
    });
    const state = emptyState({
      hands: { bottom: [makeInstance(strong, 'placer')], top: [] },
      decks: {
        bottom: [makeInstance(weak, 'd1')],
        top: [],
      },
    });
    state.board[1] = makePlaced(drawer, 'top', 1, 'flippee');

    const next = placeCard(state, 'placer', 4);
    expect(next.hands.bottom).toHaveLength(1);
    expect(next.decks.bottom).toHaveLength(0);
  });
});

describe('on-end-of-turn triggers', () => {
  it('fire after the placement chain resolves', () => {
    const drawerEot = unitWithAbility(balanced, {
      abilityId: 'draw-card',
      trigger: 'on-end-of-turn',
      params: { count: 1 },
    });
    const state = emptyState({
      hands: { bottom: [makeInstance(drawerEot, 'placer')], top: [] },
      decks: { bottom: [makeInstance(weak, 'd1')], top: [] },
    });
    const next = placeCard(state, 'placer', 4);
    expect(next.hands.bottom).toHaveLength(1);
    expect(next.decks.bottom).toHaveLength(0);
  });

  it('do NOT fire on the 9th placement (game ends first)', () => {
    const drawerEot = unitWithAbility(balanced, {
      abilityId: 'draw-card',
      trigger: 'on-end-of-turn',
      params: { count: 1 },
    });
    const state = emptyState({
      hands: { bottom: [], top: [makeInstance(drawerEot, 'placer')] },
      decks: { bottom: [], top: [makeInstance(weak, 't1')] },
      turn: 'top',
      placementCount: 8,
    });
    for (let i = 0; i < 8; i++) {
      state.board[i] = makePlaced(balanced, 'bottom', i as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7);
    }

    const next = placeCard(state, 'placer', 8);
    expect(next.phase).toBe('ended');
    expect(next.decks.top).toHaveLength(1); // no end-of-turn draw
  });
});

describe('action cards', () => {
  it('resolve and move to discard, drawing replacement when ability says so', () => {
    const drawTwo: ActionCard = {
      id: 'draw-two',
      type: 'action',
      name: 'Draw Two',
      abilities: [
        { abilityId: 'draw-card', trigger: 'on-play', params: { count: 2 } },
      ],
    };
    const state = emptyState({
      hands: { bottom: [makeInstance(drawTwo, 'a1')], top: [] },
      decks: {
        bottom: [makeInstance(weak, 'd1'), makeInstance(weak, 'd2'), makeInstance(weak, 'd3')],
        top: [],
      },
    });
    const next = playActionCard(state, 'a1');
    expect(next.hands.bottom).toHaveLength(2); // played 1, drew 2
    expect(next.discards.bottom).toHaveLength(1);
    expect(next.discards.bottom[0]?.instanceId).toBe('a1');
    expect(next.decks.bottom).toHaveLength(1);
  });

  it('do NOT consume the placement turn', () => {
    const drawAction: ActionCard = {
      id: 'cantrip',
      type: 'action',
      name: 'Cantrip',
      abilities: [
        { abilityId: 'draw-card', trigger: 'on-play', params: { count: 1 } },
      ],
    };
    const state = emptyState({
      hands: { bottom: [makeInstance(drawAction, 'a1')], top: [] },
      decks: { bottom: [makeInstance(weak, 'd1')], top: [] },
      turn: 'bottom',
      placementCount: 3,
    });
    const next = playActionCard(state, 'a1');
    expect(next.turn).toBe('bottom');
    expect(next.placementCount).toBe(3);
  });

  it('with play-from-deck put a unit card on the board', () => {
    const placer: ActionCard = {
      id: 'summon',
      type: 'action',
      name: 'Summon',
      abilities: [
        { abilityId: 'play-from-deck', trigger: 'on-play', params: { cell: 4 } },
      ],
    };
    const state = emptyState({
      hands: { bottom: [makeInstance(placer, 'a1')], top: [] },
      decks: { bottom: [makeInstance(weak, 'summoned')], top: [] },
    });
    const next = playActionCard(state, 'a1');
    expect(next.board[4]?.instanceId).toBe('summoned');
    expect(next.board[4]?.controller).toBe('bottom');
    expect(next.placementCount).toBe(1);
    // Action card itself doesn't advance placement turn.
    expect(next.turn).toBe('bottom');
  });

  it('rejects playing an action card on placement-only routes', () => {
    const action: ActionCard = {
      id: 'a',
      type: 'action',
      name: 'A',
      abilities: [],
    };
    const state = emptyState({
      hands: { bottom: [makeInstance(action, 'a1')], top: [] },
    });
    expect(() => placeCard(state, 'a1', 0)).toThrow(/not "unit"/);
  });

  it('action card with no abilities still discards cleanly', () => {
    const inert: ActionCard = {
      id: 'inert',
      type: 'action',
      name: 'Inert',
      abilities: [],
    };
    const state = emptyState({
      hands: { bottom: [makeInstance(inert, 'a1')], top: [] },
    });
    const next = playActionCard(state, 'a1');
    expect(next.hands.bottom).toHaveLength(0);
    expect(next.discards.bottom).toHaveLength(1);
  });
});

describe('depth cap', () => {
  it('aborts a runaway recursive placement chain', () => {
    // A unit card with on-play that calls play-from-deck for the next deck
    // top, which is the same kind of card. Without the cap, this would
    // recurse forever.
    const recursive: UnitCard = {
      id: 'recursive',
      type: 'unit',
      name: 'Recursive',
      stats: { top: 1, bottom: 1, left: 1, right: 1 },
      abilities: [
        { abilityId: 'play-from-deck', trigger: 'on-play', params: { cell: 'random' } },
      ],
    };
    // Stack 20 of them in the deck (more than the cap).
    const deck = Array.from({ length: 20 }, (_, i) => makeInstance(recursive, `r${i}`));
    const state = emptyState({
      hands: { bottom: [makeInstance(recursive, 'placer')], top: [] },
      decks: { bottom: deck, top: [] },
    });
    // Should not throw or hang. Only enough cards to fill 9 cells will land
    // anyway (or fewer due to depth cap).
    const next = placeCard(state, 'placer', 4);
    const filled = next.board.filter((c) => c !== null).length;
    expect(filled).toBeGreaterThanOrEqual(1);
    expect(filled).toBeLessThanOrEqual(9);
  });
});
