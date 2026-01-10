import { create } from "zustand";

export enum NavigationTab {
    Test = "test",
    Comparison = "comparison",
    Presenter = "presenter"
}

interface NavigationStore {
    activeNavigationTab: NavigationTab;
    setNavigationTab: (tab: NavigationTab) => void;
}

export const useNavigationStore = create<NavigationStore>((set) => ({
    activeNavigationTab: NavigationTab.Test,
    setNavigationTab: (tab) => set({ activeNavigationTab: tab }),
}));