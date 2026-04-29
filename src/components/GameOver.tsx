import { useGameStore } from '../store/useGameStore';
import { scoreBoard } from '../engine/score';

export function GameOver() {
  const game = useGameStore((s) => s.game);
  const resetGame = useGameStore((s) => s.resetGame);

  if (game.phase !== 'ended') return null;

  const score = scoreBoard(game);
  const headline =
    game.winner === 'draw'
      ? 'Draw'
      : game.winner === 'bottom'
        ? 'Bottom wins'
        : 'Top wins';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Game over"
      className="fixed inset-0 z-10 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-4 rounded-lg bg-slate-800 p-8 shadow-xl ring-1 ring-slate-700">
        <h2 className="font-display text-5xl tracking-wider text-amber-300">
          {headline}
        </h2>
        <p className="text-sm text-slate-300">
          Bottom {score.bottom} — Top {score.top}
        </p>
        <button
          type="button"
          onClick={() => resetGame()}
          className="rounded bg-amber-500 px-4 py-2 font-medium text-slate-900 transition-colors hover:bg-amber-400"
        >
          Play again
        </button>
      </div>
    </div>
  );
}
