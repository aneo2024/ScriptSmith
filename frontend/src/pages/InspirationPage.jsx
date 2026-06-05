import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  List,
  Typography,
  Spin,
  Empty,
  Tag,
  Button,
  Row,
  Col,
  Input,
  message,
  Divider,
  Avatar,
  Badge,
  Tooltip,
  Pagination,
} from 'antd';
import {
  BulbOutlined,
  FireOutlined,
  EyeOutlined,
  LikeOutlined,
  ThunderboltOutlined,
  SearchOutlined,
  UserOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  BookOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import {
  listArticles,
  listTodayTopics,
  generateArticle,
  likeArticle,
} from '../services/inspiration';

const { Title, Text, Paragraph } = Typography;

const COLORS = {
  primary: '#3a6b28',
  gold: '#faad14',
  silver: '#aaa',
  bronze: '#cd7f32',
};

const rankColors = ['#faad14', '#aaa', '#cd7f32'];

function TopicRanking({ topics, loading, onRefresh }) {
  return (
    <Card
      size="small"
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <TrophyOutlined style={{ color: '#faad14' }} />
          今日话题榜
          <Badge count="HOT" style={{ backgroundColor: '#ff4d4f', fontSize: 10 }} />
        </span>
      }
      style={{ marginBottom: 16 }}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin size="small" />
        </div>
      ) : topics.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="今日暂无推荐话题"
          style={{ padding: '12px 0' }}
        />
      ) : (
        <List
          size="small"
          dataSource={topics}
          renderItem={(topic, idx) => (
            <List.Item>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: idx < 3 ? rankColors[idx] : '#f0f0f0',
                    color: idx < 3 ? '#fff' : '#666',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {idx < 3 ? <CrownOutlined style={{ fontSize: 11 }} /> : idx + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Tooltip title={topic.description || topic.title}>
                    <Text
                      ellipsis
                      style={{ fontSize: 13, fontWeight: idx < 3 ? 600 : 400 }}
                    >
                      {topic.title}
                    </Text>
                  </Tooltip>
                </div>
                <Tag
                  color="blue"
                  style={{ fontSize: 11, margin: 0, flexShrink: 0 }}
                >
                  {topic.article_count}篇
                </Tag>
              </div>
            </List.Item>
          )}
        />
      )}
      <Divider style={{ margin: '8px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          AI 定期更新热门话题
        </Text>
        <Button type="link" size="small" onClick={onRefresh} style={{ fontSize: 11 }}>
          刷新
        </Button>
      </div>
    </Card>
  );
}

function ArticleCard({ article, onLike }) {
  const navigate = useNavigate();
  const tags = article.tags ? article.tags.split(',').filter(Boolean) : [];

  return (
    <Card
      hoverable
      size="small"
      style={{ marginBottom: 16 }}
      onClick={() => navigate(`/inspiration/article/${article.id}`)}
      cover={
        article.cover_image ? (
          <div
            style={{
              height: 160,
              background: `url(${article.cover_image}) center/cover no-repeat`,
              backgroundColor: '#f0f2f5',
            }}
          />
        ) : (
          <div
            style={{
              height: 120,
              background: `linear-gradient(135deg, #${article.id?.slice(0, 6) || '3a6b28'}22, #${article.id?.slice(0, 6) || '3a6b28'}44)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
            }}
          >
            <BulbOutlined style={{ opacity: 0.4, color: COLORS.primary }} />
          </div>
        )
      }
    >
      <Card.Meta
        avatar={
          <Avatar
            style={{
              backgroundColor: article.is_official ? '#faad14' : '#1890ff',
            }}
            icon={article.is_official ? <CrownOutlined /> : <UserOutlined />}
          />
        }
        title={
          <span style={{ fontSize: 15 }}>
            {article.is_official && (
              <Tag color="gold" style={{ marginRight: 6, fontSize: 10 }}>
                官方
              </Tag>
            )}
            {article.title}
          </span>
        }
        description={
          <div>
            {article.summary && (
              <Paragraph
                ellipsis={{ rows: 2 }}
                style={{ marginBottom: 8, fontSize: 13, color: '#555' }}
              >
                {article.summary}
              </Paragraph>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 12,
                color: '#888',
              }}
            >
              <span>
                <UserOutlined style={{ marginRight: 4 }} />
                {article.author_name || '匿名'}
              </span>
              <span style={{ display: 'flex', gap: 12 }}>
                <Tooltip title="阅读">
                  <span>
                    <EyeOutlined style={{ marginRight: 2 }} />
                    {article.view_count || 0}
                  </span>
                </Tooltip>
                <Tooltip title="点赞">
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onLike(article.id);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <LikeOutlined style={{ marginRight: 2 }} />
                    {article.like_count || 0}
                  </span>
                </Tooltip>
                <span>
                  <ClockCircleOutlined style={{ marginRight: 2 }} />
                  {new Date(article.created_at).toLocaleDateString('zh-CN')}
                </span>
              </span>
            </div>
            {tags.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {tags.map((tag) => (
                  <Tag key={tag} color="green" style={{ fontSize: 11, marginBottom: 2 }}>
                    {tag.trim()}
                  </Tag>
                ))}
              </div>
            )}
          </div>
        }
      />
    </Card>
  );
}

export default function InspirationPage() {
  const [articles, setArticles] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topicLoading, setTopicLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [generateInput, setGenerateInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const pageSize = 10;

  const loadArticles = async (p = 1) => {
    setLoading(true);
    try {
      const data = await listArticles({ page: p, size: pageSize });
      setArticles(data.articles || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('加载文章失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTopics = async () => {
    setTopicLoading(true);
    try {
      const data = await listTodayTopics();
      setTopics(data.topics || []);
    } catch (err) {
      console.error('加载话题失败:', err);
    } finally {
      setTopicLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
    loadTopics();
  }, []);

  const handlePageChange = (p) => {
    setPage(p);
    loadArticles(p);
  };

  const handleLike = async (id) => {
    try {
      await likeArticle(id);
      setArticles((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, like_count: (a.like_count || 0) + 1 } : a
        )
      );
    } catch (err) {
      console.error('点赞失败:', err);
    }
  };

  const handleGenerate = async () => {
    const topic = generateInput.trim();
    if (!topic) {
      message.warning('请输入创作主题');
      return;
    }
    setGenerating(true);
    try {
      const result = await generateArticle(topic);
      message.success('AI 正在生成文章，请稍后刷新页面查看');
      setGenerateInput('');
      loadTopics();
    } catch (err) {
      message.error('生成失败: ' + (err.response?.data?.error || err.message));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ minHeight: '100%' }}>
      {/* 顶部标题栏 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BulbOutlined style={{ fontSize: 24, color: '#faad14' }} />
          <Title level={3} style={{ margin: 0 }}>
            创作灵感
          </Title>
          <Tag color="orange">AI 驱动</Tag>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Input.Search
            placeholder="输入主题，AI 为你生成文章…"
            value={generateInput}
            onChange={(e) => setGenerateInput(e.target.value)}
            onSearch={handleGenerate}
            enterButton={
              <span>
                <ThunderboltOutlined /> 生成
              </span>
            }
            loading={generating}
            style={{ width: 320 }}
          />
        </div>
      </div>

      <Row gutter={24}>
        {/* 左侧：文章列表 */}
        <Col xs={24} md={17} lg={18}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <Spin size="large" tip="加载中..." />
            </div>
          ) : articles.length === 0 ? (
            <Card>
              <Empty
                description={
                  <span>
                    暂无灵感文章，
                    <Text strong style={{ color: COLORS.primary }}>
                      输入创作主题
                    </Text>
                    让 AI 为你生成第一篇
                  </span>
                }
              >
                <div style={{ marginTop: 16 }}>
                  <Input.Search
                    placeholder="例如：如何写出精彩的剧本开场"
                    value={generateInput}
                    onChange={(e) => setGenerateInput(e.target.value)}
                    onSearch={handleGenerate}
                    enterButton="AI 生成"
                    loading={generating}
                    size="large"
                  />
                </div>
              </Empty>
            </Card>
          ) : (
            <>
              <List
                grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }}
                dataSource={articles}
                renderItem={(article) => (
                  <List.Item>
                    <ArticleCard article={article} onLike={handleLike} />
                  </List.Item>
                )}
              />
              {total > pageSize && (
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <Pagination
                    current={page}
                    total={total}
                    pageSize={pageSize}
                    onChange={handlePageChange}
                    showSizeChanger={false}
                  />
                </div>
              )}
            </>
          )}
        </Col>

        {/* 右侧：排行榜 */}
        <Col xs={24} md={7} lg={6}>
          <TopicRanking
            topics={topics}
            loading={topicLoading}
            onRefresh={loadTopics}
          />

          {/* 生成提示卡片 */}
          <Card size="small" style={{ background: '#fffbe6', border: '1px solid #ffe58f' }}>
            <div style={{ fontSize: 13 }}>
              <FireOutlined style={{ color: '#faad14', marginRight: 4 }} />
              <Text strong>AI 灵感生成</Text>
            </div>
            <Paragraph
              type="secondary"
              style={{ margin: '8px 0 0 0', fontSize: 12 }}
            >
              输入任何剧本创作相关主题，AI 将自动搜索整理相关知识，
              生成专业文章供你参考学习。
            </Paragraph>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                试试这些：
              </Text>
              {['人物塑造', '对白技巧', '悬念设计'].map((t) => (
                <Tag
                  key={t}
                  style={{ cursor: 'pointer', marginTop: 4 }}
                  onClick={() => {
                    setGenerateInput(t);
                  }}
                >
                  {t}
                </Tag>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
