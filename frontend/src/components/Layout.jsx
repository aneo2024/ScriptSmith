import { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Divider, Button, Space, Card, message } from 'antd';
import {
  FileTextOutlined,
  EditOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  PlusOutlined,
  BookOutlined,
  UserOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import RecentTasks from './RecentTasks';
import { useAuth } from '../hooks/useAuth';
import { getWorkCount } from '../services/work';

const { Sider, Content, Header } = Layout;
const { Title, Text } = Typography;

const menuItems = [
  { key: '/works', icon: <BookOutlined />, label: '作品列表' },
  { key: '/', icon: <FileTextOutlined />, label: '小说输入' },
  { key: '/editor', icon: <EditOutlined />, label: '剧本工作台' },
  { key: '/characters', icon: <TeamOutlined />, label: '角色管理' },
  { key: '/scenes', icon: <UnorderedListOutlined />, label: '场景列表' },
];

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [workCount, setWorkCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const selectedKey = menuItems.some((m) => m.key === location.pathname)
    ? location.pathname
    : '/';

  useEffect(() => {
    fetchWorkCount();
  }, []);

  const fetchWorkCount = async () => {
    try {
      const result = await getWorkCount();
      setWorkCount(result.count || 0);
    } catch (err) {
      message.error('获取作品统计失败');
    }
  };

  const handleMenuClick = ({ key }) => navigate(key);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleCreateWork = () => {
    navigate('/create-work');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={220}
        theme="dark"
      >
        <div style={{ padding: '16px 20px', height: 64 }}>
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            {collapsed ? '剧' : '剧匠'}
          </Title>
          {!collapsed && (
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
              ScriptSmith
            </Text>
          )}
        </div>
        {!collapsed && (
          <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1890ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <UserOutlined style={{ fontSize: 24, color: '#fff' }} />
              </div>
              <Text style={{ color: '#fff', fontWeight: 500 }}>{user?.username}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ textAlign: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>{workCount}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>作品数</Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>-</Text>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>字数</Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>-</Text>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>访客</Text>
              </div>
            </div>
          </div>
        )}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
        />
        {!collapsed && <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />}
        {!collapsed && (
          <div style={{ padding: '0 16px' }}>
            <Button
              type="primary"
              block
              icon={<PlusOutlined />}
              onClick={handleCreateWork}
              style={{ marginBottom: 16 }}
            >
              创作新作品
            </Button>
          </div>
        )}
        <RecentTasks collapsed={collapsed} />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Space>
            <span
              onClick={() => setCollapsed(!collapsed)}
              style={{ cursor: 'pointer', fontSize: 18 }}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </span>
            <Text strong style={{ fontSize: 16 }}>
              剧匠 ScriptSmith
            </Text>
          </Space>
          {user && (
            <Space>
              <Text type="secondary">{user.username}</Text>
              <Button
                type="text"
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                size="small"
              >
                退出
              </Button>
            </Space>
          )}
        </Header>
        <Content
          style={{
            padding: 24,
            background: '#f5f5f5',
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
