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

// 响应拦截器：
//   成功 -> 自动解开 { success, code, message, data } 包装，把 response.data 替换为 payload
//   失败 -> 从包装里读 message；401 触发静默刷新
//   例外 -> responseType 为 blob 或 text（如 yaml 导出）时，原样返回，不尝试 JSON 解包
api.interceptors.response.use(
  (response) => {
    const rt = response.config?.responseType;
    if (rt === 'blob' || rt === 'text' || rt === 'arraybuffer') {
      return response;
    }

    const wrapped = response.data;
    if (
      wrapped &&
      typeof wrapped === 'object' &&
      'success' in wrapped &&
      'data' in wrapped
    ) {
      response.data = wrapped.data;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 尝试从响应包装里读取更友好的错误消息
    const wrapped = error.response?.data;
    if (wrapped && typeof wrapped === 'object' && wrapped.message) {
      error.message = wrapped.message;
    }

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = api
        .post('/auth/refresh', { refresh_token: refreshToken })
        .then((r) => {
          // 此时 r.data 已由成功拦截器解包 -> { token, refresh_token, user_id, username, role }
          const d = r.data;
          localStorage.setItem('token', d.token);
          localStorage.setItem('refresh_token', d.refresh_token);
          if (d.user_id) {
            localStorage.setItem('user', JSON.stringify({
              user_id: d.user_id,
              username: d.username,
              role: d.role,
            }));
          }
          isRefreshing = false;
          return d.token;
        })
        .catch(() => {
          isRefreshing = false;
          clearAuthAndRedirect();
          return null;
        });
    }

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

// ============ 接口方法 ============

export const convertNovel = (novelText, format, style, workId, providerId) =>
  api.post('/convert', {
    novel_text: novelText,
    format,
    style,
    work_id: workId,
    provider_id: providerId,
  }).then((r) => r.data);

export const getTaskStatus = (taskId) =>
  api.get(`/task/${taskId}`).then((r) => r.data);

export const cancelTask = (taskId) =>
  api.delete(`/task/${taskId}`).then((r) => r.data);

export const getScript = (taskId) =>
  api.get(`/script/${taskId}`).then((r) => r.data);

export const getStructuredScript = (scriptId) =>
  api.get(`/scripts/${scriptId}`).then((r) => r.data);

export const getScriptByTaskId = (taskId) =>
  api.get(`/scripts/by-task/${taskId}`).then((r) => r.data);

export const exportScriptYAML = (scriptId) =>
  api.get(`/scripts/${scriptId}/yaml`, { responseType: 'blob' }).then((r) => r.data);

export const updateContent = (scriptId, contentId, data) =>
  api.put(`/scripts/${scriptId}/contents/${contentId}`, data).then((r) => r.data);

export const updateScene = (scriptId, sceneId, data) =>
  api.put(`/scripts/${scriptId}/scenes/${sceneId}`, data).then((r) => r.data);

// ============ AI Provider 管理 ============

export const listProviders = () =>
  api.get('/ai/providers').then((r) => r.data);

export const createProvider = (config) =>
  api.post('/ai/providers', config).then((r) => r.data);

export const updateProvider = (id, config) =>
  api.put(`/ai/providers/${id}`, config).then((r) => r.data);

export const deleteProvider = (id) =>
  api.delete(`/ai/providers/${id}`).then((r) => r.data);

export const setDefaultProvider = (id) =>
  api.put(`/ai/providers/${id}/default`).then((r) => r.data);

export const testProvider = (id) =>
  api.post(`/ai/providers/${id}/test`).then((r) => r.data);
