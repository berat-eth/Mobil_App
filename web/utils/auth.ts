// Authentication helper functions

import type { User } from '@/lib/types';

const USER_STORAGE_KEY = 'user';
const TOKEN_STORAGE_KEY = 'auth_token';

export const authHelpers = {
  // Save user to localStorage
  saveUser: (user: User, token?: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
  },

  // Get user from localStorage
  getUser: (): User | null => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem(USER_STORAGE_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  },

  // Get token from localStorage
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return authHelpers.getUser() !== null;
  },

  // Clear auth data
  logout: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  },

  // Get user ID
  getUserId: (): number | null => {
    const user = authHelpers.getUser();
    return user?.id || null;
  },
};

