import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { useGameStore } from '../store/useGameStore';
import { useUIStore } from '../store/useUIStore';

afterEach(() => {
  useUIStore.setState({ screen: 'menu' });
  useGameStore.setState({ mode: 'hot-seat', selectedInstanceId: null, lastError: null });
});

describe('Menu', () => {
  it('renders both play options on mount', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /play vs ai/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hot-seat/i })).toBeInTheDocument();
  });

  it('"Play vs AI" sets ai mode and navigates to the game screen', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /play vs ai/i }));
    expect(useGameStore.getState().mode).toBe('ai');
    expect(useUIStore.getState().screen).toBe('game');
    expect(screen.getByRole('grid', { name: /game board/i })).toBeInTheDocument();
  });

  it('"Hot-seat" sets hot-seat mode and navigates to the game screen', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /hot-seat/i }));
    expect(useGameStore.getState().mode).toBe('hot-seat');
    expect(useUIStore.getState().screen).toBe('game');
  });

  it('"← Menu" button on the game screen returns to the menu', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ screen: 'game' });
    render(<App />);
    await user.click(screen.getByRole('button', { name: /← menu/i }));
    expect(useUIStore.getState().screen).toBe('menu');
    expect(screen.getByRole('button', { name: /play vs ai/i })).toBeInTheDocument();
  });
});
