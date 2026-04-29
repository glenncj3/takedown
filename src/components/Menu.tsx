import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { useUIStore } from '../store/useUIStore';

export function Menu() {
  const setScreen = useUIStore((s) => s.setScreen);
  const displayName = useUIStore((s) => s.displayName);
  const setDisplayName = useUIStore((s) => s.setDisplayName);
  const setMode = useGameStore((s) => s.setMode);
  const startGame = useGameStore((s) => s.startGame);

  const [name, setName] = useState(displayName);

  function startSinglePlayer(mode: 'ai' | 'hot-seat') {
    if (name.trim()) setDisplayName(name.trim());
    setMode(mode);
    startGame();
    setScreen('game');
  }

  function goLobby(target: 'host-lobby' | 'join-lobby') {
    if (name.trim()) setDisplayName(name.trim());
    setScreen(target);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-900 px-6 text-slate-100">
      <h1 className="font-display text-7xl tracking-wider text-amber-300">
        Takedown
      </h1>
      <p className="max-w-md text-center text-sm text-slate-400">
        A 1v1 grid-based card game.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        Display name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="Your name"
          className="min-w-[14rem] rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100"
        />
      </label>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => startSinglePlayer('ai')}
          className="min-w-[14rem] rounded bg-amber-500 px-6 py-3 text-lg font-medium text-slate-900 transition-colors hover:bg-amber-400"
        >
          Play vs AI
        </button>
        <button
          type="button"
          onClick={() => goLobby('host-lobby')}
          className="min-w-[14rem] rounded border border-slate-600 px-6 py-3 text-lg font-medium text-slate-200 transition-colors hover:bg-slate-800"
        >
          Host friend game
        </button>
        <button
          type="button"
          onClick={() => goLobby('join-lobby')}
          className="min-w-[14rem] rounded border border-slate-600 px-6 py-3 text-lg font-medium text-slate-200 transition-colors hover:bg-slate-800"
        >
          Join friend game
        </button>
        <button
          type="button"
          onClick={() => startSinglePlayer('hot-seat')}
          className="min-w-[14rem] rounded border border-slate-700 px-6 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800"
        >
          Hot-seat
        </button>
      </div>
    </main>
  );
}
