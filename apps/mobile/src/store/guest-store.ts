import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';

type GuestState = {
  guestKey: string | null;
  hasHydrated: boolean;
  setGuestKey: (guestKey: string) => void;
  clearGuest: () => void;
  setHasHydrated: (value: boolean) => void;
};

export const useGuestStore = create<GuestState>()(
  persist(
    set => ({
      guestKey: null,
      hasHydrated: false,
      setGuestKey: guestKey => set({guestKey}),
      clearGuest: () => set({guestKey: null}),
      setHasHydrated: value => set({hasHydrated: value}),
    }),
    {
      name: 'visioncart-guest',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        guestKey: state.guestKey,
      }),
      onRehydrateStorage: () => state => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

export function getGuestKey(): string | null {
  return useGuestStore.getState().guestKey;
}
