import type { GameState, Player, Winner } from '../types';

export interface BoardScore {
  bottom: number;
  top: number;
  winner: Winner;
}

// Counts cards each player controls on the board. After the 9th placement
// resolves the board is full, so this becomes the final score.
//
// Cards still in hand or deck do not contribute. DESIGN §5 specifies the
// game ends when the 9th unit card is placed, at which point the board
// alone determines the winner.
export function scoreBoard(state: GameState): BoardScore {
  let bottom = 0;
  let top = 0;
  for (const cell of state.board) {
    if (!cell) continue;
    if (cell.controller === 'bottom') bottom++;
    else top++;
  }
  let winner: Winner = 'draw';
  if (bottom > top) winner = 'bottom';
  else if (top > bottom) winner = 'top';
  return { bottom, top, winner };
}

export function controllerCount(state: GameState, player: Player): number {
  let n = 0;
  for (const cell of state.board) {
    if (cell?.controller === player) n++;
  }
  return n;
}
