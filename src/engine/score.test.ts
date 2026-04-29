import { describe, it, expect } from 'vitest';
import { FIXTURE_CARDS, emptyState, makePlaced } from '../test/fixtures';
import { controllerCount, scoreBoard } from './score';

const { weak, balanced } = FIXTURE_CARDS;

describe('scoreBoard', () => {
  it('returns 0/0/draw for an empty board', () => {
    expect(scoreBoard(emptyState())).toEqual({
      bottom: 0,
      top: 0,
      winner: 'draw',
    });
  });

  it('counts cards by controller', () => {
    const state = emptyState();
    state.board[0] = makePlaced(weak, 'bottom', 0);
    state.board[1] = makePlaced(weak, 'bottom', 1);
    state.board[2] = makePlaced(weak, 'top', 2);
    expect(scoreBoard(state)).toEqual({
      bottom: 2,
      top: 1,
      winner: 'bottom',
    });
  });

  it('declares top winner when top has more', () => {
    const state = emptyState();
    state.board[0] = makePlaced(weak, 'top', 0);
    state.board[1] = makePlaced(weak, 'top', 1);
    state.board[2] = makePlaced(weak, 'bottom', 2);
    expect(scoreBoard(state).winner).toBe('top');
  });

  it('declares draw on equal count', () => {
    const state = emptyState();
    state.board[0] = makePlaced(weak, 'top', 0);
    state.board[1] = makePlaced(weak, 'bottom', 1);
    expect(scoreBoard(state).winner).toBe('draw');
  });

  it('handles a full 9-card board', () => {
    const state = emptyState();
    for (let i = 0; i < 9; i++) {
      const player = i < 5 ? 'bottom' : 'top';
      state.board[i] = makePlaced(balanced, player, i as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8);
    }
    expect(scoreBoard(state)).toEqual({
      bottom: 5,
      top: 4,
      winner: 'bottom',
    });
  });
});

describe('controllerCount', () => {
  it('counts cards for a single player', () => {
    const state = emptyState();
    state.board[0] = makePlaced(weak, 'bottom', 0);
    state.board[3] = makePlaced(weak, 'bottom', 3);
    state.board[6] = makePlaced(weak, 'top', 6);
    expect(controllerCount(state, 'bottom')).toBe(2);
    expect(controllerCount(state, 'top')).toBe(1);
  });
});
