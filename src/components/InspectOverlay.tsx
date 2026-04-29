import { useGameStore } from '../store/useGameStore';
import { useUIStore } from '../store/useUIStore';
import type { Card, CardStats, GameState, Player } from '../types';

interface InspectData {
  card: Card;
  controller: Player;
  liveStats?: CardStats;
}

export function InspectOverlay() {
  const id = useUIStore((s) => s.inspectedInstanceId);
  const game = useGameStore((s) => s.game);
  if (!id) return null;
  const data = findInspected(game, id);
  if (!data) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <ExpandedCard {...data} />
    </div>
  );
}

function findInspected(game: GameState, id: string): InspectData | null {
  for (const player of ['top', 'bottom'] as const) {
    const ci = game.hands[player].find((c) => c.instanceId === id);
    if (ci) return { card: ci.card, controller: player };
  }
  for (const cell of game.board) {
    if (cell && cell.instanceId === id) {
      return { card: cell.card, controller: cell.controller, liveStats: cell.stats };
    }
  }
  return null;
}

function ExpandedCard({ card, controller, liveStats }: InspectData) {
  const isUnit = card.type === 'unit';
  const stats = liveStats ?? (isUnit ? card.stats : null);
  const art = card.art ? `/images/${stripExt(card.art)}` : null;
  const palette = paletteFor(card, controller);
  const abilities = card.abilities ?? [];

  return (
    <div className="relative">
      {stats && (
        <>
          <span className={statClass('-top-12 left-1/2 -translate-x-1/2')}>
            {stats.top}
          </span>
          <span className={statClass('-bottom-12 left-1/2 -translate-x-1/2')}>
            {stats.bottom}
          </span>
          <span className={statClass('-left-12 top-1/2 -translate-y-1/2')}>
            {stats.left}
          </span>
          <span className={statClass('-right-12 top-1/2 -translate-y-1/2')}>
            {stats.right}
          </span>
        </>
      )}
      <div
        className={[
          'relative h-64 w-48 overflow-hidden rounded-lg border-2 shadow-2xl',
          palette.ring,
          palette.shadow,
          !isUnit ? 'border-dashed' : '',
        ].join(' ')}
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
        <div className={`absolute inset-x-0 bottom-0 min-h-24 px-3 pt-3 pb-3 ${palette.banner}`}>
          <h3 className="text-center text-base font-bold uppercase tracking-[0.18em] text-white">
            {card.name}
          </h3>
          {abilities.length > 0 ? (
            <ul className="mt-2 space-y-1.5 text-[11px] leading-snug text-amber-50">
              {abilities.map((a, i) => (
                <li key={i}>
                  <span className="font-bold uppercase tracking-wider text-amber-300/80">
                    {a.trigger}
                  </span>
                  {' — '}
                  {a.text ?? a.abilityId}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-center text-[10px] italic text-slate-300">
              No abilities
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function statClass(pos: string): string {
  return `pointer-events-none absolute ${pos} font-stat text-4xl leading-none text-amber-100 drop-shadow-[0_2px_3px_rgba(0,0,0,0.85)]`;
}

function paletteFor(card: Card, controller: Player) {
  if (card.type === 'unit') {
    return controller === 'bottom'
      ? {
          ring: 'border-blue-300',
          bg: 'bg-blue-800',
          banner: 'bg-blue-950/90',
          shadow: 'shadow-blue-900/40',
        }
      : {
          ring: 'border-rose-300',
          bg: 'bg-rose-800',
          banner: 'bg-rose-950/90',
          shadow: 'shadow-rose-900/40',
        };
  }
  return {
    ring: 'border-amber-300/70',
    bg: 'bg-emerald-900',
    banner: 'bg-emerald-950/90',
    shadow: 'shadow-emerald-900/40',
  };
}

function stripExt(filename: string): string {
  return filename.replace(/\.[^./]+$/, '');
}
