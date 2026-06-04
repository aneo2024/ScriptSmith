import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { convertNovel, getTaskStatus, getScript } from '../services/api';
import { useRecentTasks } from './useRecentTasks';

const TaskContext = createContext(null);

const POLL_INTERVAL = 2000;

export function TaskProvider({ children }) {
  const [phase, setPhase] = useState('idle');
  const [taskId, setTaskId] = useState(null);
  const [backendStatus, setBackendStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [yaml, setYaml] = useState('');
  const [error, setError] = useState('');
  const pollingRef = useRef(null);
  const { saveTask } = useRecentTasks();

  const clearPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearPolling();
    setPhase('idle');
    setTaskId(null);
    setBackendStatus(null);
    setProgress(0);
    setYaml('');
    setError('');
  }, [clearPolling]);

  const submit = useCallback(
    async (novelText, format, style) => {
      if (phase !== 'idle' && phase !== 'completed' && phase !== 'failed') {
        return;
      }
      reset();
      setPhase('submitting');

      try {
        const result = await convertNovel(novelText, format, style);
        setTaskId(result.task_id);
        setBackendStatus(result.status);
        setProgress(result.progress);
        setPhase('polling');
        saveTask(result.task_id, result.status, '');
      } catch (err) {
        setError(err.response?.data?.error || err.message || '提交失败');
        setPhase('failed');
      }
    },
    [phase, reset, saveTask],
  );

  // Persist to localStorage when task reaches terminal state
  useEffect(() => {
    if ((phase === 'completed' || phase === 'failed') && taskId) {
      saveTask(taskId, phase === 'completed' ? 'completed' : 'failed', yaml);
    }
  }, [phase, taskId, yaml, saveTask]);

  // Start polling when phase becomes 'polling'
  useEffect(() => {
    if (phase !== 'polling' || !taskId) return;

    const poll = async () => {
      try {
        const data = await getTaskStatus(taskId);
        setBackendStatus(data.status);
        setProgress(data.progress);

        if (data.status === 'completed') {
          clearPolling();
          try {
            const script = await getScript(taskId);
            setYaml(script);
            setPhase('completed');
          } catch (err) {
            setError(err.response?.data?.error || err.message || '获取剧本失败');
            setPhase('failed');
          }
        } else if (data.status === 'failed') {
          clearPolling();
          setError(data.error_msg || '转换失败');
          setPhase('failed');
        }
      } catch (err) {
        console.warn('轮询失败，继续重试:', err.message);
      }
    };

    poll();
    pollingRef.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      clearPolling();
    };
  }, [phase, taskId, clearPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearPolling();
  }, [clearPolling]);

  const value = {
    taskId,
    status: backendStatus || phase,
    progress,
    yaml,
    error,
    isActive: phase === 'submitting' || phase === 'polling',
    submit,
    reset,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export const useTask = () => {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTask must be used within <TaskProvider>');
  return ctx;
};
