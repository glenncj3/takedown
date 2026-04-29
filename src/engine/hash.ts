// State canonicalization + FNV-1a hash. Used by multiplayer clients to
// compare post-move states without exchanging the full state object —
// per DESIGN §12, mismatched hashes for the same `seq` indicate desync.
//
// Canonicalization: sort object keys recursively before serializing, so
// `{a:1, b:2}` and `{b:2, a:1}` produce the same byte string. JSON.stringify
// alone preserves insertion order, which would let two clients with the
// same logical state hash differently.

import type { GameState } from '../types';

export function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map((v) => canonicalize(v)).join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    '{' +
    keys.map((k) => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') +
    '}'
  );
}

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export function fnv1a(s: string): string {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function hashState(state: GameState): string {
  return fnv1a(canonicalize(state));
}
