import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as loginApi, refresh as refreshApi, me as meApi, logoutLocal, revokeRefreshToken } from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const isLoggedIn = !loading && !!token && !!user;

  // 初始化：验证 token 是否有效，无效则尝试 refresh
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setLoading(false);
      return;
    }

    // 先尝试 /auth/me 验证当前 token
    meApi()
      .then((data) => {
        setUser(data);
        setToken(storedToken);
      })
      .catch(async () => {
        // token 过期，尝试用 refresh_token 刷新
        const rt = localStorage.getItem('refresh_token');
        if (rt) {
          try {
            const data = await refreshApi(rt);
            localStorage.setItem('token', data.token);
            localStorage.setItem('refresh_token', data.refresh_token);
            localStorage.setItem('user', JSON.stringify({
              user_id: data.user_id,
              username: data.username,
              role: data.role,
            }));
            setToken(data.token);
            setUser({ user_id: data.user_id, username: data.username, role: data.role });
          } catch {
            logoutLocal();
            setUser(null);
            setToken(null);
          }
        } else {
          logoutLocal();
          setUser(null);
          setToken(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    try {
      const data = await loginApi(username, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('refresh_token', data.refresh_token);
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
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    await revokeRefreshToken();
    logoutLocal();
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
