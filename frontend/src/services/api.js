import axios from 'axios';

const api = axios.create({
  baseURL: '/v1',
  timeout: 10000,
});

/** 提交小说文本，返回 { task_id, status, progress } */
export const convertNovel = (novelText, format, style) =>
  api.post('/convert', { novel_text: novelText, format, style }).then((r) => r.data);

/** 查询任务状态，返回 { id, status, progress, format, style, created_at, updated_at, error_msg } */
export const getTaskStatus = (taskId) =>
  api.get(`/task/${taskId}`).then((r) => r.data);

/** 获取转换完成的 YAML 剧本（纯文本） */
export const getScript = (taskId) =>
  api.get(`/script/${taskId}`).then((r) => r.data);
