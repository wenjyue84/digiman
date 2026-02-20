import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/** Hash a plaintext password */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

/** Compare a plaintext password against a stored hash. Also handles legacy plaintext passwords. */
export async function verifyPassword(plaintext: string, stored: string): Promise<boolean> {
  // bcrypt hashes always start with $2a$ or $2b$
  if (stored.startsWith('$2a$') || stored.startsWith('$2b$')) {
    return bcrypt.compare(plaintext, stored);
  }
  // Legacy plaintext comparison (for passwords not yet migrated)
  return plaintext === stored;
}

/** Check if a stored password is already hashed */
export function isHashed(stored: string): boolean {
  return stored.startsWith('$2a$') || stored.startsWith('$2b$');
}
