import { Spin, Progress } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const statusLabel = {
  pending: '任务已创建，等待处理…',
  processing: 'AI 正在转换中…',
  completed: '转换完成',
  failed: '转换失败',
};

export default function TaskProgress({ status, progress }) {
  const spinIcon = <LoadingOutlined style={{ fontSize: 32 }} spin />;

  return (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      <Spin
        indicator={spinIcon}
        spinning={status !== 'completed' && status !== 'failed'}
      />
      <Progress
        percent={Math.round(progress * 100)}
        status={status === 'failed' ? 'exception' : status === 'completed' ? 'success' : 'active'}
        style={{ maxWidth: 400, margin: '16px auto' }}
      />
      <p style={{ color: status === 'failed' ? '#ff4d4f' : '#1677ff', marginTop: 8 }}>
        {statusLabel[status] || status}
      </p>
    </div>
  );
}
