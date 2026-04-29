import type { CellIndex, GameState, Player, Stat } from '../../types';
import { getNeighbors } from '../../engine/board';
import type { AbilityHandler } from '../types';
import { parseNumber, parseStat, parseTargeting, type Targeting } from '../params';

// Modifies one stat by `amount` on a set of target cards. Targeting:
//  - 'adjacent': cards orthogonally adjacent to the source (placed source
//     only — action cards default to no-op for adjacency).
//  - 'all-allied': every card on the board controlled by the source's
//     controller, INCLUDING the source itself.
//  - 'all-opponent': every card on the board controlled by the opposite
//     player.
//
// Params: { stat: Stat; amount: number; targeting: 'adjacent'|'all-allied'|'all-opponent' }
export const statBuffTarget: AbilityHandler = (ctx, params) => {
  const { state, controller } = ctx;
  const stat = parseStat(params?.stat);
  const amount = parseNumber(params?.amount);
  const targeting = parseTargeting(params?.targeting);
  if (stat === null || amount === null || targeting === null) return { state };

  const targets = collectTargets(state, ctx.source, controller, targeting);
  if (targets.length === 0) return { state };

  const board = state.board.slice();
  for (const cell of targets) {
    const card = board[cell];
    if (!card) continue;
    board[cell] = { ...card, stats: { ...card.stats, [stat]: card.stats[stat] + amount } };
  }
  return { state: { ...state, board } };
};

function collectTargets(
  state: GameState,
  source: import('../types').AbilitySource,
  controller: Player,
  targeting: Targeting,
): CellIndex[] {
  if (targeting === 'adjacent') {
    if (source.kind !== 'placed') return [];
    return getNeighbors(source.card.cellIndex)
      .map((n) => n.cell)
      .filter((c) => state.board[c] !== null);
  }
  const wanted: Player =
    targeting === 'all-allied'
      ? controller
      : controller === 'bottom'
        ? 'top'
        : 'bottom';
  const out: CellIndex[] = [];
  for (let c = 0 as CellIndex; c < 9; c = (c + 1) as CellIndex) {
    if (state.board[c]?.controller === wanted) out.push(c);
  }
  return out;
}

// Re-export Stat for consumers checking the param shape.
export type { Stat };
