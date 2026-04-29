// Card fixtures for engine tests. These exist solely to give tests a known
// stat set to reason about; the real card content lands in src/data/ later.

import type { Card, CardInstance, GameState, PlacedCard, Player, UnitCard } from '../types';

export const FIXTURE_CARDS: Record<string, UnitCard> = {
  // Loses on every side to anything > 1.
  weak: {
    id: 'weak',
    type: 'unit',
    name: 'Weak',
    stats: { top: 1, bottom: 1, left: 1, right: 1 },
  },
  // Ties with itself; useful for tie-no-flip tests.
  balanced: {
    id: 'balanced',
    type: 'unit',
    name: 'Balanced',
    stats: { top: 5, bottom: 5, left: 5, right: 5 },
  },
  // Wins everywhere unless faced by another strong.
  strong: {
    id: 'strong',
    type: 'unit',
    name: 'Strong',
    stats: { top: 9, bottom: 9, left: 9, right: 9 },
  },
  // Asymmetric: strong on top/left, weak on bottom/right.
  asymmetric: {
    id: 'asymmetric',
    type: 'unit',
    name: 'Asymmetric',
    stats: { top: 9, bottom: 2, left: 8, right: 3 },
  },
};

export function makeInstance(card: Card, instanceId: string): CardInstance {
  return { card, instanceId };
}

export function makePlaced(
  card: UnitCard,
  controller: Player,
  cellIndex: PlacedCard['cellIndex'],
  instanceId = `${card.id}@${cellIndex}`,
  statsOverride?: Partial<UnitCard['stats']>,
): PlacedCard {
  return {
    card,
    instanceId,
    controller,
    cellIndex,
    stats: { ...card.stats, ...statsOverride },
  };
}

export function emptyBoard(): (PlacedCard | null)[] {
  return Array.from({ length: 9 }, () => null);
}

export function emptyState(overrides: Partial<GameState> = {}): GameState {
  return {
    board: emptyBoard(),
    hands: { bottom: [], top: [] },
    decks: { bottom: [], top: [] },
    discards: { bottom: [], top: [] },
    turn: 'bottom',
    placementCount: 0,
    phase: 'placing',
    winner: null,
    rngSeed: 1,
    rngState: 1,
    moveSeq: 0,
    ...overrides,
  };
}

// Build a 20-card deck by repeating a list of cards. Used in setup tests.
export function buildDeck(cards: UnitCard[], targetSize = 20): Card[] {
  const out: Card[] = [];
  for (let i = 0; i < targetSize; i++) {
    out.push(cards[i % cards.length]);
  }
  return out;
}
