import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  List,
  Button,
  Typography,
  Spin,
  Empty,
  App,
  Tag,
  Space,
  Tooltip,
  Avatar,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  BookOutlined,
  UserOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { listWorks, deleteWork } from '../services/work';
import { getFormatShortLabel, getFormatColor } from '../utils/scriptOptions';

const { Title, Text, Paragraph } = Typography;

const formatWordCount = (n) => {
  if (!n) return '0';
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  return n.toLocaleString();
};

export default function WorkListPage() {
  const { modal, message } = App.useApp();
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadWorks();
  }, []);

  const loadWorks = async () => {
    setLoading(true);
    try {
      const result = await listWorks();
      const list = result?.works || result?.data || result || [];
      setWorks(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('加载作品列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id, title) => {
    modal.confirm({
      title: `确认删除「${title}」?`,
      content: '删除后将同时移除所有关联的剧本和场景数据，此操作不可恢复。',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteWork(id);
          message.success('已删除');
          loadWorks();
        } catch (err) {
          message.error('删除失败: ' + (err.response?.data?.error || err.message));
        }
      },
    });
  };

  const parseCharProfiles = (work) => {
    if (!work.character_profiles) return [];
    try {
      return typeof work.character_profiles === 'string'
        ? JSON.parse(work.character_profiles)
        : work.character_profiles;
    } catch {
      return [];
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>作品列表</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => navigate('/create-work')}
        >
          创作新作品
        </Button>
      </div>

      {works.length === 0 ? (
        <Card>
          <Empty description="还没有作品，开始创作吧">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/create-work')}
            >
              创作新作品
            </Button>
          </Empty>
        </Card>
      ) : (
        <List
          grid={{ gutter: 24, xs: 1, sm: 1, md: 2, lg: 2, xl: 3, xxl: 3 }}
          dataSource={works}
          pagination={{ pageSize: 6 }}
          renderItem={(work) => {
            const charProfiles = parseCharProfiles(work);
            const mainChar = charProfiles.length > 0 ? charProfiles[0] : null;
            return (
              <List.Item>
                <Card
                  hoverable
                  onClick={() => navigate(`/works/${work.id}`)}
                  style={{ height: '100%' }}
                  cover={
                    work.cover_image ? (
                      <div
                        style={{
                          height: 180,
                          background: `url(${work.cover_image}) center/cover no-repeat`,
                          backgroundColor: '#f0f2f5',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          height: 140,
                          background: `linear-gradient(135deg, ${getFormatColor(work.genre) || '#3a6b28'}22, ${getFormatColor(work.genre) || '#3a6b28'}44)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 48,
                        }}
                      >
                        <BookOutlined style={{ opacity: 0.5, color: getFormatColor(work.genre) || '#3a6b28' }} />
                      </div>
                    )
                  }
                  actions={[
                    <Tooltip title="删除" key="delete">
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(work.id, work.title);
                        }}
                      />
                    </Tooltip>,
                    <Tooltip title="查看详情" key="view">
                      <Button
                        type="text"
                        icon={<FileTextOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/works/${work.id}`);
                        }}
                      />
                    </Tooltip>,
                  ]}
                >
                  <Card.Meta
                    avatar={
                      mainChar ? (
                        <Avatar
                          size={44}
                          style={{ backgroundColor: getFormatColor(work.genre) || '#3a6b28' }}
                          icon={<UserOutlined />}
                        >
                          {mainChar.name?.[0]}
                        </Avatar>
                      ) : (
                        <Avatar
                          size={44}
                          style={{ backgroundColor: getFormatColor(work.genre) || '#3a6b28' }}
                          icon={<UserOutlined />}
                        />
                      )
                    }
                    title={
                      <Space>
                        <Text strong style={{ fontSize: 16 }}>{work.title}</Text>
                        <Tag color={getFormatColor(work.genre) || 'default'}>
                          {getFormatShortLabel(work.genre)}
                        </Tag>
                      </Space>
                    }
                    description={
                      <div>
                        {work.synopsis && (
                          <Paragraph
                            ellipsis={{ rows: 2 }}
                            style={{ marginBottom: 8, fontSize: 13, color: '#555' }}
                          >
                            {work.synopsis}
                          </Paragraph>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {mainChar && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: '#666' }}>
                                <UserOutlined style={{ marginRight: 4, fontSize: 12 }} />
                                {mainChar.name}
                              </span>
                              <Space size={4}>
                                {mainChar.age && <Tag size="small" color="blue">{mainChar.age}{mainChar.age.includes('岁') ? '' : '岁'}</Tag>}
                                {mainChar.gender && <Tag size="small" color="purple">{mainChar.gender}</Tag>}
                              </Space>
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#888' }}>
                            <span>
                              <FileTextOutlined style={{ marginRight: 4 }} />
                              {formatWordCount(work.word_count)}字
                            </span>
                            <span>
                              <ClockCircleOutlined style={{ marginRight: 4 }} />
                              {new Date(work.created_at).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                        </div>
                      </div>
                    }
                  />
                </Card>
              </List.Item>
            );
          }}
        />
      )}
    </div>
  );
}
