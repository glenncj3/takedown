import { useGameStore } from '../store/useGameStore';
import { Board } from './Board';
import { GameOver } from './GameOver';
import { Hand } from './Hand';
import { Scoreboard } from './Scoreboard';

export function Game() {
  const lastError = useGameStore((s) => s.lastError);

  return (
    <main className="relative flex min-h-screen flex-col items-center gap-3 bg-slate-900 px-4 py-6 text-slate-100">
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
