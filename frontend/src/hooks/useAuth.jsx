import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as loginApi, me as meApi, logout as doLogout } from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const isLoggedIn = !!token && !!user;

  // 初始化：验证 token 是否有效
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setLoading(false);
      return;
    }
    meApi()
      .then((data) => {
        setUser(data);
        setToken(storedToken);
      })
      .catch(() => {
        doLogout();
        setUser(null);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    try {
      const data = await loginApi(username, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({
        user_id: data.user_id,
        username: data.username,
        role: data.role,
      }));
      setToken(data.token);
      setUser({
        user_id: data.user_id,
        username: data.username,
        role: data.role,
      });
    } catch (error) {
      // 重新抛出，由调用方（LoginPage）处理 UI 提示
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    doLogout();
    setUser(null);
    setToken(null);
  }, []);

  const value = { user, token, isLoggedIn, loading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};
