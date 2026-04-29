import type { Card, CardInstance, GameState, Player } from '../types';
import { drawCards } from './draw';
import { createRng } from './rng';

export interface SetupOptions {
  seed: number;
  // Maps a deck id (e.g. 'A' / 'B') to its card definition list (length 20).
  decksById: Record<string, Card[]>;
  // Which deck each player gets. The host decides this and broadcasts it
  // along with the seed in the multiplayer init handshake.
  deckAssignment: Record<Player, string>;
  // Whose placement turn comes first. DESIGN doesn't pin this down, so it's
  // a parameter — UI / multiplayer flow decides.
  firstTurn?: Player;
  // How many cards each player draws to start. DESIGN §9 says 5.
  initialHandSize?: number;
}

export const INITIAL_HAND_SIZE = 5;

// Builds a fresh GameState ready for turn 1: shuffled decks (deterministic
// from the seed), initial hands drawn, board empty, phase 'placing'.
//
// Same seed + same options → identical state, byte for byte. This is the
// load-bearing property that lets multiplayer clients run independent
// simulations and stay in sync.
export function createInitialState(opts: SetupOptions): GameState {
  const rng = createRng(opts.seed);
  const handSize = opts.initialHandSize ?? INITIAL_HAND_SIZE;
  const firstTurn = opts.firstTurn ?? 'bottom';

  const buildDeck = (player: Player): CardInstance[] => {
    const deckId = opts.deckAssignment[player];
    const cards = opts.decksById[deckId];
    if (!cards) throw new Error(`Unknown deck id: ${deckId}`);
    const instances: CardInstance[] = cards.map((card, i) => ({
      card,
      instanceId: `${player}:${deckId}:${i}`,
    }));
    return rng.shuffle(instances);
  };

  // Order matters for determinism: shuffle bottom's deck first, then top's.
  const bottomDeck = buildDeck('bottom');
  const topDeck = buildDeck('top');

  let state: GameState = {
    board: Array.from({ length: 9 }, () => null),
    hands: { bottom: [], top: [] },
    decks: { bottom: bottomDeck, top: topDeck },
    discards: { bottom: [], top: [] },
    turn: firstTurn,
    placementCount: 0,
    phase: 'placing',
    winner: null,
    rngSeed: opts.seed,
    rngState: rng.state(),
    moveSeq: 0,
  };

  state = drawCards(state, 'bottom', handSize);
  state = drawCards(state, 'top', handSize);

  return state;
}
