import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Tabs,
  Empty,
  Table,
  Tag,
  Typography,
  Button,
  Row,
  Col,
  Collapse,
  Spin,
  Badge,
  Divider,
} from 'antd';
import {
  ArrowLeftOutlined,
  UnorderedListOutlined,
  TeamOutlined,
  EditOutlined,
  EnvironmentOutlined,
  UserOutlined,
  OrderedListOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  FileTextOutlined,
  ReadOutlined,
  BulbOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { parseScript, characterTypeLabel, characterTypeColor } from '../utils/parseScript';
import { getWork, listWorkScripts, deleteWork, generateScriptSummary } from '../services/work';

const { Title, Text, Paragraph } = Typography;

const typeIcon = {
  action: <PlayCircleOutlined />,
  dialogue: <UserOutlined />,
  transition: <PlayCircleOutlined />,
  sound: <PlayCircleOutlined />,
  note: <OrderedListOutlined />,
};

const typeLabel = {
  action: '动作',
  dialogue: '对话',
  transition: '转场',
  sound: '音效',
  note: '备注',
};

const characterColumns = [
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
    render: (text) => <strong>{text}</strong>,
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 100,
    filters: Object.entries(characterTypeLabel).map(([value, label]) => ({
      text: label,
      value,
    })),
    onFilter: (value, record) => record.type === value,
    render: (type) => (
      <Tag color={characterTypeColor[type] || 'default'}>
        {characterTypeLabel[type] || type}
      </Tag>
    ),
  },
  { title: '简介', dataIndex: 'description', key: 'description', ellipsis: true },
];

function SceneCard({ scene, index }) {
  const contentStats = scene.content
    ? scene.content.reduce((acc, c) => {
        acc[c.type] = (acc[c.type] || 0) + 1;
        return acc;
      }, {})
    : {};

  return (
    <Card
      size="small"
      title={
        <span>
          <Tag color="blue">{index + 1}</Tag>
          {scene.title || `场景 ${index + 1}`}
        </span>
      }
      style={{ height: '100%' }}
    >
      {scene.slugline && (
        <Paragraph style={{ marginBottom: 8 }}>
          <EnvironmentOutlined style={{ marginRight: 4 }} />
          <Text code>
            {(typeof scene.slugline === 'object'
              ? `${scene.slugline.type === 'interior' ? '内景' : scene.slugline.type === 'exterior' ? '外景' : ''} · ${scene.slugline.name} · ${scene.slugline.time}`
              : scene.slugline)}
          </Text>
        </Paragraph>
      )}

      {scene.characters_present?.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <UserOutlined style={{ marginRight: 4 }} />
          {scene.characters_present.map((name) => (
            <Tag key={name} style={{ marginBottom: 4 }}>
              {name}
            </Tag>
          ))}
        </div>
      )}

      {Object.keys(contentStats).length > 0 && (
        <div>
          {Object.entries(contentStats).map(([type, count]) => (
            <Tag key={type} icon={typeIcon[type]}>
              {typeLabel[type] || type} × {count}
            </Tag>
          ))}
        </div>
      )}

      {scene.content?.length > 0 && (
        <Collapse
          ghost
          size="small"
          items={[
            {
              key: 'content',
              label: '展开内容',
              children: (
                <div>
                  {scene.content.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        marginBottom: 8,
                        paddingLeft: 8,
                        borderLeft: '2px solid #e8e8e8',
                      }}
                    >
                      <Tag color="default" style={{ marginBottom: 4 }}>
                        {typeLabel[item.type] || item.type}
                      </Tag>
                      {item.type === 'action' && (
                        <Paragraph style={{ fontFamily: 'Courier New, monospace', margin: 0 }}>
                          {item.text || item.description || item.action}
                        </Paragraph>
                      )}
                      {item.type === 'dialogue' && (
                        <div>
                          <Text strong style={{ textTransform: 'uppercase', fontSize: 13 }}>
                            {item.character}
                          </Text>
                          {item.parenthetical && (
                            <div style={{ fontStyle: 'italic', color: '#888' }}>
                              ({item.parenthetical})
                            </div>
                          )}
                          <Paragraph style={{ fontFamily: 'Courier New, monospace', margin: 0 }}>
                            {item.text || item.dialogue}
                          </Paragraph>
                        </div>
                      )}
                      {(item.type === 'transition' ||
                        item.type === 'sound' ||
                        item.type === 'note') && (
                        <Paragraph style={{ margin: 0 }}>
                          {item.text || item.description || ''}
                        </Paragraph>
                      )}
                    </div>
                  ))}
                </div>
              ),
            },
          ]}
        />
      )}
    </Card>
  );
}

export default function WorkDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [work, setWork] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeScriptId, setActiveScriptId] = useState(null);
  const [generatingSummaries, setGeneratingSummaries] = useState(new Set());

  const handleGenerateSummary = async (scriptId) => {
    setGeneratingSummaries((prev) => new Set(prev).add(scriptId));
    try {
      const { summary } = await generateScriptSummary(scriptId);
      setScripts((prev) =>
        prev.map((s) => (s.id === scriptId ? { ...s, summary } : s))
      );
      message.success('梗概已生成');
    } catch (err) {
      message.error('生成梗概失败: ' + (err.response?.data?.error || err.message));
    } finally {
      setGeneratingSummaries((prev) => {
        const next = new Set(prev);
        next.delete(scriptId);
        return next;
      });
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [workData, scriptsData] = await Promise.all([
        getWork(id),
        listWorkScripts(id),
      ]);
      setWork(workData);
      const list = scriptsData.scripts || [];
      setScripts(list);
      if (list.length > 0) {
        setActiveScriptId(list[0].id);
      }
    } catch (err) {
      console.error('加载作品数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!scripts.length) {
    return (
      <div style={{ minHeight: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/works')}>
            返回作品列表
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            {work?.title || '作品详情'}
          </Title>
        </div>
        <Card>
          <Empty
            description="暂无剧本，请先生成第一集"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/create-work')}
            >
              创作新作品
            </Button>
          </Empty>
        </Card>
      </div>
    );
  }

  const activeScript = scripts.find((s) => s.id === activeScriptId) || scripts[0];

  const scriptTabItems = scripts.map((script) => ({
    key: script.id,
    label: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <FileTextOutlined /> 第{script.episode || scripts.indexOf(script) + 1}集
        <EditOutlined
          style={{ fontSize: 13, color: '#1890ff', cursor: 'pointer', padding: 2 }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/editor?scriptId=${script.id}&workId=${id}`);
          }}
          title="编辑此集"
        />
      </span>
    ),
  }));

  // 生成剧集梗概
  const generateEpisodeSummary = (scenes) => {
    if (!scenes || scenes.length === 0) return null;

    const totalScenes = scenes.length;
    const allChars = new Set();
    const sceneCards = scenes.map((scene, idx) => {
      (scene.characters_present || []).forEach((c) => allChars.add(c));
      
      // 取场景的第一条 action 作为概况描述
      const firstAction = scene.content?.find((c) => c.type === 'action');
      const sluglineText = scene.slugline
        ? (typeof scene.slugline === 'object'
            ? `${scene.slugline.type === 'interior' ? '内' : scene.slugline.type === 'exterior' ? '外' : ''} · ${scene.slugline.name} · ${scene.slugline.time === 'night' ? '夜' : scene.slugline.time === 'dawn' ? '黎明' : scene.slugline.time === 'dusk' ? '黄昏' : '日'}`
            : scene.slugline)
        : '';

      return { idx, scene, firstAction, sluglineText };
    });

    const dialogueCount = scenes.reduce(
      (sum, s) => sum + (s.content || []).filter((c) => c.type === 'dialogue').length,
      0
    );
    const actionCount = scenes.reduce(
      (sum, s) => sum + (s.content || []).filter((c) => c.type === 'action').length,
      0
    );

    return { totalScenes, allChars, sceneCards, dialogueCount, actionCount };
  };

  const renderScriptDetail = (script) => {
    let scenes = [];
    let characters = [];
    try {
      if (script.scenes) {
        scenes =
          typeof script.scenes === 'string'
            ? JSON.parse(script.scenes)
            : script.scenes;
      }
      if (script.characters) {
        characters =
          typeof script.characters === 'string'
            ? JSON.parse(script.characters)
            : script.characters;
      }
    } catch {}

    const summary = generateEpisodeSummary(scenes);

    const contentTabs = [
      {
        key: 'summary',
        label: (
          <span>
            <ReadOutlined /> 剧集梗概
          </span>
        ),
        children: summary ? (
          <div>
            {/* 一句话梗概 */}
            <Card
              size="small"
              style={{
                marginBottom: 20,
                background: script.summary ? '#f6ffed' : '#fafafa',
                borderColor: script.summary ? '#b7eb8f' : '#d9d9d9',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <Text strong style={{ fontSize: 13, color: '#3a6b28', display: 'block', marginBottom: 8 }}>
                    <BulbOutlined /> 本集梗概
                  </Text>
                  {script.summary ? (
                    <Paragraph
                      style={{
                        margin: 0,
                        fontSize: 15,
                        lineHeight: 1.8,
                        color: '#333',
                      }}
                    >
                      {script.summary}
                    </Paragraph>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 14 }}>
                      尚未生成梗概，点击右侧按钮让 AI 自动生成一句话摘要
                    </Text>
                  )}
                </div>
                <Button
                  type={script.summary ? 'default' : 'primary'}
                  size="small"
                  icon={generatingSummaries.has(script.id) ? <LoadingOutlined /> : <BulbOutlined />}
                  loading={generatingSummaries.has(script.id)}
                  onClick={() => handleGenerateSummary(script.id)}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {script.summary ? '重新生成' : 'AI 生成梗概'}
                </Button>
              </div>
            </Card>

            {/* 概览统计 */}
            <Row gutter={16} style={{ marginBottom: 20 }}>
              <Col span={6}>
                <Card size="small" style={{ textAlign: 'center', background: '#f6ffed' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#3a6b28' }}>{summary.totalScenes}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>场 景</Text>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ textAlign: 'center', background: '#e6f7ff' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#1890ff' }}>{summary.allChars.size}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>出场角色</Text>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ textAlign: 'center', background: '#fff7e6' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#fa8c16' }}>{summary.dialogueCount}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>句对白</Text>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ textAlign: 'center', background: '#f9f0ff' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#722ed1' }}>{summary.actionCount}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>条动作</Text>
                </Card>
              </Col>
            </Row>

            {/* 出场角色一览 */}
            {summary.allChars.size > 0 && (
              <div style={{ marginBottom: 20 }}>
                <Text strong>
                  <TeamOutlined style={{ marginRight: 4 }} />
                  本集出场角色：
                </Text>
                <div style={{ marginTop: 8 }}>
                  {[...summary.allChars].map((name) => (
                    <Tag key={name} color="blue" style={{ marginBottom: 4 }}>
                      {name}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            <Divider style={{ margin: '12px 0' }} />

            {/* 逐场梗概 */}
            <Text strong style={{ display: 'block', marginBottom: 12 }}>
              <UnorderedListOutlined style={{ marginRight: 4 }} />
              逐场概述
            </Text>
            {summary.sceneCards.map(({ idx, scene, firstAction, sluglineText }) => (
              <Card
                key={scene.id || idx}
                size="small"
                style={{ marginBottom: 12 }}
                title={
                  <span>
                    <Tag color="blue">{idx + 1}</Tag>
                    {scene.title || `场景 ${idx + 1}`}
                  </span>
                }
              >
                {sluglineText && (
                  <Paragraph style={{ marginBottom: 6 }}>
                    <EnvironmentOutlined style={{ marginRight: 4 }} />
                    <Text code style={{ fontSize: 12 }}>{sluglineText}</Text>
                  </Paragraph>
                )}
                {firstAction && (
                  <Paragraph
                    style={{
                      margin: 0,
                      fontSize: 14,
                      lineHeight: 1.7,
                      color: '#555',
                    }}
                    ellipsis={{ rows: 4 }}
                  >
                    {firstAction.description || firstAction.text || ''}
                  </Paragraph>
                )}
                {!firstAction && (
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    暂无动作描述
                  </Text>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Empty description="暂无剧集数据" />
        ),
      },
      {
        key: 'scenes',
        label: (
          <span>
            <UnorderedListOutlined /> 场景列表 ({scenes.length})
          </span>
        ),
        children:
          scenes.length > 0 ? (
            <Row gutter={[16, 16]}>
              {scenes.map((scene, idx) => (
                <Col xs={24} sm={12} lg={8} xl={6} key={scene.id || idx}>
                  <SceneCard scene={scene} index={idx} />
                </Col>
              ))}
            </Row>
          ) : (
            <Empty description="暂无场景数据" />
          ),
      },
      {
        key: 'characters',
        label: (
          <span>
            <TeamOutlined /> 角色管理 ({characters.length})
          </span>
        ),
        children:
          characters.length > 0 ? (
            <Card>
              <Table
                dataSource={characters.map((c, i) => ({ ...c, key: c.id || i }))}
                columns={characterColumns}
                pagination={false}
                size="middle"
                locale={{ emptyText: '暂无角色' }}
              />
            </Card>
          ) : (
            <Empty description="暂无角色数据" />
          ),
      },
    ];

    return <Tabs items={contentTabs} />;
  };

  const workCharProfiles = (() => {
    if (!work?.character_profiles) return [];
    try {
      return typeof work.character_profiles === 'string'
        ? JSON.parse(work.character_profiles)
        : work.character_profiles;
    } catch { return []; }
  })();

  return (
    <div style={{ minHeight: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/works')}>
          返回作品列表
        </Button>
        <Title level={3} style={{ margin: 0 }}>
          {work?.title || '作品详情'}
        </Title>
        <Badge count={`${scripts.length} 集`} style={{ backgroundColor: '#1890ff' }} />
        {work?.genre && <Tag>{work.genre === 'film' ? '电影' : work.genre === 'tv_series' ? '电视剧' : '舞台剧'}</Tag>}
        {work?.status && <Tag color={work.status === 'draft' ? 'default' : 'green'}>{work.status === 'draft' ? '草稿' : work.status}</Tag>}
      </div>

      {/* 作品信息卡：梗概 + 人物小传 */}
      {(work?.synopsis || work?.cover_image || workCharProfiles.length > 0) && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          {work?.cover_image && (
            <Col xs={24} md={6}>
              <Card size="small" cover={
                <div style={{
                  height: 200,
                  background: `url(${work.cover_image}) center/cover no-repeat`,
                  borderRadius: '8px 8px 0 0',
                }} />
              } />
            </Col>
          )}
          <Col xs={24} md={work?.cover_image ? 18 : 24}>
            <Card size="small" style={{ height: '100%' }}>
              {work?.synopsis && (
                <div style={{ marginBottom: workCharProfiles.length > 0 ? 12 : 0 }}>
                  <Text strong>一句话梗概：</Text>
                  <Text>{work.synopsis}</Text>
                </div>
              )}
              {workCharProfiles.length > 0 && (
                <div>
                  <Text strong>人物小传：</Text>
                  <Row gutter={[12, 8]} style={{ marginTop: 8 }}>
                    {workCharProfiles.map((char, i) => (
                      <Col xs={24} sm={12} md={8} key={i}>
                        <Card size="small" style={{ background: '#fafafa' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%',
                              background: `hsl(${(i * 60) % 360}, 40%, 60%)`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontWeight: 'bold', fontSize: 14,
                            }}>
                              {char.name?.[0]}
                            </div>
                            <Text strong>{char.name}</Text>
                            {char.age && <Tag>{char.age}岁</Tag>}
                            {char.gender && <Tag>{char.gender}</Tag>}
                          </div>
                          {char.personality && (
                            <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }} ellipsis={{ rows: 2 }}>
                              {char.personality}
                            </Paragraph>
                          )}
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      )}

      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate(`/create-work?workId=${id}`)}
        >
          生成新剧集
        </Button>
        <Text type="secondary" style={{ fontSize: 13, alignSelf: 'center' }}>
          点击剧集标签旁的 <EditOutlined /> 图标即可编辑对应集
        </Text>
      </div>

      <Card bordered={false}>
        <Tabs
          activeKey={activeScriptId}
          onChange={setActiveScriptId}
          items={scriptTabItems.map((item) => ({
            ...item,
            children: null, // 内容由外部 renderScriptDetail 渲染
          }))}
        />
        {activeScript && renderScriptDetail(activeScript)}
      </Card>
    </div>
  );
}
