// Wire format for multiplayer messages, broadcast over a per-room Supabase
// Realtime channel. Both clients must agree on these shapes byte for byte
// for desync detection to be meaningful — every field here participates
// in determinism.

import type { CellIndex } from '../types';

export type DeckId = 'A' | 'B';

export type DeckAssignment = { bottom: DeckId; top: DeckId };

export interface InitEvent {
  type: 'init';
  seed: number;
  deckAssignment: DeckAssignment;
  hostName: string;
  joinerName: string;
  // Which side of the board the HOST plays. The joiner takes the other
  // side. Defaults to 'bottom' so the host always sees their cards
  // upright in their own client.
  hostPlayer: 'bottom' | 'top';
}

export type MovePayload =
  | { kind: 'place'; cardInstanceId: string; cell: CellIndex }
  | { kind: 'action'; cardInstanceId: string };

export interface MoveEvent {
  type: 'move';
  seq: number;
  payload: MovePayload;
}

export interface HashEvent {
  type: 'hash';
  seq: number;
  hash: string;
}

// Sent by joiner once they've subscribed to the channel. The host
// listens for it and replies with `init`. This avoids races where the
// host broadcasts init before the joiner has finished subscribing.
export interface ReadyEvent {
  type: 'ready';
  joinerName: string;
}

export type GameEvent = InitEvent | MoveEvent | HashEvent | ReadyEvent;
