import { create } from 'zustand';

// Proyecto activo (solo el id; los datos vienen de useProjects). Persiste en
// localStorage para recordar la seleccion entre sesiones.

const KEY = 'enjambre.activeProject';

interface ProjectState {
  activeId: string | null;
  setActive: (id: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  activeId: localStorage.getItem(KEY),
  setActive: (id) => {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
    set({ activeId: id });
  },
}));
