// Tiny localStorage wrapper for the player's display name. Wrapped so
// SSR / private-mode browsers (where localStorage throws) don't break.

const KEY = 'takedown:displayName';

export function getStoredDisplayName(): string {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

export function setStoredDisplayName(name: string): void {
  try {
    localStorage.setItem(KEY, name);
  } catch {
    // ignore
  }
}
