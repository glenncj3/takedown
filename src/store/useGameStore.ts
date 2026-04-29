import { create } from 'zustand';
import type { CellIndex, GameState, Player } from '../types';
import { aiTakeTurn } from '../ai/play';
import { hashState } from '../engine/hash';
import { placeCard as enginePlaceCard } from '../engine/place';
import { playActionCard as enginePlayActionCard } from '../engine/playAction';
import { createInitialState } from '../engine/setup';
import { DECKS_BY_ID } from '../data/decks';
import type { GameChannel } from '../net/channel';
import type { GameEvent, MovePayload } from '../net/events';
import { useUIStore } from './useUIStore';

export type Mode = 'hot-seat' | 'ai' | 'multiplayer';

interface MultiplayerSetup {
  channel: GameChannel;
  localPlayer: Player;
  localName: string;
  remoteName: string;
  game: GameState;
}

interface GameStore {
  game: GameState;
  selectedInstanceId: string | null;
  mode: Mode;
  // Multiplayer state. null when not in multiplayer mode.
  localPlayer: Player | null;
  channel: GameChannel | null;
  localName: string | null;
  remoteName: string | null;
  // Hashes computed locally, keyed by moveSeq. Compared against incoming
  // peer hashes to detect desync. Only retained for ~50 seqs to bound
  // memory; multiplayer games top out around 9 placements anyway.
  localHashes: Record<number, string>;
  peerHashes: Record<number, string>;
  lastError: string | null;

  setMode: (mode: Mode) => void;
  startGame: (seed?: number) => void;
  resetGame: (seed?: number) => void;
  selectCard: (instanceId: string | null) => void;
  placeSelectedCardOn: (cell: CellIndex) => void;
  playActionCard: (instanceId: string) => void;
  aiTurn: () => void;
  loadGame: (state: GameState) => void;
  // Multiplayer wiring.
  enterMultiplayer: (setup: MultiplayerSetup) => void;
  exitMultiplayer: () => Promise<void>;
  handleRemoteEvent: (event: GameEvent) => void;
}

function freshSeed(): number {
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
  localPlayer: null,
  channel: null,
  localName: null,
  remoteName: null,
  localHashes: {},
  peerHashes: {},
  lastError: null,

  setMode: (mode) => set({ mode }),

  startGame: (seed) =>
    set({
      game: newGameState(seed ?? freshSeed()),
      selectedInstanceId: null,
      lastError: null,
      localHashes: {},
      peerHashes: {},
    }),

  resetGame: (seed) =>
    set({
      game: newGameState(seed ?? freshSeed()),
      selectedInstanceId: null,
      lastError: null,
      localHashes: {},
      peerHashes: {},
    }),

  selectCard: (instanceId) => set({ selectedInstanceId: instanceId }),

  placeSelectedCardOn: (cell) => {
    const { game, selectedInstanceId, mode, localPlayer, channel } = get();
    if (!selectedInstanceId) return;
    // In multiplayer, only the local player can act on their own turn. The
    // engine will also reject off-turn placements; this guards the wire.
    if (mode === 'multiplayer' && game.turn !== localPlayer) return;
    try {
      const next = enginePlaceCard(game, selectedInstanceId, cell);
      const payload: MovePayload = {
        kind: 'place',
        cardInstanceId: selectedInstanceId,
        cell,
      };
      applyAndBroadcast(set, get, next, payload, mode === 'multiplayer' ? channel : null);
    } catch (e) {
      set({ lastError: errorMessage(e) });
    }
  },

  playActionCard: (instanceId) => {
    const { game, mode, localPlayer, channel } = get();
    if (mode === 'multiplayer' && game.turn !== localPlayer) return;
    try {
      const next = enginePlayActionCard(game, instanceId);
      const payload: MovePayload = { kind: 'action', cardInstanceId: instanceId };
      applyAndBroadcast(set, get, next, payload, mode === 'multiplayer' ? channel : null);
    } catch (e) {
      set({ lastError: errorMessage(e) });
    }
  },

  aiTurn: () => {
    const { game } = get();
    if (game.phase !== 'placing') return;
    const next = aiTakeTurn(game);
    if (next === game) return;
    set({ game: next, selectedInstanceId: null, lastError: null });
  },

  loadGame: (game) => set({ game, selectedInstanceId: null, lastError: null }),

  enterMultiplayer: (setup) => {
    const initialHash = hashState(setup.game);
    set({
      game: setup.game,
      mode: 'multiplayer',
      localPlayer: setup.localPlayer,
      channel: setup.channel,
      localName: setup.localName,
      remoteName: setup.remoteName,
      selectedInstanceId: null,
      lastError: null,
      localHashes: { 0: initialHash },
      peerHashes: {},
    });
  },

  exitMultiplayer: async () => {
    const { channel } = get();
    if (channel) {
      try {
        await channel.unsubscribe();
      } catch {
        // ignore
      }
    }
    set({
      mode: 'hot-seat',
      localPlayer: null,
      channel: null,
      localName: null,
      remoteName: null,
      localHashes: {},
      peerHashes: {},
    });
  },

  handleRemoteEvent: (event) => {
    if (event.type === 'move') {
      const { game } = get();
      try {
        const next =
          event.payload.kind === 'place'
            ? enginePlaceCard(game, event.payload.cardInstanceId, event.payload.cell)
            : enginePlayActionCard(game, event.payload.cardInstanceId);
        const localHash = hashState(next);
        const localHashes = { ...get().localHashes, [next.moveSeq]: localHash };
        set({ game: next, localHashes });
        const peerHash = get().peerHashes[next.moveSeq];
        if (peerHash && peerHash !== localHash) {
          enterDesync();
          return;
        }
        // Broadcast our own hash for this seq so peer can verify.
        const channel = get().channel;
        if (channel) {
          void channel.send({ type: 'hash', seq: next.moveSeq, hash: localHash });
        }
      } catch (e) {
        set({ lastError: errorMessage(e) });
      }
    } else if (event.type === 'hash') {
      const peerHashes = { ...get().peerHashes, [event.seq]: event.hash };
      set({ peerHashes });
      const local = get().localHashes[event.seq];
      if (local && local !== event.hash) {
        enterDesync();
      }
    }
    // 'init' and 'ready' events are handled in lobby components; ignore here.
  },
}));

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function enterDesync(): void {
  useUIStore.getState().setScreen('desync');
}

// Apply a move locally, record hashes, and (in multiplayer) broadcast move
// and hash to the peer. Shared between placeSelectedCardOn and playActionCard.
function applyAndBroadcast(
  set: (partial: Partial<GameStore>) => void,
  get: () => GameStore,
  next: GameState,
  payload: MovePayload,
  channel: GameChannel | null,
): void {
  const localHash = hashState(next);
  const localHashes = { ...get().localHashes, [next.moveSeq]: localHash };
  set({
    game: next,
    selectedInstanceId: null,
    lastError: null,
    localHashes,
  });
  // If a peer hash for this seq arrived early, compare now.
  const peerHash = get().peerHashes[next.moveSeq];
  if (peerHash && peerHash !== localHash) {
    enterDesync();
    return;
  }
  if (channel) {
    void channel.send({ type: 'move', seq: next.moveSeq, payload });
    void channel.send({ type: 'hash', seq: next.moveSeq, hash: localHash });
  }
}
