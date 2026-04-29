import { drawCards } from '../../engine/draw';
import type { AbilityHandler } from '../types';
import { parseInt32 } from '../params';

// Draws N cards from the source's controller's deck into their hand.
// Silently caps at deck size — the engine never errors on empty deck.
//
// Params: { count: number }
export const drawCard: AbilityHandler = (ctx, params) => {
  const count = parseInt32(params?.count);
  if (count === null || count <= 0) return { state: ctx.state };
  return { state: drawCards(ctx.state, ctx.controller, count) };
};
