import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Typography, Input, Select, Button, message } from 'antd';
import { ThunderboltOutlined, ClearOutlined } from '@ant-design/icons';
import TaskProgress from '../components/TaskProgress';
import { useTask } from '../hooks/useTask';

const { TextArea } = Input;
const { Title, Text } = Typography;
const MAX_CHARS = 50000;

const formatOptions = [
  { value: 'film', label: '电影' },
  { value: 'tv_series', label: '电视剧' },
  { value: 'stage_play', label: '舞台剧' },
];

const styleOptions = [
  { value: 'faithful', label: '忠实原著' },
  { value: 'commercial', label: '商业化' },
  { value: 'experimental', label: '实验性' },
];

export default function NovelInputPage() {
  const navigate = useNavigate();
  const { submit, status, progress, error, isActive, yaml, taskId } = useTask();

  const [novelText, setNovelText] = useState('');
  const [format, setFormat] = useState('film');
  const [style, setStyle] = useState('faithful');

  const charCount = novelText.length;

  // When conversion completes, auto-navigate to editor with taskId
  useEffect(() => {
    if (status === 'completed' && yaml && taskId) {
      navigate(`/editor?taskId=${taskId}`);
    }
  }, [status, yaml, taskId, navigate]);

  const handleSubmit = async () => {
    if (!novelText.trim()) {
      message.warning('请先输入小说内容');
      return;
    }
    if (isActive) {
      message.warning('当前有任务正在处理，请等待完成');
      return;
    }
    await submit(novelText, format, style);
  };

  const handleClear = () => {
    setNovelText('');
  };

  const isPolling = isActive || status === 'submitting';

  return (
    <Card>
      <Title level={4} style={{ marginTop: 0 }}>
        第一步：输入小说文本
      </Title>

      {error && (
        <Card
          size="small"
          style={{ marginBottom: 16, background: '#fff2f0', borderColor: '#ffccc7' }}
        >
          <Text type="danger">{error}</Text>
        </Card>
      )}

      <TextArea
        value={novelText}
        onChange={(e) => setNovelText(e.target.value)}
        placeholder="在此粘贴或输入小说文本…"
        rows={16}
        maxLength={MAX_CHARS}
        showCount
        disabled={isPolling}
        style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 12 }}
      />

      {charCount > 40000 && (
        <Text type="warning" style={{ display: 'block', marginBottom: 12 }}>
          文本较长，AI 转换可能因 token 限制而截断，建议分段转换。
        </Text>
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            剧本格式
          </Text>
          <Select
            value={format}
            onChange={setFormat}
            options={formatOptions}
            disabled={isPolling}
            style={{ minWidth: 120 }}
          />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            改编风格
          </Text>
          <Select
            value={style}
            onChange={setStyle}
            options={styleOptions}
            disabled={isPolling}
            style={{ minWidth: 120 }}
          />
        </div>
        <Button
          type="primary"
          icon={<ThunderboltOutlined />}
          onClick={handleSubmit}
          loading={isPolling}
          size="large"
        >
          AI 转换
        </Button>
        {!isPolling && (
          <Button icon={<ClearOutlined />} onClick={handleClear} disabled={!novelText}>
            清空
          </Button>
        )}
      </div>

      {isPolling && (
        <div style={{ marginTop: 24 }}>
          <TaskProgress status={status} progress={progress} />
        </div>
      )}
    </Card>
  );
}
