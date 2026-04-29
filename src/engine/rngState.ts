// Pure helpers for consuming RNG from a GameState. Each call advances the
// state's `rngState` by one step. Used by abilities that need randomness
// (e.g. play-from-deck to a random cell) — keeps multiplayer determinism
// intact because both clients consume the same stream in the same order.

import type { GameState } from '../types';
import { createRng } from './rng';

export function rngNextInt(
  state: GameState,
  max: number,
): { state: GameState; value: number } {
  const rng = createRng(state.rngState);
  const value = rng.nextInt(max);
  return { state: { ...state, rngState: rng.state() }, value };
}
