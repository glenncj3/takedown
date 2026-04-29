import type { CellIndex } from '../types';
import { useGameStore } from '../store/useGameStore';
import { CardView } from './Card';

interface CellProps {
  index: CellIndex;
}

export function Cell({ index }: CellProps) {
  const placed = useGameStore((s) => s.game.board[index]);
  const selectedId = useGameStore((s) => s.selectedInstanceId);
  const phase = useGameStore((s) => s.game.phase);
  const placeSelectedCardOn = useGameStore((s) => s.placeSelectedCardOn);

  const isTarget = !placed && selectedId !== null && phase === 'placing';
  const onClick = isTarget ? () => placeSelectedCardOn(index) : undefined;

  return (
    <div
      role={onClick ? 'button' : undefined}
      aria-label={`Cell ${index}`}
      data-cell-index={index}
      onClick={onClick}
      style={{
        width: 'var(--card-w)',
        height: 'calc(var(--card-w) * 4 / 3)',
      }}
      className={[
        'flex items-center justify-center rounded border-2 border-slate-700 bg-slate-800/60',
        isTarget ? 'cursor-pointer ring-2 ring-amber-300/70 hover:bg-slate-700/60' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {placed && (
        <CardView
          card={placed.card}
          controller={placed.controller}
          liveStats={placed.stats}
          inspectInstanceId={placed.instanceId}
        />
      )}
    </div>
  );
}
