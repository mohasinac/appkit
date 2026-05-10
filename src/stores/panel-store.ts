import { create } from "zustand";

interface PanelState {
  panelId: string | null;
  data: Record<string, unknown>;
  openPanel: (panelId: string, data?: Record<string, unknown>) => void;
  closePanel: () => void;
  isPanelOpen: (panelId: string) => boolean;
}

export const usePanelStore = create<PanelState>((set, get) => ({
  panelId: null,
  data: {},
  openPanel: (panelId, data = {}) => set({ panelId, data }),
  closePanel: () => set({ panelId: null, data: {} }),
  isPanelOpen: (panelId) => get().panelId === panelId,
}));
