import { useRef } from 'react';
import type { Card, CardStats, Player } from '../types';
import { useUIStore } from '../store/useUIStore';

const LONG_PRESS_MS = 400;

interface CardProps {
  card: Card;
  controller: Player;
  liveStats?: CardStats;
  selected?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  // Enables press-and-hold inspect when set. The id identifies which
  // hand/board instance to look up in the global inspect overlay.
  inspectInstanceId?: string;
}

export function CardView({
  card,
  controller,
  liveStats,
  selected = false,
  interactive = false,
  onClick,
  inspectInstanceId,
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

  const setInspectedInstanceId = useUIStore((s) => s.setInspectedInstanceId);
  const timerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!inspectInstanceId) return;
    longPressFiredRef.current = false;
    // Capture so pointerup fires here even if the finger drifts off.
    // happy-dom (used in tests) doesn't implement setPointerCapture, so
    // feature-check before calling.
    if (typeof e.currentTarget.setPointerCapture === 'function') {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    timerRef.current = window.setTimeout(() => {
      longPressFiredRef.current = true;
      timerRef.current = null;
      setInspectedInstanceId(inspectInstanceId);
    }, LONG_PRESS_MS);
  }

  function handlePointerEnd() {
    if (!inspectInstanceId) return;
    clearTimer();
    if (longPressFiredRef.current) {
      setInspectedInstanceId(null);
      // Don't reset longPressFiredRef yet — handleClick reads it to suppress
      // the synthesized click that follows pointerup.
    }
  }

  function handleClick() {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    onClick?.();
  }

  return (
    <div
      role={onClick ? 'button' : undefined}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      aria-label={card.name}
      data-controller={controller}
      data-card-id={card.id}
      data-card-type={card.type}
      style={{
        width: 'var(--card-w)',
        height: 'calc(var(--card-w) * 4 / 3)',
        transitionTimingFunction: 'cubic-bezier(0.68, -0.4, 0.32, 1.4)',
      }}
      className={[
        'select-none transition-transform duration-500',
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

        <div
          style={{ height: 'calc(var(--card-w) * 0.5)' }}
          className={`pointer-events-none absolute inset-x-0 bottom-0 flex items-start justify-center px-1 pt-0.5 ${palette.banner}`}
        >
          <span
            style={{ fontSize: 'clamp(7px, calc(var(--card-w) * 0.094), 9px)' }}
            className={`inline-block font-bold uppercase tracking-[0.12em] text-white ${upright}`}
          >
            {card.name}
          </span>
        </div>

        {stats && (
          <>
            <span
              className="pointer-events-none absolute left-1/2 top-0.5 -translate-x-1/2"
              data-stat="top"
            >
              <span
                style={{ fontSize: 'clamp(10px, calc(var(--card-w) * 0.21), 20px)' }}
                className={`inline-block font-stat leading-none text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${upright}`}
              >
                {stats.top}
              </span>
            </span>
            <span
              className="pointer-events-none absolute bottom-0.5 left-1/2 -translate-x-1/2"
              data-stat="bottom"
            >
              <span
                style={{ fontSize: 'clamp(10px, calc(var(--card-w) * 0.21), 20px)' }}
                className={`inline-block font-stat leading-none text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${upright}`}
              >
                {stats.bottom}
              </span>
            </span>
            <span
              className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2"
              data-stat="left"
            >
              <span
                style={{ fontSize: 'clamp(10px, calc(var(--card-w) * 0.21), 20px)' }}
                className={`inline-block font-stat leading-none text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${upright}`}
              >
                {stats.left}
              </span>
            </span>
            <span
              className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2"
              data-stat="right"
            >
              <span
                style={{ fontSize: 'clamp(10px, calc(var(--card-w) * 0.21), 20px)' }}
                className={`inline-block font-stat leading-none text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${upright}`}
              >
                {stats.right}
              </span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function stripExt(filename: string): string {
  return filename.replace(/\.[^./]+$/, '');
}
