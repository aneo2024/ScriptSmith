import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEYS = {
  novelText: 'scriptsmith_novel_text',
  yamlContent: 'scriptsmith_yaml_content',
  settings: 'scriptsmith_settings',
  editorTab: 'scriptsmith_editor_tab',
};

const DEFAULT_SETTINGS = {
  format: '电影',
  episodes: 1,
  style: '保留原著风格',
};

export const loadSettings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings) => {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
};

export function useLocalStorage(key, initialValue, debounceMs = 300) {
  const storageKey = STORAGE_KEYS[key] || key;
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === null) return initialValue;
      if (key === 'settings') return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      return stored;
    } catch {
      return initialValue;
    }
  });

  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const toStore =
        key === 'settings' ? JSON.stringify(value) : String(value ?? '');
      localStorage.setItem(storageKey, toStore);
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, storageKey, key, debounceMs]);

  const setStoredValue = useCallback((next) => {
    setValue((prev) => (typeof next === 'function' ? next(prev) : next));
  }, []);

  return [value, setStoredValue];
}

export { STORAGE_KEYS, DEFAULT_SETTINGS };
