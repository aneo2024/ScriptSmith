import { Table, Alert, Tag } from 'antd';
import { useMemo } from 'react';
import { parseScriptYaml } from '../utils/validators';

export default function AdaptationNotes({ yamlContent }) {
  const { script, errors } = useMemo(
    () => parseScriptYaml(yamlContent),
    [yamlContent],
  );

  const notes = script?.adaptation_notes || [];

  const columns = [
    { title: '章节', dataIndex: 'chapter', key: 'chapter', width: 120 },
    {
      title: '关联场景',
      dataIndex: 'scene_ids',
      key: 'scene_ids',
      render: (ids) =>
        (ids || []).map((id) => (
          <Tag key={id}>{id}</Tag>
        )),
    },
    { title: '改动', dataIndex: 'changes', key: 'changes', ellipsis: true },
    { title: '原因', dataIndex: 'reason', key: 'reason', ellipsis: true },
  ];

  if (errors.length && !script) {
    return <Alert type="error" message={errors[0]} showIcon />;
  }

  if (!notes.length) {
    return <Alert type="info" message="暂无改编备注" showIcon />;
  }

  return (
    <Table
      dataSource={notes}
      columns={columns}
      rowKey={(r, i) => `${r.chapter}-${i}`}
      pagination={{ pageSize: 8 }}
    />
  );
}
