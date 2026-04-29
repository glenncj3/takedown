// Multiplayer wiring tests. The Supabase channel is replaced with a stub
// that captures sent events and exposes a fire() helper to inject events
// as if they came from the peer.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../engine/setup';
import { DECKS_BY_ID } from '../data/decks';
import type { GameChannel } from '../net/channel';
import type { GameEvent } from '../net/events';
import { useGameStore } from './useGameStore';
import { useUIStore } from './useUIStore';

interface MockChannel extends GameChannel {
  sent: GameEvent[];
  fire: (event: GameEvent) => void;
}

function makeChannel(): MockChannel {
  let handler: ((event: GameEvent) => void) | null = null;
  const sent: GameEvent[] = [];
  const channel: MockChannel = {
    sent,
    send: vi.fn(async (event: GameEvent) => {
      sent.push(event);
    }),
    onEvent: (h) => {
      handler = h;
      return () => {
        handler = null;
      };
    },
    unsubscribe: vi.fn(async () => {
      handler = null;
    }),
    fire: (event) => handler?.(event),
  };
  return channel;
}

afterEach(() => {
  useGameStore.setState({
    mode: 'hot-seat',
    localPlayer: null,
    channel: null,
    selectedInstanceId: null,
    lastError: null,
    localHashes: {},
    peerHashes: {},
  });
  useUIStore.setState({ screen: 'menu' });
});

describe('multiplayer wiring', () => {
  it('enterMultiplayer sets state and records initial hash', () => {
    const channel = makeChannel();
    const game = createInitialState({
      seed: 1,
      decksById: DECKS_BY_ID,
      deckAssignment: { bottom: 'A', top: 'B' },
    });
    useGameStore.getState().enterMultiplayer({
      channel,
      localPlayer: 'bottom',
      localName: 'Host',
      remoteName: 'Joiner',
      game,
    });
    const s = useGameStore.getState();
    expect(s.mode).toBe('multiplayer');
    expect(s.localPlayer).toBe('bottom');
    expect(s.localName).toBe('Host');
    expect(s.remoteName).toBe('Joiner');
    expect(Object.keys(s.localHashes)).toEqual([String(game.moveSeq)]);
  });

  it('local placement broadcasts move and hash', async () => {
    const channel = makeChannel();
    const game = createInitialState({
      seed: 12345,
      decksById: DECKS_BY_ID,
      deckAssignment: { bottom: 'A', top: 'B' },
    });
    useGameStore.getState().enterMultiplayer({
      channel,
      localPlayer: 'bottom',
      localName: 'A',
      remoteName: 'B',
      game,
    });
    const handCard = useGameStore.getState().game.hands.bottom[0];
    useGameStore.getState().selectCard(handCard.instanceId);
    useGameStore.getState().placeSelectedCardOn(0);

    expect(channel.sent.length).toBe(2);
    expect(channel.sent[0].type).toBe('move');
    expect(channel.sent[1].type).toBe('hash');
    if (channel.sent[0].type === 'move') {
      expect(channel.sent[0].payload).toEqual({
        kind: 'place',
        cardInstanceId: handCard.instanceId,
        cell: 0,
      });
    }
  });

  it('handleRemoteEvent applies a move and broadcasts a confirming hash', () => {
    const channel = makeChannel();
    const game = createInitialState({
      seed: 99,
      decksById: DECKS_BY_ID,
      deckAssignment: { bottom: 'A', top: 'B' },
    });
    useGameStore.getState().enterMultiplayer({
      channel,
      localPlayer: 'top', // joiner — receives bottom's move
      localName: 'B',
      remoteName: 'A',
      game,
    });
    const remoteCard = useGameStore.getState().game.hands.bottom[0];

    useGameStore.getState().handleRemoteEvent({
      type: 'move',
      seq: 1,
      payload: { kind: 'place', cardInstanceId: remoteCard.instanceId, cell: 0 },
    });

    const after = useGameStore.getState();
    expect(after.game.board[0]?.instanceId).toBe(remoteCard.instanceId);
    expect(after.game.turn).toBe('top'); // turn now belongs to local
    // We broadcast a hash for our side.
    const hashEvent = channel.sent.find((e) => e.type === 'hash');
    expect(hashEvent).toBeDefined();
  });

  it('hash mismatch transitions to desync screen', () => {
    const channel = makeChannel();
    const game = createInitialState({
      seed: 42,
      decksById: DECKS_BY_ID,
      deckAssignment: { bottom: 'A', top: 'B' },
    });
    useGameStore.getState().enterMultiplayer({
      channel,
      localPlayer: 'bottom',
      localName: 'A',
      remoteName: 'B',
      game,
    });
    const handCard = useGameStore.getState().game.hands.bottom[0];
    useGameStore.getState().selectCard(handCard.instanceId);
    useGameStore.getState().placeSelectedCardOn(4);

    // Peer sends a hash that doesn't match local's hash for the same seq.
    const localHash = useGameStore.getState().localHashes[useGameStore.getState().game.moveSeq];
    expect(localHash).toBeDefined();
    useGameStore.getState().handleRemoteEvent({
      type: 'hash',
      seq: useGameStore.getState().game.moveSeq,
      hash: 'deadbeef', // intentionally bogus
    });

    expect(useGameStore.getState().peerHashes[useGameStore.getState().game.moveSeq]).toBe(
      'deadbeef',
    );
    expect(useUIStore.getState().screen).toBe('desync');
  });

  it('matching peer hash does NOT trigger desync', () => {
    const channel = makeChannel();
    const game = createInitialState({
      seed: 11,
      decksById: DECKS_BY_ID,
      deckAssignment: { bottom: 'A', top: 'B' },
    });
    useGameStore.getState().enterMultiplayer({
      channel,
      localPlayer: 'bottom',
      localName: 'A',
      remoteName: 'B',
      game,
    });
    const handCard = useGameStore.getState().game.hands.bottom[0];
    useGameStore.getState().selectCard(handCard.instanceId);
    useGameStore.getState().placeSelectedCardOn(4);

    const seq = useGameStore.getState().game.moveSeq;
    const localHash = useGameStore.getState().localHashes[seq];
    useGameStore.getState().handleRemoteEvent({
      type: 'hash',
      seq,
      hash: localHash,
    });
    expect(useUIStore.getState().screen).not.toBe('desync');
  });

  it('exitMultiplayer unsubscribes channel and resets multiplayer state', async () => {
    const channel = makeChannel();
    useGameStore.getState().enterMultiplayer({
      channel,
      localPlayer: 'bottom',
      localName: 'A',
      remoteName: 'B',
      game: createInitialState({
        seed: 1,
        decksById: DECKS_BY_ID,
        deckAssignment: { bottom: 'A', top: 'B' },
      }),
    });
    await useGameStore.getState().exitMultiplayer();
    expect(channel.unsubscribe).toHaveBeenCalled();
    expect(useGameStore.getState().mode).toBe('hot-seat');
    expect(useGameStore.getState().channel).toBeNull();
    expect(useGameStore.getState().localPlayer).toBeNull();
  });

  it('placeSelectedCardOn while not local turn is ignored', () => {
    const channel = makeChannel();
    const game = createInitialState({
      seed: 1,
      decksById: DECKS_BY_ID,
      deckAssignment: { bottom: 'A', top: 'B' },
      firstTurn: 'top', // remote's turn
    });
    useGameStore.getState().enterMultiplayer({
      channel,
      localPlayer: 'bottom',
      localName: 'A',
      remoteName: 'B',
      game,
    });
    // Try to act anyway by selecting a card and placing it.
    const handCard = useGameStore.getState().game.hands.bottom[0];
    useGameStore.getState().selectCard(handCard.instanceId);
    useGameStore.getState().placeSelectedCardOn(0);
    // No move should have been broadcast.
    expect(channel.sent.length).toBe(0);
    // Board still empty.
    expect(useGameStore.getState().game.board[0]).toBeNull();
  });
});
