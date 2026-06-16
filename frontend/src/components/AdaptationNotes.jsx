import { Collapse, Tag, Empty } from 'antd';
import { EditOutlined, BulbOutlined } from '@ant-design/icons';

function groupByChapter(notes) {
  const map = new Map();
  for (const n of notes) {
    const key = n.chapter || '其他';
    if (!map.has(key)) {
      map.set(key, {
        chapter: key,
        sceneIds: new Set(),
        decisions: [],
      });
    }
    const g = map.get(key);
    (n.scene_ids || []).forEach((id) => g.sceneIds.add(id));
    g.decisions.push(n);
  }
  return [...map.values()];
}

function panelHeader(group, index) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%', minWidth: 0 }}>
      <span
        style={{
          display: 'inline-flex',
          width: 22,
          height: 22,
          borderRadius: 11,
          background: '#1677ff',
          color: '#fff',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 600,
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {index + 1}
      </span>
      <span style={{ fontWeight: 500, fontSize: 14, flexShrink: 0, lineHeight: '24px' }}>{group.chapter}</span>
      <span style={{ display: 'flex', gap: 2, flexWrap: 'wrap', minWidth: 0 }}>
        {[...group.sceneIds].map((id) => (
          <Tag key={id} color="blue" style={{ margin: 0, fontSize: 11, lineHeight: '18px' }}>
            S{id}
          </Tag>
        ))}
      </span>
    </div>
  );
}

export default function AdaptationNotes({ notes }) {
  const data = notes || [];

  if (!data.length) {
    return <Empty description="暂无改编备注" />;
  }

  const groups = groupByChapter(data);

  const items = groups.map((group, gi) => ({
    key: gi,
    label: panelHeader(group, gi),
    children: (
      <div style={{ paddingLeft: 4 }}>
        {group.decisions.map((d, di) => (
          <div
            key={di}
            style={{
              padding: '6px 8px',
              marginBottom: di < group.decisions.length - 1 ? 6 : 0,
              background: 'rgba(0,0,0,0.03)',
              borderRadius: 6,
            }}
          >
            <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              <EditOutlined style={{ color: '#1677ff', fontSize: 13, marginTop: 3 }} />
              <span style={{ fontSize: 13, lineHeight: 1.5 }}>{d.changes}</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <BulbOutlined style={{ color: '#fa8c16', fontSize: 13, marginTop: 3 }} />
              <span style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>{d.reason}</span>
            </div>
          </div>
        ))}
      </div>
    ),
  }));

  return (
    <Collapse
      items={items}
      defaultActiveKey={items.map((_, i) => i)}
      size="small"
      style={{ background: 'transparent' }}
    />
  );
}
