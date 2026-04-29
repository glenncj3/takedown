import { create } from 'zustand';
import type { CellIndex, GameState, Player } from '../types';
import { placeCard as enginePlaceCard } from '../engine/place';
import { playActionCard as enginePlayActionCard } from '../engine/playAction';
import { createInitialState } from '../engine/setup';
import { DECKS_BY_ID } from '../data/decks';

export type Mode = 'hot-seat';

interface GameStore {
  game: GameState;
  selectedInstanceId: string | null;
  mode: Mode;
  // Last engine error surfaced to the UI (e.g. invalid placement). null
  // when the most recent move was clean.
  lastError: string | null;

  startGame: (seed?: number) => void;
  resetGame: (seed?: number) => void;
  selectCard: (instanceId: string | null) => void;
  placeSelectedCardOn: (cell: CellIndex) => void;
  playActionCard: (instanceId: string) => void;
  // Test/debug hook: load an externally-constructed state.
  loadGame: (state: GameState) => void;
}

function freshSeed(): number {
  // Date.now() is non-deterministic; fine for production. Tests should
  // call startGame(specificSeed) or loadGame() to control state.
  const v = (Date.now() & 0x7fffffff) >>> 0;
  return v || 1;
}

function newGameState(seed: number, firstTurn: Player = 'bottom'): GameState {
  return createInitialState({
    seed,
    decksById: DECKS_BY_ID,
    deckAssignment: { bottom: 'A', top: 'B' },
    firstTurn,
  });
}

export const useGameStore = create<GameStore>((set, get) => ({
  game: newGameState(freshSeed()),
  selectedInstanceId: null,
  mode: 'hot-seat',
  lastError: null,

  startGame: (seed) =>
    set({
      game: newGameState(seed ?? freshSeed()),
      selectedInstanceId: null,
      lastError: null,
    }),

  resetGame: (seed) =>
    set({
      game: newGameState(seed ?? freshSeed()),
      selectedInstanceId: null,
      lastError: null,
    }),

  selectCard: (instanceId) => set({ selectedInstanceId: instanceId }),

  placeSelectedCardOn: (cell) => {
    const { game, selectedInstanceId } = get();
    if (!selectedInstanceId) return;
    try {
      const next = enginePlaceCard(game, selectedInstanceId, cell);
      set({ game: next, selectedInstanceId: null, lastError: null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ lastError: msg });
    }
  },

  playActionCard: (instanceId) => {
    const { game } = get();
    try {
      const next = enginePlayActionCard(game, instanceId);
      set({ game: next, selectedInstanceId: null, lastError: null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ lastError: msg });
    }
  },

  loadGame: (game) => set({ game, selectedInstanceId: null, lastError: null }),
}));
