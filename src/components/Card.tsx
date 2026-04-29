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

  const palette = isUnit
    ? controller === 'bottom'
      ? {
          ring: 'border-blue-300',
          bg: 'bg-blue-800',
          banner: 'bg-blue-950/85',
          shadow: 'shadow-blue-900/40',
        }
      : {
          ring: 'border-rose-300',
          bg: 'bg-rose-800',
          banner: 'bg-rose-950/85',
          shadow: 'shadow-rose-900/40',
        }
    : {
        ring: 'border-amber-300/70',
        bg: 'bg-emerald-900',
        banner: 'bg-emerald-950/85',
        shadow: 'shadow-emerald-900/40',
      };

  // Each readable element (digit, name) wraps its content in an
  // <inline-block> child with `-rotate-180` when the card is rotated.
  // The two rotations compose to identity, so digits and names stay
  // upright in world space while the card body itself rotates 180°.
  // Without this counter-rotation, stat numbers become unreadable
  // (a rotated "7" reads as "1"/"L"), which makes the capture rule
  // visually ungrokkable even though the engine is correct.
  const upright = rotated ? '-rotate-180' : '';

  return (
    <div
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-label={card.name}
      data-controller={controller}
      data-card-id={card.id}
      data-card-type={card.type}
      style={{
        transitionTimingFunction: 'cubic-bezier(0.68, -0.4, 0.32, 1.4)',
      }}
      className={[
        'h-32 w-24 select-none transition-transform duration-500',
        rotated ? 'rotate-180' : '',
        interactive
          ? 'cursor-pointer hover:brightness-110 active:translate-y-0.5'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className={[
          'relative h-full w-full overflow-hidden rounded-md border-2 shadow-lg',
          'animate-card-place',
          palette.ring,
          palette.shadow,
          !isUnit ? 'border-dashed' : '',
          selected ? 'outline outline-4 outline-amber-300 brightness-110' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div aria-hidden className={`absolute inset-0 ${palette.bg}`} />

        {art && (
          <picture>
            <source srcSet={`${art}.avif`} type="image/avif" />
            <source srcSet={`${art}.webp`} type="image/webp" />
            <img
              src={`${art}.png`}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-55 mix-blend-screen"
            />
          </picture>
        )}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/55 to-transparent"
        />

        {stats && (
          <>
            <span
              className="pointer-events-none absolute left-1/2 top-0.5 -translate-x-1/2"
              data-stat="top"
            >
              <span
                className={`inline-block font-display text-xl leading-none text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${upright}`}
              >
                {stats.top}
              </span>
            </span>
            <span
              className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2"
              data-stat="bottom"
            >
              <span
                className={`inline-block font-display text-xl leading-none text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${upright}`}
              >
                {stats.bottom}
              </span>
            </span>
            <span
              className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2"
              data-stat="left"
            >
              <span
                className={`inline-block font-display text-xl leading-none text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${upright}`}
              >
                {stats.left}
              </span>
            </span>
            <span
              className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2"
              data-stat="right"
            >
              <span
                className={`inline-block font-display text-xl leading-none text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${upright}`}
              >
                {stats.right}
              </span>
            </span>
          </>
        )}

        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 px-1 py-0.5 text-center ${palette.banner}`}
        >
          <span
            className={`inline-block text-[9px] font-bold uppercase tracking-[0.12em] text-white ${upright}`}
          >
            {card.name}
          </span>
        </div>
      </div>
    </div>
  );
}

function stripExt(filename: string): string {
  return filename.replace(/\.[^./]+$/, '');
}
