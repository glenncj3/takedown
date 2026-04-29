import type { AbilityHandler } from '../types';
import { parseNumber, parseStat } from '../params';

// Modifies one stat on the source card by `amount` (negative permitted).
// Only meaningful for placed sources — action cards have no stats to buff,
// so the handler no-ops if invoked from one.
//
// Params: { stat: Stat; amount: number }
export const statBuffSelf: AbilityHandler = (ctx, params) => {
  const { state } = ctx;
  if (ctx.source.kind !== 'placed') return { state };

  const stat = parseStat(params?.stat);
  const amount = parseNumber(params?.amount);
  if (stat === null || amount === null) return { state };

  const cellIndex = ctx.source.card.cellIndex;
  const placed = state.board[cellIndex];
  if (!placed) return { state };

  const board = state.board.slice();
  board[cellIndex] = {
    ...placed,
    stats: { ...placed.stats, [stat]: placed.stats[stat] + amount },
  };
  return { state: { ...state, board } };
};
