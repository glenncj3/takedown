import { useEffect, useRef, useState } from 'react';
import type { Player } from '../types';
import { createInitialState } from '../engine/setup';
import { DECKS_BY_ID } from '../data/decks';
import type { GameChannel } from '../net/channel';
import { openChannel } from '../net/channel';
import type { GameEvent } from '../net/events';
import { createRoom, type RoomRow } from '../net/room';
import { useGameStore } from '../store/useGameStore';
import { useUIStore } from '../store/useUIStore';

const HOST_PLAYER: Player = 'bottom';
const JOINER_PLAYER: Player = 'top';
const DECK_ASSIGNMENT = { bottom: 'A' as const, top: 'B' as const };

export function HostLobby() {
  const displayName = useUIStore((s) => s.displayName);
  const setDisplayName = useUIStore((s) => s.setDisplayName);
  const setScreen = useUIStore((s) => s.setScreen);
  const setToast = useUIStore((s) => s.setToast);
  const enterMultiplayer = useGameStore((s) => s.enterMultiplayer);

  const [name, setName] = useState(displayName);
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [creating, setCreating] = useState(false);
  const channelRef = useRef<GameChannel | null>(null);

  useEffect(() => {
    return () => {
      // If we navigate away mid-lobby, drop the channel.
      const ch = channelRef.current;
      channelRef.current = null;
      if (ch) void ch.unsubscribe();
    };
  }, []);

  async function host() {
    if (!name.trim()) {
      setToast('Enter a display name first');
      return;
    }
    setDisplayName(name.trim());
    setCreating(true);
    try {
      const created = await createRoom(name.trim());
      setRoom(created);
      const channel = await openChannel(created.code);
      channelRef.current = channel;

      channel.onEvent((event: GameEvent) => {
        if (event.type !== 'ready') return;
        const seed = freshSeed();
        const game = createInitialState({
          seed,
          decksById: DECKS_BY_ID,
          deckAssignment: DECK_ASSIGNMENT,
          firstTurn: HOST_PLAYER,
        });
        void channel.send({
          type: 'init',
          seed,
          deckAssignment: DECK_ASSIGNMENT,
          hostName: name.trim(),
          joinerName: event.joinerName,
          hostPlayer: HOST_PLAYER,
        });
        enterMultiplayer({
          channel,
          localPlayer: HOST_PLAYER,
          localName: name.trim(),
          remoteName: event.joinerName,
          game,
        });
        // Channel ownership transfers to the store; clear the local ref so
        // the cleanup effect doesn't unsubscribe what's now in active use.
        channelRef.current = null;
        setScreen('game');
      });
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
      setCreating(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-900 px-6 text-slate-100">
      <h1 className="font-display text-5xl tracking-wider text-amber-300">
        Host a Friend Game
      </h1>
      {!room ? (
        <div className="flex flex-col items-stretch gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Display name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100"
            />
          </label>
          <button
            type="button"
            onClick={host}
            disabled={creating}
            className="rounded bg-amber-500 px-4 py-2 font-medium text-slate-900 transition-colors hover:bg-amber-400 disabled:opacity-50"
          >
            {creating ? 'Creating room…' : 'Create room'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-slate-400">Share this code with your friend</p>
          <code
            data-testid="room-code"
            className="font-display text-6xl tracking-widest text-amber-300"
          >
            {room.code}
          </code>
          <p className="text-xs text-slate-500">Waiting for them to join…</p>
          <button
            type="button"
            onClick={async () => {
              const ch = channelRef.current;
              if (ch) await ch.unsubscribe();
              setScreen('menu');
            }}
            className="text-xs text-slate-400 underline hover:text-slate-200"
          >
            Cancel
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setScreen('menu')}
        className="absolute left-4 top-4 rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
      >
        ← Menu
      </button>
    </main>
  );
}

function freshSeed(): number {
  const v = (Date.now() & 0x7fffffff) >>> 0;
  return v || 1;
}

// JOINER_PLAYER is exported for other modules / tests if they need to know
// which side a joining client occupies. The host always plays as 'bottom'.
export { HOST_PLAYER, JOINER_PLAYER };
