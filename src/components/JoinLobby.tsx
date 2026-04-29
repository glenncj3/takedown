import { useEffect, useRef, useState } from 'react';
import { createInitialState } from '../engine/setup';
import { DECKS_BY_ID } from '../data/decks';
import { openChannel, type GameChannel } from '../net/channel';
import type { GameEvent } from '../net/events';
import { joinRoom } from '../net/room';
import { isValidRoomCode } from '../net/roomCode';
import { useGameStore } from '../store/useGameStore';
import { useUIStore } from '../store/useUIStore';
import { JOINER_PLAYER } from './HostLobby';

export function JoinLobby() {
  const displayName = useUIStore((s) => s.displayName);
  const setDisplayName = useUIStore((s) => s.setDisplayName);
  const setScreen = useUIStore((s) => s.setScreen);
  const setToast = useUIStore((s) => s.setToast);
  const enterMultiplayer = useGameStore((s) => s.enterMultiplayer);

  const [name, setName] = useState(displayName);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const channelRef = useRef<GameChannel | null>(null);

  useEffect(() => {
    return () => {
      const ch = channelRef.current;
      channelRef.current = null;
      if (ch) void ch.unsubscribe();
    };
  }, []);

  async function join() {
    const trimmed = name.trim();
    const upperCode = code.toUpperCase();
    if (!trimmed) {
      setToast('Enter a display name first');
      return;
    }
    if (!isValidRoomCode(upperCode)) {
      setToast('Invalid room code');
      return;
    }
    setDisplayName(trimmed);
    setJoining(true);

    try {
      const channel = await openChannel(upperCode);
      channelRef.current = channel;

      const offEvent = channel.onEvent((event: GameEvent) => {
        if (event.type !== 'init') return;
        offEvent();
        const localPlayer =
          event.hostPlayer === 'bottom' ? JOINER_PLAYER : 'bottom';
        const game = createInitialState({
          seed: event.seed,
          decksById: DECKS_BY_ID,
          deckAssignment: event.deckAssignment,
          firstTurn: event.hostPlayer,
        });
        enterMultiplayer({
          channel,
          localPlayer,
          localName: trimmed,
          remoteName: event.hostName,
          game,
        });
        channelRef.current = null;
        setScreen('game');
      });

      await joinRoom(upperCode, trimmed);
      await channel.send({ type: 'ready', joinerName: trimmed });
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
      setJoining(false);
      const ch = channelRef.current;
      channelRef.current = null;
      if (ch) await ch.unsubscribe();
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-900 px-6 text-slate-100">
      <h1 className="font-display text-5xl tracking-wider text-amber-300">
        Join a Friend Game
      </h1>
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
        <label className="flex flex-col gap-1 text-sm">
          Room code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="ABC234"
            className="rounded border border-slate-600 bg-slate-800 px-3 py-2 font-display tracking-widest text-amber-300"
          />
        </label>
        <button
          type="button"
          onClick={join}
          disabled={joining}
          className="rounded bg-amber-500 px-4 py-2 font-medium text-slate-900 transition-colors hover:bg-amber-400 disabled:opacity-50"
        >
          {joining ? 'Joining…' : 'Join'}
        </button>
      </div>
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
