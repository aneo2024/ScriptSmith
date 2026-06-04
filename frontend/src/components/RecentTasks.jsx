import { List, Button, Tag, Typography, Tooltip, Popconfirm } from 'antd';
import { HistoryOutlined, DeleteOutlined, ClearOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useRecentTasks } from '../hooks/useRecentTasks';

const { Text } = Typography;

const statusTag = {
  completed: <Tag color="green">完成</Tag>,
  failed: <Tag color="red">失败</Tag>,
};

function formatTime(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function RecentTasks({ collapsed }) {
  const navigate = useNavigate();
  const { tasks, removeTask, clearAll } = useRecentTasks();

  if (!tasks.length) return null;

  return (
    <div style={{ padding: collapsed ? '8px 4px' : '8px 12px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        {!collapsed && (
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
            <HistoryOutlined style={{ marginRight: 4 }} />
            最近任务
          </Text>
        )}
        {!collapsed && (
          <Popconfirm
            title="清除所有任务记录？"
            onConfirm={clearAll}
            okText="确认"
            cancelText="取消"
          >
            <Button
              type="text"
              size="small"
              icon={<ClearOutlined />}
              style={{ color: 'rgba(255,255,255,0.45)' }}
            />
          </Popconfirm>
        )}
      </div>

      <List
        size="small"
        dataSource={tasks.slice(0, 5)}
        renderItem={(item) => (
          <Tooltip
            key={item.taskId}
            title={`ID: ${item.taskId?.slice(0, 8)}… | ${formatTime(item.updatedAt)}`}
            placement="right"
          >
            <div
              style={{
                padding: '4px 8px',
                marginBottom: 4,
                borderRadius: 4,
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onClick={() => navigate(`/editor?taskId=${item.taskId}`)}
            >
              {!collapsed && (
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: 12,
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.taskId?.slice(0, 8)}…
                </Text>
              )}
              {!collapsed && (statusTag[item.status] || <Tag>{item.status}</Tag>)}
              {!collapsed && (
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  style={{ color: 'rgba(255,255,255,0.45)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTask(item.taskId);
                  }}
                />
              )}
            </div>
          </Tooltip>
        )}
      />
    </div>
  );
}
