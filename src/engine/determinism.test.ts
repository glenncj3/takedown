// The single load-bearing test of the multiplayer phase: given an init
// payload + a sequence of moves, two independent simulator runs must
// produce identical states AND identical hashes at every step. If this
// is ever red, multiplayer is broken — there is no recovery in DESIGN's
// trust-the-client model, just desync detection.

import { describe, it, expect } from 'vitest';
import type { CellIndex, GameState } from '../types';
import { DECKS_BY_ID } from '../data/decks';
import { hashState } from './hash';
import { placeCard } from './place';
import { playActionCard } from './playAction';
import { createInitialState } from './setup';

type MovePayload =
  | { kind: 'place'; cardInstanceId: string; cell: CellIndex }
  | { kind: 'action'; cardInstanceId: string };

function applyMove(state: GameState, move: MovePayload): GameState {
  if (move.kind === 'place') {
    return placeCard(state, move.cardInstanceId, move.cell);
  }
  return playActionCard(state, move.cardInstanceId);
}

function simulate(seed: number, deckAssignment: { bottom: 'A' | 'B'; top: 'A' | 'B' }) {
  const state = createInitialState({
    seed,
    decksById: DECKS_BY_ID,
    deckAssignment,
  });

  const states: GameState[] = [state];
  const hashes: string[] = [hashState(state)];
  const moves: MovePayload[] = [];

  let current = state;
  // Drive the game by always placing the first unit card in the active
  // hand into the lowest-index empty cell. Deterministic given the seed.
  while (current.phase === 'placing') {
    const player = current.turn;
    const card = current.hands[player].find((c) => c.card.type === 'unit');
    if (!card) break;
    const cell = current.board.findIndex((c) => c === null);
    if (cell === -1) break;
    const move: MovePayload = {
      kind: 'place',
      cardInstanceId: card.instanceId,
      cell: cell as CellIndex,
    };
    moves.push(move);
    current = applyMove(current, move);
    states.push(current);
    hashes.push(hashState(current));
  }

  return { states, hashes, moves };
}

describe('multiplayer determinism', () => {
  it('two independent simulations from the same seed produce identical states and hashes at every step', () => {
    const seed = 31337;
    const deckAssignment = { bottom: 'A', top: 'B' } as const;
    const a = simulate(seed, deckAssignment);
    const b = simulate(seed, deckAssignment);

    expect(a.hashes).toEqual(b.hashes);
    expect(a.states).toEqual(b.states);
    expect(a.moves).toEqual(b.moves);
  });

  it('replaying a captured move sequence reproduces the same hash trail', () => {
    // This is what a "joining" client would do: receive the init payload,
    // then receive each move in order, and confirm that its locally-computed
    // hash matches the broadcast hash for each seq.
    const seed = 99887766;
    const deckAssignment = { bottom: 'A', top: 'B' } as const;
    const reference = simulate(seed, deckAssignment);

    let state = createInitialState({
      seed,
      decksById: DECKS_BY_ID,
      deckAssignment,
    });
    const replayHashes: string[] = [hashState(state)];
    for (const move of reference.moves) {
      state = applyMove(state, move);
      replayHashes.push(hashState(state));
    }

    expect(replayHashes).toEqual(reference.hashes);
  });

  it('a one-byte difference in state produces a different hash', () => {
    const seed = 1;
    const deckAssignment = { bottom: 'A', top: 'B' } as const;
    const state = createInitialState({
      seed,
      decksById: DECKS_BY_ID,
      deckAssignment,
    });
    const original = hashState(state);
    const tampered = { ...state, moveSeq: state.moveSeq + 1 };
    expect(hashState(tampered)).not.toBe(original);
  });
});
