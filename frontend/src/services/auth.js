import api from './api';

export const register = (username, password, email) =>
  api.post('/auth/register', { username, password, email }).then((r) => r.data);

export const login = (username, password) =>
  api.post('/auth/login', { username, password }).then((r) => r.data);

export const me = () =>
  api.get('/auth/me').then((r) => r.data);

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};
