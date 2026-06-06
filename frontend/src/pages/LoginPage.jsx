import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, Typography, message } from 'antd';
import { useAuth } from '../hooks/useAuth';
import { register as registerApi } from '../services/auth';
import BubbleBackground from '../components/BubbleBackground';

const { Title } = Typography;

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      message.warning('请输入用户名和密码');
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
      message.success('登录成功');
      navigate('/', { replace: true });
    } catch (err) {
      message.error(err.response?.data?.error || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username.trim() || !password) {
      message.warning('请填写必填字段');
      return;
    }
    setLoading(true);
    try {
      await registerApi(username, password, email);
      message.success('注册成功，请登录');
      setMode('login');
      setPassword('');
      setEmail('');
    } catch (err) {
      message.error(err.response?.data?.error || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f0f0f0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <BubbleBackground />

      <div
        style={{
          width: 400,
          padding: 32,
          borderRadius: 16,
          background: '#fff',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>
            剧匠
          </Title>
        </div>

        <Input
          placeholder="用户名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          size="large"
          style={{ marginBottom: 16 }}
          onPressEnter={mode === 'login' ? handleLogin : undefined}
        />

        {mode === 'register' && (
          <Input
            placeholder="邮箱（选填）"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            size="large"
            style={{ marginBottom: 16 }}
          />
        )}

        <Input.Password
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          size="large"
          style={{ marginBottom: 24 }}
          onPressEnter={mode === 'login' ? handleLogin : handleRegister}
        />

        {mode === 'login' ? (
          <div style={{ display: 'flex', gap: 12 }}>
            <Button
              type="primary"
              size="large"
              loading={loading}
              onClick={handleLogin}
              style={{ flex: 1 }}
            >
              登录
            </Button>
            <Button size="large" onClick={() => setMode('register')} style={{ flex: 1 }}>
              注册
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Button
              type="primary"
              size="large"
              loading={loading}
              onClick={handleRegister}
              block
            >
              注册
            </Button>
            <Button type="link" onClick={() => setMode('login')}>
              已有账号？去登录
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
