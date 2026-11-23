// Explicit user preference for this project. Authentication still uses a separate
// salted PBKDF2 hash and signed session for every program.
export const DEFAULT_ADMIN_PASSWORD = 'secure';
export const validAdminPassword = value => typeof value === 'string' && value.trim() === value &&
  value.length <= 128 && (value === DEFAULT_ADMIN_PASSWORD || value.length >= 12);
