import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';
import type {AuthResponse, TokenPair, User} from '../api_services/types';

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
  hasHydrated: boolean;
  setSession: (auth: AuthResponse) => void;
  setTokens: (tokens: TokenPair) => void;
  setUser: (user: User) => void;
  clearSession: () => void;
  setHasHydrated: (value: boolean) => void;
};

const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  expiresIn: null,
} as const;

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      ...initialState,
      hasHydrated: false,
      setSession: auth =>
        set({
          user: auth.user,
          accessToken: auth.tokens.access_token,
          refreshToken: auth.tokens.refresh_token,
          expiresIn: auth.tokens.expires_in,
        }),
      setTokens: tokens =>
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresIn: tokens.expires_in,
        }),
      setUser: user => set({user}),
      clearSession: () => set({...initialState}),
      setHasHydrated: value => set({hasHydrated: value}),
    }),
    {
      name: 'visioncart-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        expiresIn: state.expiresIn,
      }),
      onRehydrateStorage: () => state => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

export function isAuthenticated(): boolean {
  return Boolean(useAuthStore.getState().accessToken);
}
