import type { AbilityHandler } from '../types';
import { statBuffTarget } from './statBuffTarget';

// Same shape as stat-buff-target but the amount is negated. We accept the
// raw `amount` from params and flip the sign so card data can use either
// positive numbers (idiomatic "debuff X by 2") or negative ones.
//
// Params: { stat: Stat; amount: number; targeting: ... }
export const statDebuffTarget: AbilityHandler = (ctx, params) => {
  const amount = params?.amount;
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return { state: ctx.state };
  }
  const flipped = { ...params, amount: -Math.abs(amount) };
  return statBuffTarget(ctx, flipped);
};
