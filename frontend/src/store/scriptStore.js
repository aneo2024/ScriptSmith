import { create } from 'zustand';
import api from '../services/api';

const useScriptStore = create((set, get) => ({
  script: null,
  selectedSceneId: null,
  selectedContentId: null,
  isLoading: false,
  error: null,

  loadScript: async (scriptId) => {
    if (!scriptId) return;
    set({ isLoading: true, error: null });
    try {
      const data = await api.get(`/scripts/${scriptId}`).then((r) => r.data);
      set({
        script: data,
        selectedSceneId: null,
        selectedContentId: null,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('加载剧本失败:', err);
      set({ isLoading: false, error: err.response?.data?.error || err.message });
    }
  },

  selectScene: (sceneId) => {
    set({ selectedSceneId: sceneId, selectedContentId: null });
  },

  selectContent: (contentId) => {
    set({ selectedContentId: contentId });
  },

  setScript: (script) => {
    set({
      script,
      selectedSceneId: null,
      selectedContentId: null,
      isLoading: false,
      error: null,
    });
  },

  // 本地乐观更新场景字段（后续再调 API 保存）
  updateScene: (sceneID, data) => {
    set((state) => {
      if (!state.script?.scenes) return state;
      return {
        script: {
          ...state.script,
          scenes: state.script.scenes.map((s) =>
            s.id === sceneID ? { ...s, ...data } : s
          ),
        },
      };
    });
  },

  // 本地乐观更新内容块（后续再调 API 保存）
  updateContent: (sceneID, contentID, data) => {
    set((state) => {
      if (!state.script?.scenes) return state;
      return {
        script: {
          ...state.script,
          scenes: state.script.scenes.map((s) =>
            s.id === sceneID
              ? {
                  ...s,
                  content: (s.content || []).map((c) =>
                    c.id === contentID ? { ...c, ...data } : c
                  ),
                }
              : s
          ),
        },
      };
    });
  },

  // 乐观新增内容块：临时 ID 用于 UI 渲染，API 返回后会被真实 ID 替换
  addContent: (sceneID, content) => {
    set((state) => {
      if (!state.script?.scenes) return state;
      return {
        script: {
          ...state.script,
          scenes: state.script.scenes.map((s) =>
            s.id === sceneID
              ? { ...s, content: [...(s.content || []), content] }
              : s
          ),
        },
      };
    });
  },

  // 乐观删除内容块
  deleteContent: (sceneID, contentID) => {
    set((state) => {
      if (!state.script?.scenes) return state;
      return {
        script: {
          ...state.script,
          scenes: state.script.scenes.map((s) =>
            s.id === sceneID
              ? { ...s, content: (s.content || []).filter((c) => c.id !== contentID) }
              : s
          ),
        },
      };
    });
  },
}));

export default useScriptStore;
