import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tabs, Empty, Table, Tag, Typography, Button, Row, Col, Collapse } from 'antd';
import {
  ArrowLeftOutlined,
  UnorderedListOutlined,
  TeamOutlined,
  EditOutlined,
  EnvironmentOutlined,
  UserOutlined,
  OrderedListOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { parseScript, characterTypeLabel, characterTypeColor } from '../utils/parseScript';
import { useTask } from '../hooks/useTask';
import { getScriptByTaskId } from '../services/api';
import useScriptStore from '../store/scriptStore';
import { getWork } from '../services/work';

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
          <Text code>{scene.slugline}</Text>
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
                      {(item.type === 'transition' || item.type === 'sound' || item.type === 'note') && (
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
  const [script, setScript] = useState(null);
  const [loading, setLoading] = useState(true);
  const { yaml } = useTask();
  const setScriptStore = useScriptStore((s) => s.setScript);

  useEffect(() => {
    const loadWork = async () => {
      try {
        const data = await getWork(id);
        setWork(data);
        if (data.taskId) {
          const scriptData = await getScriptByTaskId(data.taskId);
          setScript(scriptData);
          setScriptStore(scriptData);
        }
      } catch (err) {
        console.error('加载作品数据失败:', err);
      } finally {
        setLoading(false);
      }
    };
    loadWork();
  }, [id]);

  const scenes =
    script?.scenes ||
    (yaml ? parseScript(yaml).scenes : []) ||
    [];
  const characters =
    script?.characters ||
    (yaml ? parseScript(yaml).characters : []) ||
    [];

  const renderScenes = () => {
    if (scenes.length > 0) {
      return (
        <div>
          <Title level={4} style={{ marginBottom: 16 }}>
            场景列表 ({scenes.length})
          </Title>
          <Row gutter={[16, 16]}>
            {scenes.map((scene, idx) => (
              <Col xs={24} sm={12} lg={8} xl={6} key={scene.id || idx}>
                <SceneCard scene={scene} index={idx} />
              </Col>
            ))}
          </Row>
        </div>
      );
    }
    return <Empty description="暂无场景数据。请先生成剧本后可在此查看。" />;
  };

  const renderCharacters = () => {
    if (characters.length > 0) {
      return (
        <Card title={`角色管理 (${characters.length})`}>
          <Table
            dataSource={characters.map((c, i) => ({ ...c, key: c.id || i }))}
            columns={characterColumns}
            pagination={false}
            size="middle"
            locale={{ emptyText: '暂无角色' }}
          />
        </Card>
      );
    }
    return <Empty description="暂无角色数据。请先生成剧本后可在此查看。" />;
  };

  const renderEditor = () => {
    if (script?.id) {
      return (
        <Card>
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Button
              type="primary"
              onClick={() => navigate(`/editor?scriptId=${script.id}`)}
            >
              打开剧本工作台
            </Button>
          </div>
        </Card>
      );
    }
    return <Empty description="暂无剧本数据。请先生成剧本。" />;
  };

  const tabItems = [
    {
      key: 'scenes',
      label: (
        <span>
          <UnorderedListOutlined /> 场景列表
        </span>
      ),
      children: renderScenes(),
    },
    {
      key: 'characters',
      label: (
        <span>
          <TeamOutlined /> 角色管理
        </span>
      ),
      children: renderCharacters(),
    },
    {
      key: 'editor',
      label: (
        <span>
          <EditOutlined /> 剧本工作台
        </span>
      ),
      children: renderEditor(),
    },
  ];

  return (
    <div style={{ minHeight: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/works')}>
          返回作品列表
        </Button>
        <Title level={3} style={{ margin: 0 }}>
          {work?.title || '作品详情'}
        </Title>
        {work?.summary && (
          <Text type="secondary" style={{ fontSize: 14 }}>
            {work.summary}
          </Text>
        )}
      </div>
      <Card bordered={false}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
        ) : (
          <Tabs items={tabItems} />
        )}
      </Card>
    </div>
  );
}
