import { Game } from './components/Game';
import { Menu } from './components/Menu';
import { useUIStore } from './store/useUIStore';

export function App() {
  const screen = useUIStore((s) => s.screen);
  return screen === 'game' ? <Game /> : <Menu />;
}
