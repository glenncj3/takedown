import type { ActionCard, GameState, Player } from '../types';
import { fireTriggers } from './triggers';

// Plays an action card from the active player's hand. Action cards have
// no stats and no board placement — their abilities resolve on-play and
// the card is moved to discard. The placement turn is NOT consumed; per
// DESIGN §5, action cards live in the action phase, separate from the
// alternating-placement structure.
export function playActionCard(
  state: GameState,
  cardInstanceId: string,
): GameState {
  if (state.phase !== 'placing') {
    throw new Error(
      `Cannot play action card: phase is "${state.phase}", not "placing"`,
    );
  }
  const player: Player = state.turn;
  const handIdx = state.hands[player].findIndex(
    (ci) => ci.instanceId === cardInstanceId,
  );
  if (handIdx === -1) {
    throw new Error(`Card ${cardInstanceId} is not in ${player}'s hand`);
  }
  const cardInstance = state.hands[player][handIdx];
  if (cardInstance.card.type !== 'action') {
    throw new Error(
      `Cannot play action card ${cardInstance.card.id}: type is "${cardInstance.card.type}", not "action"`,
    );
  }

  const action = cardInstance.card as ActionCard;

  // Move the action card to discard before firing triggers, so the player
  // who plays a "draw 1" action card doesn't accidentally re-draw the
  // action card itself if it somehow ended up back on top of the deck.
  const hand = state.hands[player].slice();
  hand.splice(handIdx, 1);
  const discard = state.discards[player].slice();
  discard.push(cardInstance);

  let next: GameState = {
    ...state,
    hands: { ...state.hands, [player]: hand },
    discards: { ...state.discards, [player]: discard },
    moveSeq: state.moveSeq + 1,
  };

  next = fireTriggers(
    next,
    { kind: 'action', card: action, instanceId: cardInstance.instanceId },
    'on-play',
    player,
  );

  return next;
}
