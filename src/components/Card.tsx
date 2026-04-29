import type { Card, CardStats, Player } from '../types';

interface CardProps {
  card: Card;
  controller: Player;
  // When true, the card stat block represents post-buff/debuff live stats
  // rather than the card's printed values. Phase 3 sets this for placed
  // cards that have been modified by abilities.
  liveStats?: CardStats;
  selected?: boolean;
  interactive?: boolean;
  onClick?: () => void;
}

export function CardView({
  card,
  controller,
  liveStats,
  selected = false,
  interactive = false,
  onClick,
}: CardProps) {
  const rotated = controller === 'top';
  const isUnit = card.type === 'unit';
  const stats = liveStats ?? (isUnit ? card.stats : null);

  return (
    <div
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-label={card.name}
      data-controller={controller}
      data-card-id={card.id}
      className={[
        'relative h-28 w-20 select-none rounded-md shadow-md',
        'transition-transform duration-300 ease-out',
        controller === 'bottom'
          ? 'bg-blue-700 ring-1 ring-blue-300/40'
          : 'bg-rose-700 ring-1 ring-rose-300/40',
        rotated ? 'rotate-180' : '',
        selected ? 'outline outline-4 outline-amber-300 brightness-110' : '',
        interactive
          ? 'cursor-pointer hover:brightness-110 active:translate-y-0.5'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {stats && (
        <>
          <span
            className="pointer-events-none absolute left-1/2 top-0.5 -translate-x-1/2 font-display text-lg leading-none text-amber-100"
            data-stat="top"
          >
            {stats.top}
          </span>
          <span
            className="pointer-events-none absolute bottom-0.5 left-1/2 -translate-x-1/2 font-display text-lg leading-none text-amber-100"
            data-stat="bottom"
          >
            {stats.bottom}
          </span>
          <span
            className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 font-display text-lg leading-none text-amber-100"
            data-stat="left"
          >
            {stats.left}
          </span>
          <span
            className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 font-display text-lg leading-none text-amber-100"
            data-stat="right"
          >
            {stats.right}
          </span>
        </>
      )}
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-1 text-center text-[10px] font-medium uppercase tracking-wider text-white/90">
        {card.name}
      </span>
    </div>
  );
}
