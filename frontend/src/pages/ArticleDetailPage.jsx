import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Spin,
  Button,
  Tag,
  Avatar,
  Divider,
  Space,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  EyeOutlined,
  LikeOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CrownOutlined,
  BulbOutlined,
  HeartOutlined,
} from '@ant-design/icons';
import { getArticle, likeArticle } from '../services/inspiration';

const { Title, Text, Paragraph } = Typography;

export default function ArticleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      getArticle(id)
        .then(setArticle)
        .catch((err) => {
          console.error('加载文章失败:', err);
          message.error('文章不存在');
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleLike = async () => {
    if (liked) return;
    try {
      await likeArticle(id);
      setArticle((prev) => ({ ...prev, like_count: (prev.like_count || 0) + 1 }));
      setLiked(true);
    } catch (err) {
      console.error('点赞失败:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!article) {
    return (
      <Card>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/inspiration')}>
          返回灵感列表
        </Button>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Text type="secondary">文章未找到</Text>
        </div>
      </Card>
    );
  }

  const tags = article.tags ? article.tags.split(',').filter(Boolean) : [];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/inspiration')}
        style={{ marginBottom: 16 }}
      >
        返回灵感列表
      </Button>

      <Card>
        {/* 文章头部 */}
        <div style={{ marginBottom: 24 }}>
          <Space style={{ marginBottom: 8 }}>
            {article.is_official && (
              <Tag icon={<CrownOutlined />} color="gold">
                官方
              </Tag>
            )}
            {tags.map((tag) => (
              <Tag key={tag} color="green">
                {tag.trim()}
              </Tag>
            ))}
          </Space>

          <Title level={2} style={{ marginTop: 8 }}>
            {article.title}
          </Title>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              color: '#888',
              fontSize: 13,
              flexWrap: 'wrap',
            }}
          >
            <span>
              <Avatar
                size={24}
                icon={article.is_official ? <CrownOutlined /> : <UserOutlined />}
                style={{
                  backgroundColor: article.is_official ? '#faad14' : '#1890ff',
                  marginRight: 6,
                }}
              />
              {article.author_name || '匿名'}
            </span>
            <span>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {new Date(article.created_at).toLocaleString('zh-CN')}
            </span>
            <span>
              <EyeOutlined style={{ marginRight: 4 }} />
              {article.view_count || 0} 阅读
            </span>
            <span
              onClick={handleLike}
              style={{ cursor: liked ? 'default' : 'pointer' }}
            >
              {liked ? (
                <HeartOutlined style={{ marginRight: 4, color: '#ff4d4f' }} />
              ) : (
                <LikeOutlined style={{ marginRight: 4 }} />
              )}
              {article.like_count || 0} 赞
            </span>
          </div>
        </div>

        <Divider />

        {/* 文章正文 - Markdown 渲染 */}
        <div
          style={{
            fontSize: 15,
            lineHeight: 1.9,
            color: '#333',
          }}
        >
          {article.content.split('\n').map((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return <br key={i} />;

            // 标题
            if (trimmed.startsWith('### ')) {
              return (
                <Title key={i} level={3} style={{ marginTop: 24 }}>
                  {trimmed.replace(/^###\s*/, '')}
                </Title>
              );
            }
            if (trimmed.startsWith('## ')) {
              return (
                <Title key={i} level={2} style={{ marginTop: 28 }}>
                  {trimmed.replace(/^##\s*/, '')}
                </Title>
              );
            }
            if (trimmed.startsWith('# ')) {
              return null; // 跳过一级标题（已在页面标题显示）
            }

            // 列表
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
              return (
                <div key={i} style={{ paddingLeft: 16, margin: '4px 0' }}>
                  <BulbOutlined style={{ marginRight: 8, color: '#3a6b28', fontSize: 12 }} />
                  {trimmed.replace(/^[-*]\s*/, '')}
                </div>
              );
            }

            // 加粗
            const boldReplaced = trimmed.replace(
              /\*\*(.+?)\*\*/g,
              '<strong>$1</strong>'
            );

            return (
              <Paragraph key={i} style={{ marginBottom: 8 }}>
                <span
                  dangerouslySetInnerHTML={{ __html: boldReplaced }}
                />
              </Paragraph>
            );
          })}
        </div>

        <Divider />

        {/* 底部操作 */}
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <Button
            type="primary"
            size="large"
            icon={liked ? <HeartOutlined /> : <LikeOutlined />}
            onClick={handleLike}
            disabled={liked}
            style={{
              background: liked ? '#ff4d4f' : undefined,
              borderColor: liked ? '#ff4d4f' : undefined,
            }}
          >
            {liked ? '已点赞' : '点赞支持'}
          </Button>
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              觉得有用？点赞鼓励更多创作
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
}
