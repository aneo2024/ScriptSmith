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

// 响应拦截器：401 时自动跳转登录页
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // 避免在登录页重复跳转
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;

/** 提交小说文本，返回 { task_id, status, progress } */
export const convertNovel = (novelText, format, style) =>
  api.post('/convert', { novel_text: novelText, format, style }).then((r) => r.data);

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
