import { useEffect } from 'react';
import { Desync } from './components/Desync';
import { Game } from './components/Game';
import { HostLobby } from './components/HostLobby';
import { JoinLobby } from './components/JoinLobby';
import { Menu } from './components/Menu';
import { useUIStore } from './store/useUIStore';

export function App() {
  const screen = useUIStore((s) => s.screen);
  const toast = useUIStore((s) => s.toast);
  const setToast = useUIStore((s) => s.setToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  return (
    <>
      {screen === 'menu' && <Menu />}
      {screen === 'host-lobby' && <HostLobby />}
      {screen === 'join-lobby' && <JoinLobby />}
      {screen === 'game' && <Game />}
      {screen === 'desync' && <Desync />}
      {toast && (
        <div
          role="alert"
          className="fixed bottom-4 left-1/2 z-20 -translate-x-1/2 rounded bg-rose-900/95 px-4 py-2 text-sm text-rose-100 shadow-lg"
        >
          {toast}
        </div>
      )}
    </>
  );
}
