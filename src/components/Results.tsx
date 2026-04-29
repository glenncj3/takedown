import { scoreBoard } from '../engine/score';
import type { Mode } from '../store/useGameStore';
import { useGameStore } from '../store/useGameStore';
import { useUIStore } from '../store/useUIStore';
import type { GameState, Player } from '../types';
import { Board } from './Board';

export function Results() {
  const game = useGameStore((s) => s.game);
  const mode = useGameStore((s) => s.mode);
  const localPlayer = useGameStore((s) => s.localPlayer);
  const remoteName = useGameStore((s) => s.remoteName);
  const localName = useGameStore((s) => s.localName);
  const resetGame = useGameStore((s) => s.resetGame);
  const exitMultiplayer = useGameStore((s) => s.exitMultiplayer);
  const setScreen = useUIStore((s) => s.setScreen);

  const score = scoreBoard(game);
  const headline = winnerHeadline(game.winner, mode, localPlayer, localName, remoteName);

  async function backToMenu() {
    if (mode === 'multiplayer') await exitMultiplayer();
    setScreen('menu');
  }

  function rematch() {
    // Multiplayer rematch deferred (DESIGN §17). Phase 6 only rematches
    // single-player modes from this screen.
    resetGame();
    setScreen('game');
  }

  const canRematch = mode === 'ai' || mode === 'hot-seat';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-900 px-6 py-8 text-slate-100">
      <h1 className="font-display text-6xl tracking-wider text-amber-300">
        {headline}
      </h1>
      <p className="text-sm text-slate-300">
        Final score — Bottom {score.bottom}, Top {score.top}
      </p>
      <div className="pointer-events-none scale-90 opacity-90">
        <Board />
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={backToMenu}
          className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800"
        >
          Back to menu
        </button>
        {canRematch && (
          <button
            type="button"
            onClick={rematch}
            className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-amber-400"
          >
            Rematch
          </button>
        )}
      </div>
    </main>
  );
}

function winnerHeadline(
  winner: GameState['winner'],
  mode: Mode,
  localPlayer: Player | null,
  localName: string | null,
  remoteName: string | null,
): string {
  if (winner === 'draw' || winner === null) return 'Draw';
  if (mode === 'multiplayer' && localPlayer) {
    if (winner === localPlayer) return `${localName ?? 'You'} win`;
    return `${remoteName ?? 'Opponent'} wins`;
  }
  if (mode === 'ai') {
    return winner === 'bottom' ? 'You win' : 'AI wins';
  }
  return winner === 'bottom' ? 'Bottom wins' : 'Top wins';
}
