import type { Card, CardStats, Player } from '../types';

interface CardProps {
  card: Card;
  controller: Player;
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
  const art = card.art ? `/images/${stripExt(card.art)}` : null;

  return (
    <div
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-label={card.name}
      data-controller={controller}
      data-card-id={card.id}
      data-card-type={card.type}
      className={[
        'relative h-28 w-20 select-none overflow-hidden rounded-md shadow-md',
        'transition-transform duration-300 ease-out',
        'animate-card-place',
        isUnit
          ? controller === 'bottom'
            ? 'bg-blue-700 ring-1 ring-blue-300/40'
            : 'bg-rose-700 ring-1 ring-rose-300/40'
          : 'border-2 border-dashed border-amber-300/70 bg-emerald-900',
        rotated ? 'rotate-180' : '',
        selected ? 'outline outline-4 outline-amber-300 brightness-110' : '',
        interactive
          ? 'cursor-pointer hover:brightness-110 active:translate-y-0.5'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {art && (
        <picture>
          <source srcSet={`${art}.avif`} type="image/avif" />
          <source srcSet={`${art}.webp`} type="image/webp" />
          <img
            src={`${art}.png`}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-80"
          />
        </picture>
      )}
      {/* Subtle gradient veil so stats stay readable over art */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40"
      />
      {stats && (
        <>
          <span
            className="pointer-events-none absolute left-1/2 top-0.5 -translate-x-1/2 font-display text-lg leading-none text-amber-100 drop-shadow"
            data-stat="top"
          >
            {stats.top}
          </span>
          <span
            className="pointer-events-none absolute bottom-0.5 left-1/2 -translate-x-1/2 font-display text-lg leading-none text-amber-100 drop-shadow"
            data-stat="bottom"
          >
            {stats.bottom}
          </span>
          <span
            className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 font-display text-lg leading-none text-amber-100 drop-shadow"
            data-stat="left"
          >
            {stats.left}
          </span>
          <span
            className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 font-display text-lg leading-none text-amber-100 drop-shadow"
            data-stat="right"
          >
            {stats.right}
          </span>
        </>
      )}
      <span className="pointer-events-none absolute inset-x-0 bottom-1/2 translate-y-1/2 px-1 text-center text-[10px] font-medium uppercase tracking-wider text-white/95 drop-shadow">
        {card.name}
      </span>
    </div>
  );
}

function stripExt(filename: string): string {
  return filename.replace(/\.[^./]+$/, '');
}
