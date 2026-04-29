// Param-parsing helpers. Card data lives in JSON / TS literals where param
// shapes are by convention rather than enforced types — these helpers turn
// `unknown` values from `Record<string, unknown>` into typed values, or
// return null so handlers can no-op gracefully on malformed params.

import type { CellIndex, Player, Stat } from '../types';

const STATS: ReadonlySet<Stat> = new Set(['top', 'bottom', 'left', 'right']);
const PLAYERS: ReadonlySet<Player> = new Set(['bottom', 'top']);

export function parseStat(v: unknown): Stat | null {
  return typeof v === 'string' && STATS.has(v as Stat) ? (v as Stat) : null;
}

export function parseNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function parseInt32(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isInteger(v)) return null;
  return v;
}

export function parsePlayer(v: unknown): Player | null {
  return typeof v === 'string' && PLAYERS.has(v as Player) ? (v as Player) : null;
}

export function parseCellIndex(v: unknown): CellIndex | null {
  if (typeof v !== 'number' || !Number.isInteger(v)) return null;
  if (v < 0 || v > 8) return null;
  return v as CellIndex;
}

export type Targeting = 'adjacent' | 'all-allied' | 'all-opponent';
const TARGETINGS: ReadonlySet<Targeting> = new Set([
  'adjacent',
  'all-allied',
  'all-opponent',
]);

export function parseTargeting(v: unknown): Targeting | null {
  return typeof v === 'string' && TARGETINGS.has(v as Targeting)
    ? (v as Targeting)
    : null;
}
