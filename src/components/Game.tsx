import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { useUIStore } from '../store/useUIStore';
import { Board } from './Board';
import { GameOver } from './GameOver';
import { Hand } from './Hand';
import { Scoreboard } from './Scoreboard';

const AI_TURN_DELAY_MS = 600;

export function Game() {
  const lastError = useGameStore((s) => s.lastError);
  const mode = useGameStore((s) => s.mode);
  const turn = useGameStore((s) => s.game.turn);
  const phase = useGameStore((s) => s.game.phase);
  const aiTurn = useGameStore((s) => s.aiTurn);
  const channel = useGameStore((s) => s.channel);
  const handleRemoteEvent = useGameStore((s) => s.handleRemoteEvent);
  const exitMultiplayer = useGameStore((s) => s.exitMultiplayer);
  const setScreen = useUIStore((s) => s.setScreen);

  useEffect(() => {
    if (mode !== 'ai' || turn !== 'top' || phase !== 'placing') return;
    const t = setTimeout(() => aiTurn(), AI_TURN_DELAY_MS);
    return () => clearTimeout(t);
  }, [mode, turn, phase, aiTurn]);

  useEffect(() => {
    if (mode !== 'multiplayer' || !channel) return;
    return channel.onEvent(handleRemoteEvent);
  }, [mode, channel, handleRemoteEvent]);

  async function backToMenu() {
    if (mode === 'multiplayer') await exitMultiplayer();
    setScreen('menu');
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center gap-3 bg-slate-900 px-4 py-6 text-slate-100">
      <button
        type="button"
        onClick={backToMenu}
        className="absolute left-4 top-4 rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-800"
      >
        ← Menu
      </button>
      <Hand player="top" />
      <Scoreboard />
      <Board />
      <Hand player="bottom" />
      {lastError && (
        <p
          role="alert"
          className="fixed bottom-2 left-1/2 -translate-x-1/2 rounded bg-rose-900/90 px-3 py-1 text-xs text-rose-100 shadow"
        >
          {lastError}
        </p>
      )}
      <GameOver />
    </main>
  );
}
