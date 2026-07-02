import { createHash, randomBytes } from 'crypto';

const TOKEN_BYTES = 32;
/** Durée de validité du lien de réinitialisation. */
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 h

export function generatePasswordResetToken() {
  const raw = randomBytes(TOKEN_BYTES).toString('hex');
  const hash = hashPasswordResetToken(raw);
  return { raw, hash };
}

export function hashPasswordResetToken(raw: string) {
  return createHash('sha256').update(raw).digest('hex');
}
