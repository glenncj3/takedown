import type { AbilityHandler } from './types';
import { drawCard } from './handlers/drawCard';
import { playFromDeck } from './handlers/playFromDeck';
import { statBuffSelf } from './handlers/statBuffSelf';
import { statBuffTarget } from './handlers/statBuffTarget';
import { statDebuffTarget } from './handlers/statDebuffTarget';

const REGISTRY: Record<string, AbilityHandler> = {
  'stat-buff-self': statBuffSelf,
  'stat-buff-target': statBuffTarget,
  'stat-debuff-target': statDebuffTarget,
  'draw-card': drawCard,
  'play-from-deck': playFromDeck,
};

export function getHandler(abilityId: string): AbilityHandler | undefined {
  return REGISTRY[abilityId];
}

// Test/extension hook. Phase 6 may grow the registry from card data files,
// at which point we'll either lift this to a builder or move registration
// next to each handler.
export function registerHandler(
  abilityId: string,
  handler: AbilityHandler,
): void {
  REGISTRY[abilityId] = handler;
}

export function unregisterHandler(abilityId: string): void {
  delete REGISTRY[abilityId];
}
