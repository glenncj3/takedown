import { useGameStore } from '../store/useGameStore';
import { scoreBoard } from '../engine/score';

export function Scoreboard() {
  const game = useGameStore((s) => s.game);
  const score = scoreBoard(game);

  return (
    <div
      role="status"
      aria-label="Scoreboard"
      className="flex items-center gap-6 rounded bg-slate-950/40 px-4 py-2 text-sm"
    >
      <ScoreCell
        label="Top"
        value={score.top}
        active={game.turn === 'top' && game.phase === 'placing'}
        accent="text-rose-300"
      />
      <h1 className="font-display text-2xl tracking-wider text-amber-300">
        Takedown
      </h1>
      <ScoreCell
        label="Bottom"
        value={score.bottom}
        active={game.turn === 'bottom' && game.phase === 'placing'}
        accent="text-blue-300"
      />
    </div>
  );
}

interface ScoreCellProps {
  label: string;
  value: number;
  active: boolean;
  accent: string;
}

function ScoreCell({ label, value, active, accent }: ScoreCellProps) {
  return (
    <div
      data-testid={`score-${label.toLowerCase()}`}
      data-active={active}
      className={[
        'flex flex-col items-center rounded px-3 py-1 transition-colors',
        active ? 'bg-amber-500/20' : 'bg-transparent',
      ].join(' ')}
    >
      <span className={`text-[10px] uppercase tracking-wider ${accent}`}>
        {label}
      </span>
      <span
        key={value}
        className="animate-score-pulse font-display text-3xl leading-none"
      >
        {value}
      </span>
    </div>
  );
}
