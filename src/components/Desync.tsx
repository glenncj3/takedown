import { useGameStore } from '../store/useGameStore';
import { useUIStore } from '../store/useUIStore';

export function Desync() {
  const setScreen = useUIStore((s) => s.setScreen);
  const exitMultiplayer = useGameStore((s) => s.exitMultiplayer);

  async function backToMenu() {
    await exitMultiplayer();
    setScreen('menu');
  }

  return (
    <main
      role="dialog"
      aria-label="Desync detected"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-900 px-6 text-slate-100"
    >
      <h1 className="font-display text-5xl tracking-wider text-rose-400">
        Desync
      </h1>
      <p className="max-w-md text-center text-sm text-slate-300">
        The two clients fell out of sync — the same move produced different
        states on each side. This is unrecoverable in v1; the game cannot
        continue.
      </p>
      <button
        type="button"
        onClick={backToMenu}
        className="rounded bg-amber-500 px-4 py-2 font-medium text-slate-900 transition-colors hover:bg-amber-400"
      >
        Back to menu
      </button>
    </main>
  );
}
