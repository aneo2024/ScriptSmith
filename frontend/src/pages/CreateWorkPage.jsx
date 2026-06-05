import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card,
  Button,
  Input,
  Typography,
  message,
  Upload,
  Select,
  Divider,
  Tag,
} from 'antd';
import {
  UploadOutlined,
  ThunderboltOutlined,
  ArrowLeftOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useTask } from '../hooks/useTask';
import TaskProgress from '../components/TaskProgress';
import { createWork, getWork } from '../services/work';

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

const formatMap = {
  film: '电影',
  tv_series: '电视剧',
  stage_play: '舞台剧',
};

export default function CreateWorkPage() {
  const [searchParams] = useSearchParams();
  const existingWorkId = searchParams.get('workId');

  const [workTitle, setWorkTitle] = useState('');
  const [novelText, setNovelText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [format, setFormat] = useState('film');
  const [style, setStyle] = useState('faithful');
  const [saving, setSaving] = useState(false);
  const [existingWork, setExistingWork] = useState(null);
  const navigate = useNavigate();
  const { submit, status, progress, error, isActive, taskId } = useTask();

  // 如果传入了 workId，加载已有作品信息
  useEffect(() => {
    if (existingWorkId) {
      getWork(existingWorkId).then((w) => {
        setExistingWork(w);
        setWorkTitle(w.title);
        setFormat(w.genre || 'film');
      }).catch(() => {});
    }
  }, [existingWorkId]);

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

    setSaving(true);
    try {
      if (existingWorkId) {
        // 已有作品：直接提交 AI 转换，关联到已有作品
        await submit(novelText, format, style, existingWorkId);
      } else {
        // 新作品：先创建作品记录，再提交转换
        const work = await createWork({
          title: workTitle,
          summary: '',
          genre: format,
          main_char: '',
          supporting_chars: [],
          word_count: novelText.length,
        });
        await submit(novelText, format, style, work.id);
      }
    } catch (err) {
      message.error('操作失败: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (status === 'completed' && taskId) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Title level={3}>剧本生成成功！</Title>
          <Text type="secondary">
            {existingWorkId
              ? `已添加到作品「${existingWork?.title || workTitle}」`
              : `作品「${workTitle}」已创建，剧本已自动关联`}
          </Text>
          <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Button type="primary" onClick={() => navigate(`/editor?taskId=${taskId}`)}>
              查看剧本
            </Button>
            <Button onClick={() => navigate(existingWorkId ? `/works/${existingWorkId}` : '/works')}>
              {existingWorkId ? '返回作品详情' : '返回作品列表'}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const isPolling = isActive || status === 'submitting';
  const isExistingWork = !!existingWorkId;

  return (
    <div style={{ minHeight: '100%', display: 'flex', gap: 24 }}>
      <Card
        style={{ width: 360, flexShrink: 0 }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileTextOutlined />
            <span>{isExistingWork ? '添加新剧集' : '创作新作品'}</span>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {isExistingWork ? (
            <div>
              <Text strong>作品</Text>
              <div style={{ marginTop: 8, padding: '8px 12px', background: '#f5f5f5', borderRadius: 6, fontSize: 15 }}>
                {workTitle}
                <Tag style={{ marginLeft: 8 }}>{formatMap[format] || format}</Tag>
              </div>
            </div>
          ) : (
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
          )}

          <Divider style={{ margin: '0' }} />

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
            loading={isPolling || saving}
            onClick={handleGenerate}
            size="large"
          >
            {saving ? '提交中...' : isPolling ? 'AI 生成中...' : isExistingWork ? '生成新剧集' : 'AI 生成剧本'}
          </Button>

          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(isExistingWork ? `/works/${existingWorkId}` : '/works')}
          >
            {isExistingWork ? '返回作品详情' : '返回作品列表'}
          </Button>
        </div>
      </Card>

      <Card
        style={{ flex: 1 }}
        title={isExistingWork ? `为「${workTitle}」输入新的小说文本` : '输入小说文本'}
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
