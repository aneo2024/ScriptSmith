import { create } from 'zustand';
import api from '../services/api';

const useScriptStore = create((set, get) => ({
  script: null,
  selectedSceneId: null,
  selectedContentId: null,
  isLoading: false,

  loadScript: async (scriptId) => {
    if (!scriptId) return;
    set({ isLoading: true });
    try {
      const data = await api.get(`/scripts/${scriptId}`).then((r) => r.data);
      set({
        script: data,
        selectedSceneId: null,
        selectedContentId: null,
        isLoading: false,
      });
    } catch (err) {
      console.error('加载剧本失败:', err);
      set({ isLoading: false });
    }
  },

  selectScene: (sceneId) => {
    set({ selectedSceneId: sceneId, selectedContentId: null });
  },

  selectContent: (contentId) => {
    set({ selectedContentId: contentId });
  },
}));

export default useScriptStore;
