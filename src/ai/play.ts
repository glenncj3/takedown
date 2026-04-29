import { placeCard } from '../engine/place';
import { playActionCard } from '../engine/playAction';
import { rngNextInt } from '../engine/rngState';
import type { ActionCard, CardInstance, CellIndex, GameState, Player } from '../types';
import { scoreMove } from './heuristic';

const ACTION_PHASE_MAX_ITERS = 5;

// Picks and applies one full AI turn. Per DESIGN §13: simple, single-pass,
// no tree search. If the AI has no legal placement and no helpful action
// card, returns the state unchanged so the caller can detect the stall.
export function aiTakeTurn(state: GameState): GameState {
  if (state.phase !== 'placing') return state;
  const player = state.turn;

  let next = playActionPhase(state, player);
  if (next.phase !== 'placing') return next;

  const moves = enumerateLegalPlacements(next, player);
  if (moves.length === 0) return next;

  const scored = moves.map((m) => ({ ...m, score: scoreMove(next, m.cardInstanceId, m.cell) }));
  let maxScore = -Infinity;
  for (const s of scored) if (s.score > maxScore) maxScore = s.score;
  const best = scored.filter((s) => s.score === maxScore);

  let pickIdx = 0;
  if (best.length > 1) {
    const r = rngNextInt(next, best.length);
    next = r.state;
    pickIdx = r.value;
  }
  const pick = best[pickIdx];

  try {
    return placeCard(next, pick.cardInstanceId, pick.cell);
  } catch {
    // Defensive: enumerateLegalPlacements should have filtered illegals,
    // but if a handler throws (e.g. ability validation), bail without
    // crashing the turn driver.
    return next;
  }
}

// Plays qualifying action cards while hand size is below the threshold.
// "Qualifying" means the action has an on-play ability of 'draw-card' or
// 'play-from-deck'. Stops when no more qualifying cards exist or playing
// one fails to grow the hand.
function playActionPhase(state: GameState, player: Player): GameState {
  let next = state;
  for (let iter = 0; iter < ACTION_PHASE_MAX_ITERS; iter++) {
    if (next.hands[player].length >= 2) break;
    if (next.phase !== 'placing') break;
    const candidate = next.hands[player].find(isQualifyingAction);
    if (!candidate) break;
    const before = next.hands[player].length;
    try {
      next = playActionCard(next, candidate.instanceId);
    } catch {
      break;
    }
    if (next.hands[player].length <= before - 1) break;
  }
  return next;
}

function isQualifyingAction(ci: CardInstance): boolean {
  if (ci.card.type !== 'action') return false;
  const abilities = (ci.card as ActionCard).abilities;
  return abilities.some(
    (a) =>
      a.trigger === 'on-play' &&
      (a.abilityId === 'draw-card' || a.abilityId === 'play-from-deck'),
  );
}

interface Move {
  cardInstanceId: string;
  cell: CellIndex;
}

function enumerateLegalPlacements(state: GameState, player: Player): Move[] {
  const moves: Move[] = [];
  for (const ci of state.hands[player]) {
    if (ci.card.type !== 'unit') continue;
    for (let cell = 0; cell < 9; cell++) {
      if (state.board[cell] !== null) continue;
      moves.push({ cardInstanceId: ci.instanceId, cell: cell as CellIndex });
    }
  }
  return moves;
}
