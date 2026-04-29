import type { CellIndex, GameState, PlacedCard, Player } from '../types';
import { resolvePlacement } from './resolve';
import { scoreBoard } from './score';
import { fireEndOfTurnTriggers, fireTriggers } from './triggers';

// Plays a unit card from the active player's hand to an empty cell.
// Validates the move, builds the PlacedCard, fires on-play, runs the flip
// chain (firing on-flip per flipped card), then either ends the game
// (after the 9th placement) or fires on-end-of-turn and passes the turn.
//
// Throws on illegal moves so the UI / network layer can surface the error.
export function placeCard(
  state: GameState,
  cardInstanceId: string,
  cell: CellIndex,
): GameState {
  if (state.phase !== 'placing') {
    throw new Error(`Cannot place card: phase is "${state.phase}", not "placing"`);
  }
  if (state.board[cell] !== null) {
    throw new Error(`Cell ${cell} is occupied`);
  }

  const player: Player = state.turn;
  const handIdx = state.hands[player].findIndex(
    (ci) => ci.instanceId === cardInstanceId,
  );
  if (handIdx === -1) {
    throw new Error(`Card ${cardInstanceId} is not in ${player}'s hand`);
  }
  const cardInstance = state.hands[player][handIdx];
  if (cardInstance.card.type !== 'unit') {
    throw new Error(
      `Cannot place card ${cardInstance.card.id}: type is "${cardInstance.card.type}", not "unit"`,
    );
  }

  const placed: PlacedCard = {
    card: cardInstance.card,
    instanceId: cardInstance.instanceId,
    controller: player,
    cellIndex: cell,
    stats: { ...cardInstance.card.stats },
  };

  const board = state.board.slice();
  board[cell] = placed;
  const hand = state.hands[player].slice();
  hand.splice(handIdx, 1);

  let next: GameState = {
    ...state,
    board,
    hands: { ...state.hands, [player]: hand },
    placementCount: state.placementCount + 1,
    moveSeq: state.moveSeq + 1,
  };

  // 3. on-play resolution (DESIGN §5)
  next = fireTriggers(next, { kind: 'placed', card: placed }, 'on-play', player);

  // 4-5. Initial flip + chain. on-flip handlers fire between flips so a
  // flipped card's stat changes affect subsequent chain steps.
  next = resolvePlacement(next, cell, {
    onFlip: (s, flippedCell) => {
      const flipped = s.board[flippedCell];
      if (!flipped) return s;
      return fireTriggers(
        s,
        { kind: 'placed', card: flipped },
        'on-flip',
        flipped.controller,
      );
    },
  });

  // The 9th placement ends the game before end-of-turn fires (DESIGN §5
  // says the game ends when "the 9th unit card is placed and its chain
  // fully resolves" — end-of-turn comes after that).
  if (next.placementCount >= 9) {
    const { winner } = scoreBoard(next);
    return { ...next, phase: 'ended', winner };
  }

  // 6. on-end-of-turn for cards still controlled by the active player.
  next = fireEndOfTurnTriggers(next, player);

  // 7. Turn passes.
  return { ...next, turn: opposite(player) };
}

function opposite(player: Player): Player {
  return player === 'bottom' ? 'top' : 'bottom';
}
