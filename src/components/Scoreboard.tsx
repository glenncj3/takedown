import { GalleryHorizontalEnd } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import type { Mode } from '../store/useGameStore';
import { scoreBoard } from '../engine/score';
import type { Player } from '../types';

interface ScoreboardProps {
  onBack?: () => void;
}

export function Scoreboard({ onBack }: ScoreboardProps = {}) {
  const game = useGameStore((s) => s.game);
  const mode = useGameStore((s) => s.mode);
  const localPlayer = useGameStore((s) => s.localPlayer);
  const localName = useGameStore((s) => s.localName);
  const remoteName = useGameStore((s) => s.remoteName);
  const score = scoreBoard(game);

  return (
    <div
      role="status"
      aria-label="Scoreboard"
      className="flex items-center gap-6 rounded bg-slate-950/40 px-4 py-2 text-sm"
    >
      <ScoreCell
        side="top"
        label={playerLabel('top', mode, localPlayer, localName, remoteName)}
        value={score.top}
        handCount={game.hands.top.length}
        active={game.turn === 'top' && game.phase === 'placing'}
        accent="text-rose-300"
      />
      <div className="flex flex-col items-center gap-1">
        <h1 className="font-display text-2xl tracking-wider text-amber-300">
          Takedown
        </h1>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-300 transition-colors hover:bg-slate-800"
          >
            ← Menu
          </button>
        )}
      </div>
      <ScoreCell
        side="bottom"
        label={playerLabel('bottom', mode, localPlayer, localName, remoteName)}
        value={score.bottom}
        handCount={game.hands.bottom.length}
        active={game.turn === 'bottom' && game.phase === 'placing'}
        accent="text-blue-300"
      />
    </div>
  );
}

function playerLabel(
  player: Player,
  mode: Mode,
  localPlayer: Player | null,
  localName: string | null,
  remoteName: string | null,
): string {
  if (mode === 'multiplayer' && localPlayer) {
    if (player === localPlayer) return localName ?? 'You';
    return remoteName ?? 'Opponent';
  }
  if (mode === 'ai') {
    return player === 'bottom' ? 'You' : 'AI';
  }
  return player === 'top' ? 'Top' : 'Bottom';
}

interface ScoreCellProps {
  side: Player;
  label: string;
  value: number;
  handCount: number;
  active: boolean;
  accent: string;
}

function ScoreCell({ side, label, value, handCount, active, accent }: ScoreCellProps) {
  return (
    <div
      data-testid={`score-${side}`}
      data-active={active}
      className={[
        'flex flex-col items-center rounded px-3 py-1 transition-colors',
        active ? 'bg-amber-500/20' : 'bg-transparent',
      ].join(' ')}
    >
      <span className={`text-[10px] uppercase tracking-wider ${accent}`}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span
          key={value}
          className="animate-score-pulse font-stat text-3xl leading-none"
        >
          {value}
        </span>
        <span
          className="flex items-center gap-1 text-xs text-slate-400"
          aria-label={`${handCount} cards in hand`}
        >
          <GalleryHorizontalEnd aria-hidden="true" className="h-4 w-4" />
          {handCount}
        </span>
      </div>
    </div>
  );
}
