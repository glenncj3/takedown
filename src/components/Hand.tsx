import type { Mode } from '../store/useGameStore';
import { useGameStore } from '../store/useGameStore';
import type { Player } from '../types';
import { CardView } from './Card';

interface HandProps {
  player: Player;
}

export function Hand({ player }: HandProps) {
  const hand = useGameStore((s) => s.game.hands[player]);
  const turn = useGameStore((s) => s.game.turn);
  const phase = useGameStore((s) => s.game.phase);
  const mode = useGameStore((s) => s.mode);
  const localPlayer = useGameStore((s) => s.localPlayer);
  const selectedId = useGameStore((s) => s.selectedInstanceId);
  const selectCard = useGameStore((s) => s.selectCard);
  const playActionCard = useGameStore((s) => s.playActionCard);

  const isActive =
    turn === player && phase === 'placing' && canAct(mode, player, localPlayer);

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
        const isAction = ci.card.type === 'action';
        const handler = isActive
          ? isAction
            ? () => playActionCard(ci.instanceId)
            : () => selectCard(isSelected ? null : ci.instanceId)
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

// Whether the human user at this client is allowed to act on the hand for
// `player`. In hot-seat both sides are user-controlled. In AI mode the
// human only controls bottom. In multiplayer the human only controls
// their assigned localPlayer side.
function canAct(mode: Mode, player: Player, localPlayer: Player | null): boolean {
  if (mode === 'hot-seat') return true;
  if (mode === 'ai') return player === 'bottom';
  return localPlayer === player;
}
