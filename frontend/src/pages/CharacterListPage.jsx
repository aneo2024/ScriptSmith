import { Table, Tag, Typography, Card } from 'antd';
import { useLocation } from 'react-router-dom';
import { useTask } from '../hooks/useTask';
import { parseScript, characterTypeLabel, characterTypeColor } from '../utils/parseScript';

const { Title, Paragraph } = Typography;

const columns = [
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
    filters: Object.entries(characterTypeLabel).map(([value, text]) => ({
      text,
      value,
    })),
    onFilter: (value, record) => record.type === value,
    render: (type) => (
      <Tag color={characterTypeColor[type] || 'default'}>
        {characterTypeLabel[type] || type}
      </Tag>
    ),
  },
  {
    title: '简介',
    dataIndex: 'description',
    key: 'description',
    ellipsis: true,
  },
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 120,
    render: (id) => <code>{id}</code>,
  },
];

export default function CharacterListPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const taskIdFromUrl = searchParams.get('taskId');

  const { yaml, taskId: contextTaskId } = useTask();
  const effectiveTaskId = taskIdFromUrl || contextTaskId;

  const { characters } = parseScript(yaml);

  if (!characters.length) {
    return (
      <Card>
        <Title level={4}>角色管理</Title>
        <Paragraph type="secondary">
          暂无角色数据。请先完成小说转换，生成剧本后可在此查看角色列表。
        </Paragraph>
      </Card>
    );
  }

  return (
    <Card title={`角色管理 (${characters.length})`} extra={<code>任务: {effectiveTaskId?.slice(0, 8)}…</code>}>
      <Table
        dataSource={characters.map((c, i) => ({ ...c, key: c.id || i }))}
        columns={columns}
        pagination={false}
        size="middle"
        locale={{ emptyText: '暂无角色' }}
      />
    </Card>
  );
}
