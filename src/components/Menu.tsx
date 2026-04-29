import { useGameStore } from '../store/useGameStore';
import { useUIStore } from '../store/useUIStore';

// Minimal menu for Phase 4. Phase 6 will replace this with a polished
// version that also offers Host friend / Join friend.
export function Menu() {
  const setScreen = useUIStore((s) => s.setScreen);
  const setMode = useGameStore((s) => s.setMode);
  const startGame = useGameStore((s) => s.startGame);

  function start(mode: 'ai' | 'hot-seat') {
    setMode(mode);
    startGame();
    setScreen('game');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-900 text-slate-100">
      <h1 className="font-display text-7xl tracking-wider text-amber-300">
        Takedown
      </h1>
      <p className="max-w-md text-center text-sm text-slate-400">
        A 1v1 grid-based card game in the Triple Triad lineage.
      </p>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => start('ai')}
          className="min-w-[14rem] rounded bg-amber-500 px-6 py-3 text-lg font-medium text-slate-900 transition-colors hover:bg-amber-400"
        >
          Play vs AI
        </button>
        <button
          type="button"
          onClick={() => start('hot-seat')}
          className="min-w-[14rem] rounded border border-slate-600 px-6 py-3 text-lg font-medium text-slate-200 transition-colors hover:bg-slate-800"
        >
          Hot-seat
        </button>
      </div>
    </main>
  );
}
