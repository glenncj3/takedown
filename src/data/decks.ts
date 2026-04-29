import type { Card } from '../types';
import cardsJson from './cards.json';

const ALL_CARDS: Record<string, Card> = Object.fromEntries(
  (cardsJson as Card[]).map((c) => [c.id, c]),
);

export function resolveCard(id: string): Card {
  const card = ALL_CARDS[id];
  if (!card) throw new Error(`Unknown card id: ${id}`);
  return card;
}

function resolveDeck(ids: string[]): Card[] {
  return ids.map(resolveCard);
}

// Two starter decks. Phase 2 ships ten distinct unit cards; each deck holds
// two copies of each (20 total). Phase 6 will replace this content with
// designer-balanced sets.
const DECK_A_IDS: string[] = [
  'footman', 'quick-draw',
  'scout', 'scout',
  'militia', 'militia',
  'archer', 'archer',
  'spearman', 'spearman',
  'cavalier', 'cavalier',
  'captain', 'captain',
  'wizard', 'wizard',
  'knight', 'knight',
  'dragon', 'dragon',
];

const DECK_B_IDS: string[] = [...DECK_A_IDS];

export const DECK_A: Card[] = resolveDeck(DECK_A_IDS);
export const DECK_B: Card[] = resolveDeck(DECK_B_IDS);

export const DECKS_BY_ID: Record<string, Card[]> = {
  A: DECK_A,
  B: DECK_B,
};
