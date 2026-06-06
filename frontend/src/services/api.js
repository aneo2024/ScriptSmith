import axios from 'axios';

const api = axios.create({
  baseURL: '/v1',
  timeout: 10000,
});

// 请求拦截器：自动添加 Authorization header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 防止多个 401 同时触发重复刷新
let isRefreshing = false;
let refreshPromise = null;

function clearAuthAndRedirect() {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

// 响应拦截器：401 时自动静默刷新 token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      // 不是 401 或已经重试过，直接失败
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    // 防止并发刷新
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = axios
        .post('/v1/auth/refresh', { refresh_token: refreshToken })
        .then((res) => {
          const data = res.data;
          localStorage.setItem('token', data.token);
          localStorage.setItem('refresh_token', data.refresh_token);
          if (data.user_id) {
            localStorage.setItem('user', JSON.stringify({
              user_id: data.user_id,
              username: data.username,
              role: data.role,
            }));
          }
          isRefreshing = false;
          return data.token;
        })
        .catch(() => {
          isRefreshing = false;
          clearAuthAndRedirect();
          return null;
        });
    }

    // 等待刷新完成，然后用新 token 重试原请求
    const newToken = await refreshPromise;
    if (!newToken) {
      return Promise.reject(error);
    }

    originalRequest.headers.Authorization = `Bearer ${newToken}`;
    originalRequest._retry = true;
    return api(originalRequest);
  },
);

export default api;

/** 提交小说文本，返回 { task_id, status, progress } */
export const convertNovel = (novelText, format, style, workId) =>
  api.post('/convert', { novel_text: novelText, format, style, work_id: workId }).then((r) => r.data);

/** 查询任务状态，返回 { id, status, progress, format, style, created_at, updated_at, error_msg } */
export const getTaskStatus = (taskId) =>
  api.get(`/task/${taskId}`).then((r) => r.data);

/** 获取转换完成的 YAML 剧本（纯文本） */
export const getScript = (taskId) =>
  api.get(`/script/${taskId}`).then((r) => r.data);

/** 获取结构化剧本（按 scriptId） */
export const getStructuredScript = (scriptId) =>
  api.get(`/scripts/${scriptId}`).then((r) => r.data);

/** 按 taskId 获取关联的结构化剧本 */
export const getScriptByTaskId = (taskId) =>
  api.get(`/scripts/by-task/${taskId}`).then((r) => r.data);

/** 导出剧本 YAML（返回文本，触发下载） */
export const exportScriptYAML = (scriptId) =>
  api.get(`/scripts/${scriptId}/yaml`, { responseType: 'blob' }).then((r) => r.data);

/** 更新指定内容块 */
export const updateContent = (scriptId, contentId, data) =>
  api.put(`/scripts/${scriptId}/contents/${contentId}`, data).then((r) => r.data);

/** 更新指定场景 */
export const updateScene = (scriptId, sceneId, data) =>
  api.put(`/scripts/${scriptId}/scenes/${sceneId}`, data).then((r) => r.data);
