import { generateRoomCode } from './roomCode';
import { getSupabase } from './supabase';

export interface RoomRow {
  code: string;
  host_name: string;
  joiner_name: string | null;
  status: string;
  created_at: string;
}

const TABLE = 'rooms';

// Inserts a new room with a fresh 6-char code and the host's display name.
// On the very rare collision (~1 in 10^9 with 6-char codes), retries up to
// 5 times before giving up — the chance of 5 collisions in a row is
// astronomically small and "throw" is the right answer if it happens.
export async function createRoom(hostName: string): Promise<RoomRow> {
  const sb = getSupabase();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const { data, error } = await sb
      .from(TABLE)
      .insert({ code, host_name: hostName, status: 'waiting' })
      .select()
      .single();
    if (!error && data) return data as RoomRow;
    // 23505 = unique_violation in Postgres; retry on collision, throw on
    // anything else.
    if (error && (error as { code?: string }).code !== '23505') {
      throw error;
    }
  }
  throw new Error('Could not allocate a room code after 5 attempts');
}

export async function joinRoom(code: string, joinerName: string): Promise<RoomRow> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from(TABLE)
    .update({ joiner_name: joinerName, status: 'in-progress' })
    .eq('code', code)
    .select()
    .single();
  if (error) throw error;
  if (!data) throw new Error(`Room ${code} not found`);
  return data as RoomRow;
}

export async function getRoom(code: string): Promise<RoomRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from(TABLE)
    .select()
    .eq('code', code)
    .maybeSingle();
  if (error) throw error;
  return (data as RoomRow | null) ?? null;
}
