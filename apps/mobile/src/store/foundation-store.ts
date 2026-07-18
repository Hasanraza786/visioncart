import {create} from 'zustand';

type FoundationState = {
  hasCompletedBoot: boolean;
  completeBoot: () => void;
  reset: () => void;
};

const initialState = {
  hasCompletedBoot: false,
} as const;

export const useFoundationStore = create<FoundationState>(set => ({
  ...initialState,
  completeBoot: () => set({hasCompletedBoot: true}),
  reset: () => set(initialState),
}));
