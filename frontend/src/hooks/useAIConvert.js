import { useState, useCallback } from 'react';
import { convertNovelToScript } from '../services/aiService';

export function useAIConvert() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const convert = useCallback(async (novelText, config) => {
    setLoading(true);
    setError(null);
    try {
      const yaml = await convertNovelToScript(novelText, config);
      return yaml;
    } catch (err) {
      const message = err.response?.data?.error || err.message || '转换失败';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, convert };
}
