// Room code alphabet excludes I, O, 0, 1 — the four characters most often
// confused when a player reads a code aloud or types it from a screenshot
// (per DESIGN §12). 31 chars × 6 positions ≈ 887M codes, plenty for a
// hobby game.

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

export function generateRoomCode(rng: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[Math.floor(rng() * ALPHABET.length)];
  }
  return out;
}

export function isValidRoomCode(code: string): boolean {
  if (code.length !== CODE_LENGTH) return false;
  for (let i = 0; i < code.length; i++) {
    if (!ALPHABET.includes(code[i])) return false;
  }
  return true;
}

export { ALPHABET as ROOM_CODE_ALPHABET, CODE_LENGTH as ROOM_CODE_LENGTH };
