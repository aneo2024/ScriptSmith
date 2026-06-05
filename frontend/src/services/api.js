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
