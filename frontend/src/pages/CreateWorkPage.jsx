import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Input,
  Typography,
  message,
  Upload,
  Select,
  Divider,
} from 'antd';
import {
  UploadOutlined,
  ThunderboltOutlined,
  ArrowLeftOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useTask } from '../hooks/useTask';
import TaskProgress from '../components/TaskProgress';

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

export default function CreateWorkPage() {
  const [workTitle, setWorkTitle] = useState('');
  const [novelText, setNovelText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [format, setFormat] = useState('film');
  const [style, setStyle] = useState('faithful');
  const navigate = useNavigate();
  const { submit, status, progress, error, isActive, taskId, yaml } = useTask();

  const handleFileUpload = useCallback(async (file) => {
    setUploading(true);
    try {
      const content = await file.text();
      const trimmed = content.trim();
      if (trimmed.length > MAX_CHARS) {
        message.error(`文件内容超过 ${MAX_CHARS} 字符限制`);
        return false;
      }
      setNovelText(trimmed);
      message.success('文件导入成功');
    } catch (err) {
      message.error('文件读取失败，请确保文件编码正确');
    } finally {
      setUploading(false);
    }
    return false;
  }, []);

  const handleGenerate = async () => {
    if (!workTitle.trim()) {
      message.warning('请先输入作品名');
      return;
    }
    if (!novelText.trim()) {
      message.warning('请输入或上传小说文本');
      return;
    }
    await submit(novelText, format, style);
  };

  if (status === 'completed' && taskId) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Title level={3}>剧本生成成功！</Title>
          <Text type="secondary">正在跳转到剧本工作台...</Text>
          <div style={{ marginTop: 20 }}>
            <Button type="primary" onClick={() => navigate(`/editor?taskId=${taskId}`)}>
              立即查看
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const isPolling = isActive || status === 'submitting';

  return (
    <div style={{ minHeight: '100%', display: 'flex', gap: 24 }}>
      <Card
        style={{ width: 360, flexShrink: 0 }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileTextOutlined />
            <span>创作新作品</span>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <Text strong>作品名</Text>
            <Input
              placeholder="请输入作品名称"
              value={workTitle}
              onChange={(e) => setWorkTitle(e.target.value)}
              size="large"
              style={{ marginTop: 8 }}
              disabled={isPolling}
            />
          </div>

          <Divider style={{ margin: '0' }} />

          <div>
            <Text strong>剧本格式</Text>
            <Select
              value={format}
              onChange={setFormat}
              options={formatOptions}
              size="large"
              disabled={isPolling}
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>

          <div>
            <Text strong>改编风格</Text>
            <Select
              value={style}
              onChange={setStyle}
              options={styleOptions}
              size="large"
              disabled={isPolling}
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>

          <Divider style={{ margin: '0' }} />

          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            block
            loading={isPolling}
            onClick={handleGenerate}
            size="large"
          >
            AI 生成剧本
          </Button>

          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/works')}
          >
            返回作品列表
          </Button>
        </div>
      </Card>

      <Card
        style={{ flex: 1 }}
        title="第一步：输入小说文本"
      >
        {error && (
          <Card
            size="small"
            style={{ marginBottom: 16, background: '#fff2f0', borderColor: '#ffccc7' }}
          >
            <Text type="danger">{error}</Text>
          </Card>
        )}

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <Upload
            accept=".txt,.md,.text"
            showUploadList={false}
            beforeUpload={handleFileUpload}
            disabled={isPolling}
          >
            <Button
              icon={<UploadOutlined />}
              disabled={isPolling}
              loading={uploading}
            >
              {uploading ? '上传中...' : '上传文件'}
            </Button>
          </Upload>
          <Text type="secondary" style={{ fontSize: 13 }}>
            支持 .txt、.md 等文本格式
          </Text>
        </div>

        <TextArea
          value={novelText}
          onChange={(e) => setNovelText(e.target.value)}
          placeholder="在此粘贴或输入小说文本…"
          rows={20}
          maxLength={MAX_CHARS}
          showCount
          disabled={isPolling}
          style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 12 }}
        />

        {novelText.length > 40000 && (
          <Text type="warning" style={{ display: 'block', marginBottom: 12 }}>
            文本较长，AI 转换可能因 token 限制而截断，建议分段转换。
          </Text>
        )}

        {isPolling && (
          <div style={{ marginTop: 24 }}>
            <TaskProgress status={status} progress={progress} />
          </div>
        )}
      </Card>
    </div>
  );
}
