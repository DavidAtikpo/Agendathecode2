/** Initiales affichées sur l’avatar (même logique qu’à l’inscription). */
export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0];
    const b = parts[parts.length - 1][0];
    if (a && b) return (a + b).toUpperCase();
  }
  const t = name.trim();
  if (!t) return '?';
  return t.slice(0, 2).toUpperCase();
}

export const USER_AVATAR_COLORS = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#ec4899',
  '#14b8a6',
] as const;

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export function isValidAvatarColor(value: string): boolean {
  return HEX_COLOR_RE.test(value);
}
