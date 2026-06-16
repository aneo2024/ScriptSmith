import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { convertNovel, getTaskStatus, getScriptByTaskId, cancelTask } from '../services/api';
import { useRecentTasks } from './useRecentTasks';

const TaskContext = createContext(null);

const POLL_INTERVAL = 2000;
const LOCAL_TICK_INTERVAL = 800; // 本地平滑进度的更新频率
const LOCAL_STEP = 0.006;       // 每次 tick 给进度 + 0.6%（上限不会让显示超过 0.95）

export function TaskProvider({ children }) {
  const [phase, setPhase] = useState('idle');
  const [taskId, setTaskId] = useState(null);
  const [backendStatus, setBackendStatus] = useState(null);
  const [backendProgress, setBackendProgress] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);     // 前端展示用的平滑进度
  const [stage, setStage] = useState('');                         // current_stage
  const [elapsedMs, setElapsedMs] = useState(0);                  // 已经等待时间
  const [yaml, setYaml] = useState('');
  const [error, setError] = useState('');

  const pollingRef = useRef(null);
  const localTickRef = useRef(null);
  const submitAtRef = useRef(null);
  const { saveTask } = useRecentTasks();

  const clearPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (localTickRef.current) {
      clearInterval(localTickRef.current);
      localTickRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    // 如果有正在进行的任务，不允许 reset，以免切换页面时丢失进度
    if (phase === 'polling' || phase === 'submitting') {
      return;
    }
    clearPolling();
    setPhase('idle');
    setTaskId(null);
    setBackendStatus(null);
    setBackendProgress(0);
    setDisplayProgress(0);
    setStage('');
    setElapsedMs(0);
    setYaml('');
    setError('');
    submitAtRef.current = null;
  }, [phase, clearPolling]);

  const submit = useCallback(
    async (novelText, format, style, workId, providerId) => {
      if (phase !== 'idle' && phase !== 'completed' && phase !== 'failed') {
        return;
      }
      reset();
      setPhase('submitting');

      try {
        const result = await convertNovel(novelText, format, style, workId, providerId);
        setTaskId(result.task_id);
        setBackendStatus(result.status);
        setBackendProgress(result.progress || 0);
        setDisplayProgress(result.progress || 0);
        setStage(result.current_stage || '任务已提交');
        setPhase('polling');
        submitAtRef.current = Date.now();
        saveTask(result.task_id, result.status, '');
      } catch (err) {
        setError(err.response?.data?.error || err.message || '提交失败');
        setPhase('failed');
      }
    },
    [phase, reset, saveTask],
  );

  const cancel = useCallback(
    async () => {
      if (!taskId) return;
      try {
        await cancelTask(taskId);
        setError('用户取消');
        setStage('已被用户取消');
        setPhase('failed');
        clearPolling();
        saveTask(taskId, 'failed', '');
      } catch (err) {
        // 优先读后端包装后的 message，其次读 HTTP statusText，最后用通用 message
        const msg =
          err?.response?.data?.message ||
          (err?.response?.status ? `取消失败（${err.response.status}）` : null) ||
          err?.message ||
          '取消失败，请重试';
        setError(msg);
        setStage('取消失败');
        setPhase('failed');
        clearPolling();
      }
    },
    [taskId, clearPolling, saveTask],
  );

  // 持久化：到达 completed/failed 时保存到最近任务
  useEffect(() => {
    if ((phase === 'completed' || phase === 'failed') && taskId) {
      saveTask(taskId, phase === 'completed' ? 'completed' : 'failed', yaml);
    }
  }, [phase, taskId, yaml, saveTask]);

  // 轮询后端
  useEffect(() => {
    if (phase !== 'polling' || !taskId) return;

    const poll = async () => {
      try {
        const data = await getTaskStatus(taskId);
        setBackendStatus(data.status);
        setBackendProgress(data.progress ?? 0);
        if (data.current_stage) setStage(data.current_stage);
        if (data.error_msg) setError(data.error_msg);

        if (data.status === 'completed') {
          clearPolling();
          try {
            const structuredScript = await getScriptByTaskId(taskId);
            setYaml(structuredScript ? JSON.stringify(structuredScript).slice(0, 1) : 'ok');
            setDisplayProgress(1.0);
            setPhase('completed');
          } catch (err) {
            setError(err.response?.data?.error || err.message || '获取剧本失败');
            setPhase('failed');
          }
        } else if (data.status === 'failed') {
          clearPolling();
          setPhase('failed');
        }
      } catch (err) {
        console.warn('轮询失败，继续重试:', err.message);
      }
    };

    // 如果定时器已存在（页面切换后重新挂载），不重复创建
    if (!pollingRef.current) {
      poll();
      pollingRef.current = setInterval(poll, POLL_INTERVAL);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [phase, taskId, clearPolling]);

  // 本地平滑进度 + 计时：在 polling 期间，给 displayProgress 做缓动，并更新 elapsedMs
  useEffect(() => {
    if (phase !== 'polling') return;

    localTickRef.current = setInterval(() => {
      if (submitAtRef.current) {
        setElapsedMs(Date.now() - submitAtRef.current);
      }
      setDisplayProgress((prev) => {
        // 目标值：backendProgress；但如果停在 0.35 不动，就做"微蠕动"
        const target = backendProgress;
        if (prev >= 1.0) return prev;

        // 如果后端已经更新到 >= target，且我们落后了，就缓动追上
        if (target > prev) {
          return prev + (target - prev) * 0.35;
        }
        // 否则做一点点蠕动，但不超过 target+0.05 且不超过 0.95
        const ceiling = Math.min(target + 0.05, 0.95);
        if (prev >= ceiling) return prev;
        return Math.min(prev + LOCAL_STEP, ceiling);
      });
    }, LOCAL_TICK_INTERVAL);

    return () => {
      if (localTickRef.current) {
        clearInterval(localTickRef.current);
        localTickRef.current = null;
      }
    };
  }, [phase, backendProgress]);

  const value = {
    taskId,
    status: backendStatus || phase,
    progress: displayProgress,
    backendProgress,
    stage,
    elapsedMs,
    yaml,
    error,
    isActive: phase === 'submitting' || phase === 'polling',
    submit,
    cancel,
    reset,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export const useTask = () => {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTask must be used within <TaskProvider>');
  return ctx;
};
