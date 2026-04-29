import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Game } from './Game';
import { useGameStore } from '../store/useGameStore';
import { FIXTURE_CARDS, makeInstance, makePlaced } from '../test/fixtures';
import type { GameState } from '../types';

const { weak, strong, balanced } = FIXTURE_CARDS;

function emptyGame(overrides: Partial<GameState> = {}): GameState {
  return {
    board: Array.from({ length: 9 }, () => null),
    hands: { bottom: [], top: [] },
    decks: { bottom: [], top: [] },
    discards: { bottom: [], top: [] },
    turn: 'bottom',
    placementCount: 0,
    phase: 'placing',
    winner: null,
    rngSeed: 1,
    rngState: 1,
    moveSeq: 0,
    ...overrides,
  };
}

beforeEach(() => {
  // Pin to a known seed so each test starts with predictable hand contents
  // when it doesn't load a custom state.
  useGameStore.getState().startGame(424242);
});

afterEach(() => {
  useGameStore.setState({ selectedInstanceId: null, lastError: null });
});

describe('Game (hot-seat integration)', () => {
  it('renders the title and two hands of 5 cards on initial load', () => {
    render(<Game />);
    expect(screen.getByRole('heading', { name: /takedown/i })).toBeInTheDocument();
    const bottomHand = screen.getByLabelText('bottom hand');
    const topHand = screen.getByLabelText('top hand');
    // 5 cards each — every CardView has role="button" when interactive,
    // but inactive hands render non-interactive cards. Match on aria-label
    // count instead.
    expect(within(bottomHand).getAllByLabelText(/.*/i)).toHaveLength(5);
    expect(within(topHand).getAllByLabelText(/.*/i)).toHaveLength(5);
  });

  it('renders nine empty cells', () => {
    render(<Game />);
    const board = screen.getByRole('grid', { name: /game board/i });
    expect(within(board).getAllByLabelText(/cell \d/i)).toHaveLength(9);
  });

  it('lets the active player select a card and place it on a cell', async () => {
    const user = userEvent.setup();
    // Construct a state with a known card in bottom's hand and an empty board.
    const state = emptyGame({
      hands: { bottom: [makeInstance(weak, 'b1')], top: [] },
    });
    useGameStore.getState().loadGame(state);

    render(<Game />);

    const bottomHand = screen.getByLabelText('bottom hand');
    const card = within(bottomHand).getByLabelText(weak.name);
    await user.click(card);
    // Selected card sets selectedInstanceId in store.
    expect(useGameStore.getState().selectedInstanceId).toBe('b1');

    const cell4 = screen.getByLabelText('Cell 4');
    await user.click(cell4);

    const placedCell = screen.getByLabelText('Cell 4');
    expect(within(placedCell).getByLabelText(weak.name)).toBeInTheDocument();
    expect(useGameStore.getState().game.hands.bottom).toHaveLength(0);
    expect(useGameStore.getState().game.turn).toBe('top');
  });

  it('renders top-player cards rotated 180°', () => {
    const state = emptyGame();
    state.board[4] = makePlaced(weak, 'top', 4);
    useGameStore.getState().loadGame(state);

    render(<Game />);
    const placed = screen.getByLabelText(weak.name);
    expect(placed.className).toMatch(/rotate-180/);
    expect(placed.getAttribute('data-controller')).toBe('top');
  });

  it('updates the score after a flip', async () => {
    const user = userEvent.setup();
    // Bottom holds a strong card; top has weak at cell 1. Placing strong at
    // cell 4 will flip the weak card. Score: bottom 2, top 0.
    const state = emptyGame({
      hands: { bottom: [makeInstance(strong, 'placer')], top: [] },
    });
    state.board[1] = makePlaced(weak, 'top', 1);
    useGameStore.getState().loadGame(state);

    render(<Game />);
    expect(screen.getByTestId('score-bottom')).toHaveTextContent('0');
    expect(screen.getByTestId('score-top')).toHaveTextContent('1');

    await user.click(screen.getByLabelText(strong.name));
    await user.click(screen.getByLabelText('Cell 4'));

    expect(screen.getByTestId('score-bottom')).toHaveTextContent('2');
    expect(screen.getByTestId('score-top')).toHaveTextContent('0');
  });

  it('shows the game-over overlay after the 9th placement', async () => {
    const user = userEvent.setup();
    // Eight cells filled, one card left in top's hand at the 9th cell.
    const state = emptyGame({
      hands: { bottom: [], top: [makeInstance(weak, 't9')] },
      turn: 'top',
      placementCount: 8,
    });
    for (let i = 0; i < 8; i++) {
      state.board[i] = makePlaced(balanced, i < 5 ? 'bottom' : 'top', i as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7);
    }
    useGameStore.getState().loadGame(state);

    render(<Game />);
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.click(screen.getByLabelText(weak.name));
    await user.click(screen.getByLabelText('Cell 8'));

    const dialog = screen.getByRole('dialog', { name: /game over/i });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/bottom wins/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /play again/i })).toBeInTheDocument();
  });

  it('"Play again" resets to a fresh game', async () => {
    const user = userEvent.setup();
    useGameStore.setState({
      game: {
        ...useGameStore.getState().game,
        phase: 'ended',
        winner: 'draw',
      },
    });

    render(<Game />);
    const dialog = screen.getByRole('dialog', { name: /game over/i });
    await user.click(within(dialog).getByRole('button', { name: /play again/i }));

    expect(useGameStore.getState().game.phase).toBe('placing');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('clicking the same selected card deselects it', async () => {
    const user = userEvent.setup();
    const state = emptyGame({
      hands: { bottom: [makeInstance(weak, 'b1')], top: [] },
    });
    useGameStore.getState().loadGame(state);
    render(<Game />);

    const card = screen.getByLabelText(weak.name);
    await user.click(card);
    expect(useGameStore.getState().selectedInstanceId).toBe('b1');
    await user.click(card);
    expect(useGameStore.getState().selectedInstanceId).toBeNull();
  });

  it('inactive player cannot select cards', async () => {
    const user = userEvent.setup();
    const state = emptyGame({
      hands: {
        bottom: [makeInstance(weak, 'b1')],
        top: [makeInstance(strong, 't1')],
      },
      turn: 'bottom',
    });
    useGameStore.getState().loadGame(state);

    render(<Game />);
    const topCard = screen.getByLabelText(strong.name);
    await user.click(topCard);
    expect(useGameStore.getState().selectedInstanceId).toBeNull();
  });
});
