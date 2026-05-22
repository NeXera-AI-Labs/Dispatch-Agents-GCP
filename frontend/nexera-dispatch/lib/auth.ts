import type { AuthUser } from './types';

const TOKEN_KEY = 'nexera_token';

export function setToken(token: string) {
  if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
}

export function decodeToken(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      user_id: payload.user_id,
      tenant_id: payload.tenant_id,
      email: payload.email,
      full_name: payload.full_name || payload.email,
      role: payload.role,
      warehouse_numbers: payload.warehouse_numbers || [],
    };
  } catch {
    return null;
  }
}

export function getCurrentUser(): AuthUser | null {
  const token = getToken();
  if (!token) return null;
  return decodeToken(token);
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}
