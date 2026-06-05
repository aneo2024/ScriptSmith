import api from './api';

// 文章
export const createArticle = (data) =>
  api.post('/inspiration/articles', data).then((r) => r.data);

export const getArticle = (id) =>
  api.get(`/inspiration/articles/${id}`).then((r) => r.data);

export const listArticles = (params = {}) =>
  api.get('/inspiration/articles', { params }).then((r) => r.data);

export const likeArticle = (id) =>
  api.post(`/inspiration/articles/${id}/like`).then((r) => r.data);

// AI 生成文章
export const generateArticle = (topic) =>
  api.post('/inspiration/generate', { topic }).then((r) => r.data);

// 话题
export const createTopic = (data) =>
  api.post('/inspiration/topics', data).then((r) => r.data);

export const listTopics = (params = {}) =>
  api.get('/inspiration/topics', { params }).then((r) => r.data);

export const listTodayTopics = () =>
  api.get('/inspiration/topics/today').then((r) => r.data);
