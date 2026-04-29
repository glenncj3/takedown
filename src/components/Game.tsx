import { useEffect } from 'react';
import type { Mode } from '../store/useGameStore';
import { useGameStore } from '../store/useGameStore';
import { useUIStore } from '../store/useUIStore';
import type { Player } from '../types';
import { Board } from './Board';
import { Hand } from './Hand';
import { InspectOverlay } from './InspectOverlay';
import { Scoreboard } from './Scoreboard';

const AI_TURN_DELAY_MS = 600;
// Hold on the Game screen after the 9th placement so the flip rotations
// (500ms transform transition on Card) play out and the final score
// registers before the Results screen takes over.
const END_OF_GAME_DELAY_MS = 900;

export function Game() {
  const lastError = useGameStore((s) => s.lastError);
  const mode = useGameStore((s) => s.mode);
  const turn = useGameStore((s) => s.game.turn);
  const phase = useGameStore((s) => s.game.phase);
  const aiTurn = useGameStore((s) => s.aiTurn);
  const channel = useGameStore((s) => s.channel);
  const localPlayer = useGameStore((s) => s.localPlayer);
  const handleRemoteEvent = useGameStore((s) => s.handleRemoteEvent);
  const exitMultiplayer = useGameStore((s) => s.exitMultiplayer);
  const setScreen = useUIStore((s) => s.setScreen);

  useEffect(() => {
    if (mode !== 'ai' || turn !== 'top' || phase !== 'placing') return;
    const t = setTimeout(() => aiTurn(), AI_TURN_DELAY_MS);
    return () => clearTimeout(t);
  }, [mode, turn, phase, aiTurn]);

  useEffect(() => {
    if (mode !== 'multiplayer' || !channel) return;
    return channel.onEvent(handleRemoteEvent);
  }, [mode, channel, handleRemoteEvent]);

  // When the game ends, route to the dedicated Results screen so the
  // final board, score, and rematch options have room to breathe. The
  // delay lets the final placement's flip transitions finish on this
  // screen — Results re-mounts the Board, so transitions started here
  // wouldn't carry over.
  useEffect(() => {
    if (phase !== 'ended') return;
    const t = setTimeout(() => setScreen('results'), END_OF_GAME_DELAY_MS);
    return () => clearTimeout(t);
  }, [phase, setScreen]);

  async function backToMenu() {
    if (mode === 'multiplayer') await exitMultiplayer();
    setScreen('menu');
  }

  // Hide the opponent's hand: revealing their cards would leak hidden
  // information. The Scoreboard shows a card count + icon as a summary.
  // In hot-seat both sides are local-controlled, so both hands stay visible.
  const showTopHand = isLocalControlled('top', mode, localPlayer);
  const showBottomHand = isLocalControlled('bottom', mode, localPlayer);

  return (
    <main className="relative flex min-h-screen flex-col items-center gap-3 bg-slate-900 px-4 py-6 text-slate-100">
      {showTopHand && <Hand player="top" />}
      <Scoreboard onBack={backToMenu} />
      <Board />
      {showBottomHand && <Hand player="bottom" />}
      {lastError && (
        <p
          role="alert"
          className="fixed bottom-2 left-1/2 -translate-x-1/2 rounded bg-rose-900/90 px-3 py-1 text-xs text-rose-100 shadow"
        >
          {lastError}
        </p>
      )}
      <InspectOverlay />
    </main>
  );
}

function isLocalControlled(
  player: Player,
  mode: Mode,
  localPlayer: Player | null,
): boolean {
  if (mode === 'hot-seat') return true;
  if (mode === 'ai') return player === 'bottom';
  return localPlayer === player;
}
