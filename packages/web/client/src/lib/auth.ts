import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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

// Use sessionStorage by default (clears on browser close).
// If user checks "Remember me", switch to localStorage before calling setAuth.
export function setRememberMe(remember: boolean) {
  if (remember) {
    localStorage.setItem("eat-remember-me", "1");
  } else {
    localStorage.removeItem("eat-remember-me");
  }
}

function getStorage(): Storage {
  return localStorage.getItem("eat-remember-me") === "1"
    ? localStorage
    : sessionStorage;
}

const dynamicStorage = () => ({
  getItem: (name: string) => getStorage().getItem(name),
  setItem: (name: string, value: string) => getStorage().setItem(name, value),
  removeItem: (name: string) => {
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
  },
});

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
        localStorage.removeItem("eat-auth-storage");
        sessionStorage.removeItem("eat-auth-storage");
      },
    }),
    {
      name: 'eat-auth-storage',
      storage: createJSONStorage(dynamicStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
