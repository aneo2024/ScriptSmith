import { useState } from 'react';
import { Layout, Menu, Typography, Divider, Button, Space } from 'antd';
import {
  FileTextOutlined,
  EditOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import RecentTasks from './RecentTasks';
import { useAuth } from '../hooks/useAuth';

const { Sider, Content, Header } = Layout;
const { Title, Text } = Typography;

const menuItems = [
  { key: '/', icon: <FileTextOutlined />, label: '小说输入' },
  { key: '/editor', icon: <EditOutlined />, label: '剧本工作台' },
  { key: '/characters', icon: <TeamOutlined />, label: '角色管理' },
  { key: '/scenes', icon: <UnorderedListOutlined />, label: '场景列表' },
];

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const selectedKey = menuItems.some((m) => m.key === location.pathname)
    ? location.pathname
    : '/';

  const handleMenuClick = ({ key }) => navigate(key);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
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
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
        />
        {!collapsed && <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />}
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
