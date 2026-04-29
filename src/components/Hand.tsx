import type { Player } from '../types';
import { useGameStore } from '../store/useGameStore';
import { CardView } from './Card';

interface HandProps {
  player: Player;
}

export function Hand({ player }: HandProps) {
  const hand = useGameStore((s) => s.game.hands[player]);
  const turn = useGameStore((s) => s.game.turn);
  const phase = useGameStore((s) => s.game.phase);
  const selectedId = useGameStore((s) => s.selectedInstanceId);
  const selectCard = useGameStore((s) => s.selectCard);

  const isActive = turn === player && phase === 'placing';

  return (
    <section
      aria-label={`${player} hand`}
      data-player={player}
      data-active={isActive}
      className={[
        'flex min-h-[8rem] items-center justify-center gap-2 rounded p-2',
        isActive ? 'bg-amber-500/10' : 'bg-transparent',
      ].join(' ')}
    >
      {hand.length === 0 && (
        <span className="text-xs text-slate-500">empty</span>
      )}
      {hand.map((ci) => {
        const isSelected = ci.instanceId === selectedId;
        const handler = isActive
          ? () => selectCard(isSelected ? null : ci.instanceId)
          : undefined;
        return (
          <CardView
            key={ci.instanceId}
            card={ci.card}
            controller={player}
            selected={isSelected}
            interactive={isActive}
            onClick={handler}
          />
        );
      })}
    </section>
  );
}
