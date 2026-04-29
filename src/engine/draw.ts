import type { GameState, Player } from '../types';

// Moves up to `count` cards from the top of `player`'s deck into their hand.
// "Top of deck" is the end of the deck array (per DESIGN §7). If the deck
// runs out, fewer cards are drawn — the engine never throws on empty deck;
// callers that care can compare hand size before/after.
export function drawCards(state: GameState, player: Player, count: number): GameState {
  if (count <= 0) return state;

  const deck = state.decks[player].slice();
  const hand = state.hands[player].slice();
  const actual = Math.min(count, deck.length);
  for (let i = 0; i < actual; i++) {
    const card = deck.pop();
    if (card) hand.push(card);
  }

  return {
    ...state,
    decks: { ...state.decks, [player]: deck },
    hands: { ...state.hands, [player]: hand },
  };
}
