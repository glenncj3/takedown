import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Results } from './Results';
import { useGameStore } from '../store/useGameStore';
import { useUIStore } from '../store/useUIStore';
import { FIXTURE_CARDS, emptyState, makePlaced } from '../test/fixtures';
import type { GameState } from '../types';

const { balanced } = FIXTURE_CARDS;

function endedGame(winner: GameState['winner'], overrides: Partial<GameState> = {}): GameState {
  const state = emptyState({
    phase: 'ended',
    winner,
    ...overrides,
  });
  // Fill the board so the score reflects the winner.
  if (winner === 'bottom') {
    for (let i = 0; i < 9; i++) {
      state.board[i] = makePlaced(balanced, i < 5 ? 'bottom' : 'top', i as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8);
    }
  } else if (winner === 'top') {
    for (let i = 0; i < 9; i++) {
      state.board[i] = makePlaced(balanced, i < 4 ? 'bottom' : 'top', i as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8);
    }
  }
  return state;
}

afterEach(() => {
  useGameStore.setState({
    mode: 'hot-seat',
    localPlayer: null,
    channel: null,
    localName: null,
    remoteName: null,
  });
  useUIStore.setState({ screen: 'menu' });
});

describe('Results', () => {
  it('shows "Bottom wins" headline in hot-seat mode', () => {
    useGameStore.getState().loadGame(endedGame('bottom'));
    render(<Results />);
    expect(screen.getByRole('heading', { name: /bottom wins/i })).toBeInTheDocument();
  });

  it('shows "You win" / "AI wins" headlines in AI mode', () => {
    useGameStore.setState({ mode: 'ai' });
    useGameStore.getState().loadGame(endedGame('bottom'));
    const { unmount } = render(<Results />);
    expect(screen.getByRole('heading', { name: /you win/i })).toBeInTheDocument();
    unmount();

    useGameStore.getState().loadGame(endedGame('top'));
    render(<Results />);
    expect(screen.getByRole('heading', { name: /ai wins/i })).toBeInTheDocument();
  });

  it('shows player names in multiplayer headlines', () => {
    useGameStore.setState({
      mode: 'multiplayer',
      localPlayer: 'bottom',
      localName: 'Alice',
      remoteName: 'Bob',
    });
    useGameStore.getState().loadGame(endedGame('top'));
    render(<Results />);
    expect(screen.getByRole('heading', { name: /bob wins/i })).toBeInTheDocument();
  });

  it('shows "Draw" on a tie', () => {
    useGameStore.getState().loadGame(endedGame('draw'));
    render(<Results />);
    expect(screen.getByRole('heading', { name: /draw/i })).toBeInTheDocument();
  });

  it('shows the rematch button only for single-player modes', () => {
    useGameStore.setState({ mode: 'ai' });
    useGameStore.getState().loadGame(endedGame('bottom'));
    const { unmount } = render(<Results />);
    expect(screen.getByRole('button', { name: /rematch/i })).toBeInTheDocument();
    unmount();

    useGameStore.setState({ mode: 'multiplayer', localPlayer: 'bottom' });
    useGameStore.getState().loadGame(endedGame('bottom'));
    render(<Results />);
    expect(screen.queryByRole('button', { name: /rematch/i })).toBeNull();
  });

  it('"Rematch" resets the game and routes to game screen', async () => {
    const user = userEvent.setup();
    useGameStore.setState({ mode: 'ai' });
    useGameStore.getState().loadGame(endedGame('bottom'));
    useUIStore.setState({ screen: 'results' });

    render(<Results />);
    await user.click(screen.getByRole('button', { name: /rematch/i }));

    expect(useGameStore.getState().game.phase).toBe('placing');
    expect(useUIStore.getState().screen).toBe('game');
  });

  it('"Back to menu" sets screen to menu', async () => {
    const user = userEvent.setup();
    useGameStore.getState().loadGame(endedGame('bottom'));
    useUIStore.setState({ screen: 'results' });

    render(<Results />);
    await user.click(screen.getByRole('button', { name: /back to menu/i }));
    expect(useUIStore.getState().screen).toBe('menu');
  });

  it('shows the final score', () => {
    useGameStore.getState().loadGame(endedGame('bottom'));
    render(<Results />);
    expect(screen.getByText(/Bottom 5/i)).toBeInTheDocument();
    expect(screen.getByText(/Top 4/i)).toBeInTheDocument();
  });
});
