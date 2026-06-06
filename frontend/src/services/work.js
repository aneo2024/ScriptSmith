import api from './api';

export const createWork = (data) =>
  api.post('/works', data).then((r) => r.data);

export const getWork = (id) =>
  api.get(`/works/${id}`).then((r) => r.data);

export const listWorks = () =>
  api.get('/works').then((r) => r.data);

export const updateWork = (id, data) =>
  api.put(`/works/${id}`, data).then((r) => r.data);

export const deleteWork = (id) =>
  api.delete(`/works/${id}`).then((r) => r.data);

export const getWorkCount = () =>
  api.get('/works/count').then((r) => r.data);

export const getWorkStats = () =>
  api.get('/works/stats').then((r) => r.data);

export const listWorkScripts = (workId) =>
  api.get(`/works/${workId}/scripts`).then((r) => r.data);

export const generateScriptSummary = (scriptId) =>
  api.post(`/scripts/${scriptId}/summary`, {}, { timeout: 60000 }).then((r) => r.data);

export const generateCharacterAppearances = (scriptId) =>
  api.post(`/scripts/${scriptId}/characters/appearance`, {}, { timeout: 60000 }).then((r) => r.data);

export const generateSceneEnvironments = (scriptId) =>
  api.post(`/scripts/${scriptId}/scenes/environment`, {}, { timeout: 60000 }).then((r) => r.data);

export const generateCharacterProfiles = (workId) =>
  api.post(`/works/${workId}/characters/profiles`, {}, { timeout: 60000 }).then((r) => r.data);