import { User } from '../types';

const TOKEN_KEY = 'lms_token';
const USER_KEY = 'lms_user';

// The JWT is kept in localStorage and sent as a Bearer header (the API is a separate origin
// and uses no cookies, so CSRF does not apply). The cached user only speeds up first paint;
// it is always re-validated against GET /auth/me, and the server re-checks role on every call.

function safeStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null; // storage disabled (privacy mode, blocked site data)
  }
}

export function getStoredToken(): string | null {
  return safeStorage()?.getItem(TOKEN_KEY) ?? null;
}

export function setStoredToken(token: string): void {
  safeStorage()?.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  const storage = safeStorage();
  storage?.removeItem(TOKEN_KEY);
  storage?.removeItem(USER_KEY);
}

export function getStoredUser(): User | null {
  const raw = safeStorage()?.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User): void {
  safeStorage()?.setItem(USER_KEY, JSON.stringify(user));
}
