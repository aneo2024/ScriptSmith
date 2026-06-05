import { Layout, Typography, Space, Button } from 'antd';
import { BookOutlined, PlusOutlined, LogoutOutlined, HomeOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const { Header, Content } = Layout;
const { Text } = Typography;

const COLORS = {
  primary: '#3a6b28',
  primaryHover: '#2d5016',
  headerBg: '#f5f8f3',
  contentBg: '#f5f8f3',
};

export default function AppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const isActive = (path) => location.pathname === path;

  const navBtnStyle = (path) => ({
    background: isActive(path) ? COLORS.primary : 'rgba(58,107,40,0.1)',
    borderColor: isActive(path) ? COLORS.primary : 'rgba(58,107,40,0.2)',
    color: isActive(path) ? '#fff' : COLORS.primary,
    fontWeight: isActive(path) ? 600 : 400,
  });

  return (
    <Layout style={{ minHeight: '100vh', background: COLORS.contentBg }}>
      {/* 顶部导航栏 */}
      <Header
        style={{
          background: '#fff',
          padding: '0 32px',
          borderBottom: '1px solid rgba(58,107,40,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 56,
          lineHeight: '56px',
          boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
        }}
      >
        {/* 左侧：Logo + 导航按钮 */}
        <Space size={16}>
          <Text
            strong
            style={{
              fontSize: 18,
              color: COLORS.primary,
              cursor: 'pointer',
              letterSpacing: 2,
              fontFamily: '"Georgia", "Noto Serif SC", serif',
            }}
            onClick={() => navigate('/')}
          >
            剧匠
          </Text>

          <Button
            icon={<HomeOutlined />}
            size="middle"
            onClick={() => navigate('/')}
            style={navBtnStyle('/')}
          >
            首页
          </Button>

          <Button
            icon={<BookOutlined />}
            size="middle"
            onClick={() => navigate('/works')}
            style={navBtnStyle('/works')}
          >
            作品列表
          </Button>

          <Button
            icon={<PlusOutlined />}
            size="middle"
            onClick={() => navigate('/create-work')}
            style={navBtnStyle('/create-work')}
          >
            创作新作品
          </Button>
        </Space>

        {/* 右侧：用户信息 + 退出 */}
        {user && (
          <Space size={12}>
            <Text style={{ color: '#7a9a6a', fontSize: 13 }}>{user.username}</Text>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              size="small"
              style={{ color: '#7a9a6a' }}
            >
              退出
            </Button>
          </Space>
        )}
      </Header>

      {/* 内容区 */}
      <Content
        style={{
          padding: 24,
          background: COLORS.contentBg,
          minHeight: 'calc(100vh - 56px)',
        }}
      >
        {children}
      </Content>
    </Layout>
  );
}
