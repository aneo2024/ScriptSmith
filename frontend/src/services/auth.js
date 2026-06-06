import api from './api';

export const register = (username, password, email) =>
  api.post('/auth/register', { username, password, email }).then((r) => r.data);

export const login = (username, password) =>
  api.post('/auth/login', { username, password }).then((r) => r.data);

export const refresh = (refreshToken) =>
  api.post('/auth/refresh', { refresh_token: refreshToken }).then((r) => r.data);

export const me = () =>
  api.get('/auth/me').then((r) => r.data);

export const logoutLocal = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
};

export const revokeRefreshToken = async () => {
  const rt = localStorage.getItem('refresh_token');
  if (rt) {
    try {
      await api.post('/auth/logout', { refresh_token: rt });
    } catch {
      // 忽略错误
    }
  }
};
