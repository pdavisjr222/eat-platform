import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { apiRequest } from "./api";

const TOKEN_KEY = "eat_auth_token";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  isPremium: boolean;
  creditBalance: number;
  profileImageUrl?: string | null;
  country?: string | null;
  bio?: string | null;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
  loadStoredToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (token, user) => {
    SecureStore.setItemAsync(TOKEN_KEY, token).catch(() => {});
    set({ token, user, isAuthenticated: true });
  },

  clearAuth: () => {
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    set({ token: null, user: null, isAuthenticated: false });
  },

  loadStoredToken: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        set({ isLoading: false });
        return;
      }
      const { user } = await apiRequest<{ user: AuthUser }>("/api/auth/me", { token });
      set({ token, user, isAuthenticated: true, isLoading: false });
    } catch {
      // Token expired or invalid — clear it silently
      await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      set({ isLoading: false });
    }
  },
}));
