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
  Dropdown,
  Select,
  App,
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
  ReadOutlined,
  BulbOutlined,
  LoadingOutlined,
  SkinOutlined,
  HeatMapOutlined,
} from '@ant-design/icons';
import { characterTypeLabel, characterTypeColor } from '../utils/parseScript';
import { FORMATS, getFormatShortLabel, getFormatColor } from '../utils/scriptOptions';
import {
  getWork,
  listWorkScripts,
  updateWork,
  generateScriptSummary,
  generateCharacterAppearances,
  generateSceneEnvironments,
  generateCharacterProfiles,
} from '../services/work';

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
  {
    title: '外貌',
    dataIndex: 'appearance',
    key: 'appearance',
    ellipsis: true,
    render: (text) => text ? <Text style={{ fontSize: 13, color: '#666' }}>{text}</Text> : <Text type="secondary">-</Text>,
  },
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

      {scene.mood && (
        <div style={{ marginBottom: 8 }}>
          <HeatMapOutlined style={{ marginRight: 4 }} />
          <Text style={{ fontSize: 13, color: '#555', fontStyle: 'italic' }}>
            {scene.mood}
          </Text>
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
  const { message } = App.useApp();
  const [work, setWork] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeScriptId, setActiveScriptId] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [generatingSummaries, setGeneratingSummaries] = useState(new Set());
  const [generatingAppearances, setGeneratingAppearances] = useState(new Set());
  const [generatingEnvironments, setGeneratingEnvironments] = useState(new Set());
  const [generatingProfiles, setGeneratingProfiles] = useState(false);

  const handleGenerateProfiles = async () => {
    setGeneratingProfiles(true);
    try {
      const { profiles } = await generateCharacterProfiles(id);
      setWork((prev) => ({
        ...prev,
        character_profiles: profiles,
      }));
      message.success(`已生成 ${profiles?.length || 0} 个角色设定`);
    } catch (err) {
      message.error('生成角色设定失败: ' + (err.response?.data?.error || err.message));
    } finally {
      setGeneratingProfiles(false);
    }
  };

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

  const handleGenerateAppearances = async (scriptId) => {
    setGeneratingAppearances((prev) => new Set(prev).add(scriptId));
    try {
      await generateCharacterAppearances(scriptId);
      message.success('角色外貌已生成');
      const { scripts: refreshed } = await listWorkScripts(id);
      setScripts(refreshed);
    } catch (err) {
      message.error('生成角色外貌失败: ' + (err.response?.data?.error || err.message));
    } finally {
      setGeneratingAppearances((prev) => {
        const next = new Set(prev);
        next.delete(scriptId);
        return next;
      });
    }
  };

  const handleGenerateEnvironments = async (scriptId) => {
    setGeneratingEnvironments((prev) => new Set(prev).add(scriptId));
    try {
      await generateSceneEnvironments(scriptId);
      message.success('场景环境已生成');
      const { scripts: refreshed } = await listWorkScripts(id);
      setScripts(refreshed);
    } catch (err) {
      message.error('生成场景环境失败: ' + (err.response?.data?.error || err.message));
    } finally {
      setGeneratingEnvironments((prev) => {
        const next = new Set(prev);
        next.delete(scriptId);
        return next;
      });
    }
  };

  const handleGenreChange = async ({ key }) => {
    try {
      await updateWork(id, { genre: key });
      setWork((prev) => ({ ...prev, genre: key }));
      message.success('作品格式已更新');
    } catch (err) {
      message.error('更新失败: ' + (err.response?.data?.error || err.message));
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
              onClick={() => navigate(`/create-work?workId=${id}`)}
            >
              生成新剧集
            </Button>
          </Empty>
        </Card>
      </div>
    );
  }

  const activeScript = scripts.find((s) => s.id === activeScriptId) || scripts[0];

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

  const workCharProfiles = (() => {
    if (!work?.character_profiles) return [];
    try {
      return typeof work.character_profiles === 'string'
        ? JSON.parse(work.character_profiles)
        : work.character_profiles;
    } catch { /* parse failed */ return []; }
  })();

  // episode selector for summary & scenes tabs
  const episodeSelectOptions = scripts.map((script, i) => ({
    value: script.id,
    label: `第${script.episode || i + 1}集`,
  }));

  // render per-episode tab content blocks
  const renderEpisodeSummary = (script) => {
    let scenes = [];
    try {
      if (script.scenes) {
        scenes = typeof script.scenes === 'string'
          ? JSON.parse(script.scenes) : script.scenes;
      }
    } catch { /* parse failed */ }
    const summary = generateEpisodeSummary(scenes);

    if (!summary) return <Empty description="暂无剧集数据" />;

    return (
      <div>
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
                <Paragraph style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: '#333' }}>
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

        {summary.allChars.size > 0 && (
          <div style={{ marginBottom: 20 }}>
            <Text strong><TeamOutlined style={{ marginRight: 4 }} />本集出场角色：</Text>
            <div style={{ marginTop: 8 }}>
              {[...summary.allChars].map((name) => (
                <Tag key={name} color="blue" style={{ marginBottom: 4 }}>{name}</Tag>
              ))}
            </div>
          </div>
        )}

        <Divider style={{ margin: '12px 0' }} />
        <Text strong style={{ display: 'block', marginBottom: 12 }}>
          <UnorderedListOutlined style={{ marginRight: 4 }} />逐场概述
        </Text>
        {summary.sceneCards.map(({ idx, scene, firstAction, sluglineText }) => (
          <Card
            key={scene.id || idx}
            size="small"
            style={{ marginBottom: 12 }}
            title={<span><Tag color="blue">{idx + 1}</Tag>{scene.title || `场景 ${idx + 1}`}</span>}
          >
            {sluglineText && (
              <Paragraph style={{ marginBottom: 6 }}>
                <EnvironmentOutlined style={{ marginRight: 4 }} />
                <Text code style={{ fontSize: 12 }}>{sluglineText}</Text>
              </Paragraph>
            )}
            {firstAction ? (
              <Paragraph style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#555' }} ellipsis={{ rows: 4 }}>
                {firstAction.description || firstAction.text || ''}
              </Paragraph>
            ) : (
              <Text type="secondary" style={{ fontSize: 13 }}>暂无动作描述</Text>
            )}
          </Card>
        ))}
      </div>
    );
  };

  const renderEpisodeScenes = (script) => {
    let scenes = [];
    try {
      if (script.scenes) {
        scenes = typeof script.scenes === 'string' ? JSON.parse(script.scenes) : script.scenes;
      }
    } catch { /* parse failed */ }

    if (!scenes.length) return <Empty description="暂无场景数据" />;

    return (
      <>
        <div style={{ marginBottom: 16 }}>
          <Button
            size="small"
            icon={generatingEnvironments.has(script.id) ? <LoadingOutlined /> : <HeatMapOutlined />}
            loading={generatingEnvironments.has(script.id)}
            onClick={() => handleGenerateEnvironments(script.id)}
          >
            生成场景环境
          </Button>
        </div>
        <Row gutter={[16, 16]}>
          {scenes.map((scene, idx) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={scene.id || idx}>
              <SceneCard scene={scene} index={idx} />
            </Col>
          ))}
        </Row>
      </>
    );
  };

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/works')}>返回作品列表</Button>
        <Title level={3} style={{ margin: 0 }}>{work?.title || '作品详情'}</Title>
        <Badge count={`${scripts.length} 集`} style={{ backgroundColor: '#1890ff' }} />
        {work?.genre && (
          <Dropdown
            menu={{
              items: FORMATS.map((f) => ({ key: f.value, label: f.label })),
              selectedKeys: [work.genre],
              onClick: handleGenreChange,
            }}
            trigger={['click']}
          >
            <Tag color={getFormatColor(work.genre)} style={{ cursor: 'pointer' }}>
              {getFormatShortLabel(work.genre)} <EditOutlined style={{ fontSize: 10 }} />
            </Tag>
          </Dropdown>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(`/create-work?workId=${id}`)}>
          生成新剧集
        </Button>
        <Text type="secondary" style={{ fontSize: 13, alignSelf: 'center' }}>
          点击剧集标签旁的 <EditOutlined /> 图标即可编辑对应集
        </Text>
      </div>

      <Card bordered={false}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          {
            key: 'summary',
            label: <span><ReadOutlined /> 剧集梗概</span>,
            children: (
              <div>
                <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text strong>选择剧集：</Text>
                  <Select
                    style={{ width: 200 }}
                    value={activeScriptId}
                    onChange={setActiveScriptId}
                    options={episodeSelectOptions}
                  />
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => navigate(`/editor?scriptId=${activeScriptId}&workId=${id}`)}
                  >
                    编辑此集
                  </Button>
                </div>
                {activeScript ? renderEpisodeSummary(activeScript) : <Empty description="请选择剧集" />}
              </div>
            ),
          },
          {
            key: 'scenes',
            label: <span><UnorderedListOutlined /> 场景列表</span>,
            children: (
              <div>
                <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text strong>选择剧集：</Text>
                  <Select
                    style={{ width: 200 }}
                    value={activeScriptId}
                    onChange={setActiveScriptId}
                    options={episodeSelectOptions}
                  />
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => navigate(`/editor?scriptId=${activeScriptId}&workId=${id}`)}
                  >
                    编辑此集
                  </Button>
                </div>
                {activeScript ? renderEpisodeScenes(activeScript) : <Empty description="请选择剧集" />}
              </div>
            ),
          },
          {
            key: 'characters',
            label: <span><TeamOutlined /> 角色管理</span>,
            children: (
              <div>
                <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text strong>选择剧集：</Text>
                  <Select
                    style={{ width: 200 }}
                    value={activeScriptId}
                    onChange={setActiveScriptId}
                    options={episodeSelectOptions}
                  />
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => navigate(`/editor?scriptId=${activeScriptId}&workId=${id}`)}
                  >
                    编辑此集
                  </Button>
                </div>
                {activeScript ? (() => {
                  let chars = [];
                  try {
                    if (activeScript.characters) {
                      chars = typeof activeScript.characters === 'string'
                        ? JSON.parse(activeScript.characters)
                        : activeScript.characters;
                    }
                  } catch { /* parse failed */ }
                  return chars.length > 0 ? (
                    <>
                      <div style={{ marginBottom: 16 }}>
                        <Button
                          size="small"
                          icon={generatingAppearances.has(activeScript.id) ? <LoadingOutlined /> : <SkinOutlined />}
                          loading={generatingAppearances.has(activeScript.id)}
                          onClick={() => handleGenerateAppearances(activeScript.id)}
                        >
                          生成本集角色外貌
                        </Button>
                      </div>
                      <Table
                        dataSource={chars.map((c, i) => ({ ...c, key: c.id || i }))}
                        columns={characterColumns}
                        pagination={false}
                        size="middle"
                        locale={{ emptyText: '暂无角色' }}
                      />
                    </>
                  ) : <Empty description="本集暂无角色数据" />;
                })() : <Empty description="请选择剧集" />}
              </div>
            ),
          },
          {
            key: 'profiles',
            label: <span><TeamOutlined /> 人物小传</span>,
            children: (
              <div>
                {workCharProfiles.length > 0 ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Text strong style={{ fontSize: 15 }}>人物小传（作品级）</Text>
                      <Button
                        icon={generatingProfiles ? <LoadingOutlined /> : <TeamOutlined />}
                        loading={generatingProfiles}
                        onClick={handleGenerateProfiles}
                      >
                        {generatingProfiles ? '生成中...' : '重新生成角色设定'}
                      </Button>
                    </div>
                    <Row gutter={[16, 16]}>
                      {workCharProfiles.map((char, i) => (
                        <Col xs={24} sm={12} key={i}>
                          <Card style={{ background: '#fafafa' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                              <div style={{
                                width: 44, height: 44, borderRadius: '50%',
                                background: `hsl(${(i * 60) % 360}, 40%, 60%)`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontWeight: 'bold', fontSize: 18,
                              }}>
                                {char.name?.[0]}
                              </div>
                              <div>
                                <Text strong style={{ fontSize: 15 }}>{char.name}</Text>
                                <div>
                                  {char.age && <Tag>{char.age}{char.age.includes('岁') ? '' : '岁'}</Tag>}
                                  {char.gender && <Tag>{char.gender}</Tag>}
                                </div>
                              </div>
                            </div>
                            {char.appearance && (
                              <Paragraph style={{ margin: '0 0 6px 0', fontSize: 13, lineHeight: 1.6 }}>
                                <Text strong>外貌：</Text>{char.appearance}
                              </Paragraph>
                            )}
                            {char.personality && (
                              <Paragraph style={{ margin: '0 0 6px 0', fontSize: 13, lineHeight: 1.6 }}>
                                <Text strong>性格：</Text>{char.personality}
                              </Paragraph>
                            )}
                            {char.background && (
                              <Paragraph style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
                                <Text strong>背景：</Text>{char.background}
                              </Paragraph>
                            )}
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </div>
                ) : (
                  <div>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                      尚未生成角色设定，AI 将根据剧情自动生成角色画像、年龄、性格和背景故事
                    </Text>
                    <Button
                      type="primary"
                      icon={generatingProfiles ? <LoadingOutlined /> : <TeamOutlined />}
                      loading={generatingProfiles}
                      onClick={handleGenerateProfiles}
                    >
                      生成角色设定
                    </Button>
                  </div>
                )}
              </div>
            ),
          },
        ]} />
      </Card>
    </div>
  );
}
