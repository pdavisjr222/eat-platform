import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@shared/schema';

// Re-export the User type as AuthUser for convenience
export type AuthUser = User;

// ============================================================================
// PLAIN FUNCTIONS — safe to call in non-React context (e.g. API client)
// Reads/writes through the Zustand store state so both stay in sync.
// ============================================================================

export const getToken = (): string | null =>
  useAuth.getState().token;

export const setToken = (t: string): void => {
  useAuth.setState((s) => ({ ...s, token: t, isAuthenticated: true }));
};

export const removeToken = (): void => {
  useAuth.getState().clearAuth();
};

export const getUser = (): AuthUser | null =>
  useAuth.getState().user;

export const setUser = (u: AuthUser): void => {
  useAuth.setState((s) => ({ ...s, user: u }));
};

// ============================================================================
// ZUSTAND STORE — reactive auth state for components
// ============================================================================

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true });
      },
      clearAuth: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'eat-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
