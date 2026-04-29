// Thin wrapper around a Supabase Realtime Broadcast channel, scoped to a
// single multi-event "game-event" channel per room. The wrapper hides the
// Supabase shape and exposes a typed send / onEvent / unsubscribe API.

import type { RealtimeChannel } from '@supabase/supabase-js';
import type { GameEvent } from './events';
import { getSupabase } from './supabase';

const BROADCAST_EVENT = 'game-event';

export interface GameChannel {
  send: (event: GameEvent) => Promise<void>;
  onEvent: (handler: (event: GameEvent) => void) => () => void;
  unsubscribe: () => Promise<void>;
}

export async function openChannel(roomCode: string): Promise<GameChannel> {
  const sb = getSupabase();
  const channel: RealtimeChannel = sb.channel(`room:${roomCode}`, {
    config: { broadcast: { self: false } },
  });

  const handlers = new Set<(event: GameEvent) => void>();

  channel.on('broadcast', { event: BROADCAST_EVENT }, ({ payload }) => {
    for (const h of handlers) {
      try {
        h(payload as GameEvent);
      } catch {
        // Swallow; one bad handler must not break the channel.
      }
    }
  });

  await new Promise<void>((resolve, reject) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') resolve();
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        reject(new Error(`Channel ${status} for room ${roomCode}`));
      }
    });
  });

  return {
    send: async (event) => {
      await channel.send({
        type: 'broadcast',
        event: BROADCAST_EVENT,
        payload: event,
      });
    },
    onEvent: (handler) => {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    unsubscribe: async () => {
      handlers.clear();
      await sb.removeChannel(channel);
    },
  };
}
