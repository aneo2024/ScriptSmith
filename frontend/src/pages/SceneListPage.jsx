import { Card, Row, Col, Tag, Typography, Collapse, Empty } from 'antd';
import {
  EnvironmentOutlined,
  UserOutlined,
  OrderedListOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import { useTask } from '../hooks/useTask';
import { parseScript } from '../utils/parseScript';

const { Title, Paragraph, Text } = Typography;

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

function SceneCard({ scene, index }) {
  const contentStats = scene.content
    ? scene.content.reduce(
        (acc, c) => {
          acc[c.type] = (acc[c.type] || 0) + 1;
          return acc;
        },
        {},
      )
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
            <Tag key={name} style={{ marginBottom: 4 }}>{name}</Tag>
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
                    <div key={i} style={{ marginBottom: 8, paddingLeft: 8, borderLeft: '2px solid #e8e8e8' }}>
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

export default function SceneListPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const taskIdFromUrl = searchParams.get('taskId');

  const { yaml, taskId: contextTaskId } = useTask();
  const effectiveTaskId = taskIdFromUrl || contextTaskId;

  const { scenes } = parseScript(yaml);

  if (!scenes.length) {
    return (
      <Card>
        <Title level={4}>场景列表</Title>
        <Empty description="暂无场景数据。请先完成小说转换。" />
      </Card>
    );
  }

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
