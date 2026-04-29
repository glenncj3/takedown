import type { CellIndex, GameState, PlacedCard, Player } from '../types';
import { resolvePlacement } from './resolve';
import { scoreBoard } from './score';

// Plays a unit card from the active player's hand to an empty cell.
// Validates the move, builds the PlacedCard, runs the flip chain, then
// either ends the game (after the 9th placement) or passes the turn.
//
// Throws on illegal moves so the UI/network layer can surface the error.
// Phase 1 omits the on-play and on-end-of-turn ability hooks — Phase 3
// will splice those into resolvePlacement and the end-of-turn step.
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

  next = resolvePlacement(next, cell);

  if (next.placementCount >= 9) {
    const { winner } = scoreBoard(next);
    return { ...next, phase: 'ended', winner };
  }

  return { ...next, turn: opposite(player) };
}

function opposite(player: Player): Player {
  return player === 'bottom' ? 'top' : 'bottom';
}
