import { Table, Tag, Alert } from 'antd';
import { useMemo } from 'react';
import { parseScriptYaml } from '../utils/validators';

const typeColors = {
  protagonist: 'red',
  antagonist: 'volcano',
  supporting: 'blue',
  extra: 'default',
};

export default function CharacterList({ yamlContent }) {
  const { script, errors } = useMemo(
    () => parseScriptYaml(yamlContent),
    [yamlContent],
  );

  const characters = script?.characters || [];

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '角色名', dataIndex: 'name', key: 'name' },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (t) => <Tag color={typeColors[t] || 'default'}>{t}</Tag>,
    },
    { title: '简介', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '首次出场', dataIndex: 'first_appearance', key: 'first_appearance' },
  ];

  if (errors.length && !script) {
    return <Alert type="error" message={errors[0]} showIcon />;
  }

  if (!characters.length) {
    return <Alert type="info" message="暂无角色数据" showIcon />;
  }

  return (
    <Table
      dataSource={characters}
      columns={columns}
      rowKey={(r) => r.id || r.name}
      pagination={{ pageSize: 10 }}
    />
  );
}
