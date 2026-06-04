import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'scriptsmith_recent_tasks';

export function useRecentTasks() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTasks(JSON.parse(raw));
    } catch {
      setTasks([]);
    }
  }, []);

  const persist = useCallback((updated) => {
    setTasks(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 20)));
  }, []);

  const saveTask = useCallback(
    (taskId, status, yaml) => {
      setTasks((prev) => {
        const existing = prev.findIndex((t) => t.taskId === taskId);
        const entry = { taskId, status, yaml, updatedAt: Date.now() };
        const updated =
          existing >= 0
            ? [entry, ...prev.filter((_, i) => i !== existing)]
            : [entry, ...prev];
        persist(updated);
        return updated;
      });
    },
    [persist],
  );

  const removeTask = useCallback(
    (taskId) => {
      setTasks((prev) => {
        const updated = prev.filter((t) => t.taskId !== taskId);
        persist(updated);
        return updated;
      });
    },
    [persist],
  );

  const clearAll = useCallback(() => {
    persist([]);
  }, [persist]);

  return { tasks, saveTask, removeTask, clearAll };
}

/** 保存编辑器当前内容到 localStorage */
const EDITOR_KEY = 'scriptsmith_editor_draft';

export function saveEditorDraft(yaml) {
  try {
    localStorage.setItem(EDITOR_KEY, yaml);
  } catch { /* ignore */ }
}

export function loadEditorDraft() {
  try {
    return localStorage.getItem(EDITOR_KEY) || '';
  } catch {
    return '';
  }
}
