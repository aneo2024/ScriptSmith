import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, Typography, message } from 'antd';
import { useAuth } from '../hooks/useAuth';
import { register as registerApi } from '../services/auth';
import ForestLightParticles from '../components/ForestLightParticles';

const { Title } = Typography;

const FOREST_URL = '/forest.jpg';

// ========== 色彩体系 ==========
const COLORS = {
  title: '#2d5016',
  text: '#5a6b4a',
  subtle: '#8a9a7a',
  cardBg: 'rgba(255,255,252,0.72)',
  cardBorder: 'rgba(255,255,255,0.5)',
  primaryBtn: '#3a6b28',
  primaryHover: '#2d5016',
  secondaryBtn: 'rgba(255,255,255,0.55)',
};

/* ========== 登录表单子组件 ========== */
function LoginForm({ onClose, onSuccess }) {
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      message.warning('请输入用户名和密码');
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
      message.success('登录成功');
      onSuccess();
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
    <>
      {/* 半透明遮罩层 */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 5,
          background: 'rgba(0,0,0,0.15)',
        }}
      />

      {/* 登录卡片 */}
      <div
        style={{
          width: 400,
          padding: 32,
          borderRadius: 16,
          background: COLORS.cardBg,
          boxShadow: `0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px ${COLORS.cardBorder}`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 6,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Title
            level={3}
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              color: COLORS.title,
              letterSpacing: 4,
            }}
          >
            欢迎回来
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
              size="large"
              loading={loading}
              onClick={handleLogin}
              style={{
                flex: 1,
                background: COLORS.primaryBtn,
                borderColor: COLORS.primaryBtn,
                color: '#fff',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                e.target.style.background = COLORS.primaryHover;
                e.target.style.borderColor = COLORS.primaryHover;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = COLORS.primaryBtn;
                e.target.style.borderColor = COLORS.primaryBtn;
              }}
            >
              登录
            </Button>
            <Button
              size="large"
              onClick={() => setMode('register')}
              style={{
                flex: 1,
                background: COLORS.secondaryBtn,
                borderColor: COLORS.cardBorder,
                color: COLORS.text,
              }}
            >
              注册
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Button
              size="large"
              loading={loading}
              onClick={handleRegister}
              block
              style={{
                background: COLORS.primaryBtn,
                borderColor: COLORS.primaryBtn,
                color: '#fff',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                e.target.style.background = COLORS.primaryHover;
                e.target.style.borderColor = COLORS.primaryHover;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = COLORS.primaryBtn;
                e.target.style.borderColor = COLORS.primaryBtn;
              }}
            >
              注册
            </Button>
            <Button
              type="link"
              onClick={() => setMode('login')}
              style={{ color: COLORS.text }}
            >
              已有账号？去登录
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

/* ========== 开屏主页 ========== */
export default function LoginPage() {
  const [showLogin, setShowLogin] = useState(false);
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const handleStart = () => {
    if (isLoggedIn) {
      navigate('/works', { replace: true });
    } else {
      setShowLogin(true);
    }
  };

  const handleLoginSuccess = () => {
    navigate('/works', { replace: true });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      {/* 第 1 层：森林背景 */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          backgroundImage: `url(${FOREST_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          backgroundColor: '#d5dcd0',
          filter: 'brightness(1.05) saturate(0.6)',
        }}
      />

      {/* 第 2 层：白色遮罩 */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          background: `linear-gradient(
            to bottom,
            rgba(255,255,255,0.55) 0%,
            rgba(255,255,255,0.25) 40%,
            rgba(255,255,255,0.08) 70%,
            rgba(255,255,255,0) 100%
          )`,
        }}
      />

      {/* 第 3 层：光尘 */}
      <ForestLightParticles />

      {/* 第 4 层：左下角装饰 */}
      <img
        src="/loginpage.png"
        alt=""
        style={{
          position: 'fixed',
          left: 24,
          bottom: 24,
          width: 260,
          zIndex: 2,
          pointerEvents: 'none',
          opacity: 0.7,
        }}
      />

      {/* 第 5 层：开屏内容 */}
      <div
        style={{
          position: 'relative',
          zIndex: 4,
          textAlign: 'center',
        }}
      >
        <Title
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: COLORS.title,
            letterSpacing: 12,
            marginBottom: 8,
            textShadow: '0 2px 12px rgba(0,0,0,0.08)',
          }}
        >
          剧匠
        </Title>

        <div
          style={{
            fontSize: 16,
            color: COLORS.text,
            letterSpacing: 1,
            marginBottom: 48,
            fontStyle: 'italic',
          }}
        >
          The writer&apos;s vocation is to make the unknown known
        </div>

        <Button
          size="large"
          onClick={handleStart}
          style={{
            padding: '0 48px',
            height: 48,
            fontSize: 18,
            fontWeight: 600,
            background: COLORS.primaryBtn,
            borderColor: COLORS.primaryBtn,
            color: '#fff',
            borderRadius: 24,
            letterSpacing: 4,
            boxShadow: '0 4px 16px rgba(45,80,22,0.3)',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = COLORS.primaryHover;
            e.target.style.borderColor = COLORS.primaryHover;
          }}
          onMouseLeave={(e) => {
            e.target.style.background = COLORS.primaryBtn;
            e.target.style.borderColor = COLORS.primaryBtn;
          }}
        >
          开始创作
        </Button>
      </div>

      {/* 第 6 层：登录弹窗 */}
      {showLogin && (
        <LoginForm
          onClose={() => setShowLogin(false)}
          onSuccess={handleLoginSuccess}
        />
      )}
    </div>
  );
}
