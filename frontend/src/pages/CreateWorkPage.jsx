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
  Space,
  Alert,
} from 'antd';
import {
  UploadOutlined,
  ThunderboltOutlined,
  ArrowLeftOutlined,
  FileTextOutlined,
  PlusOutlined,
  DeleteOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useTask } from '../hooks/useTask';
import TaskProgress from '../components/TaskProgress';
import { createWork, getWork } from '../services/work';
import {
  formatOptions,
  styleOptions,
  DEFAULT_FORMAT,
  DEFAULT_STYLE,
  getFormatShortLabel,
} from '../utils/scriptOptions';

const { TextArea } = Input;
const { Title, Text } = Typography;
const MAX_CHARS = 50000;

const emptyChar = { name: '', gender: '', personality: '' };

export default function CreateWorkPage() {
  const [searchParams] = useSearchParams();
  const existingWorkId = searchParams.get('workId');

  const [workTitle, setWorkTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [novelText, setNovelText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [format, setFormat] = useState(DEFAULT_FORMAT);
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [saving, setSaving] = useState(false);
  const [existingWork, setExistingWork] = useState(null);
  const [characters, setCharacters] = useState([]);
  const navigate = useNavigate();
  const { submit, status, progress, error, isActive, taskId, stage, elapsedMs, cancel, reset } = useTask();

  useEffect(() => {
    reset();
    setWorkTitle('');
    setSynopsis('');
    setNovelText('');
    setFormat(DEFAULT_FORMAT);
    setStyle(DEFAULT_STYLE);
    setCharacters([]);
    setExistingWork(null);
  }, []);

  useEffect(() => {
    if (existingWorkId) {
      getWork(existingWorkId).then((w) => {
        setExistingWork(w);
        setWorkTitle(w.title);
        setFormat(w.genre || DEFAULT_FORMAT);
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

  const addCharacter = () => {
    setCharacters([...characters, { ...emptyChar }]);
  };

  const removeCharacter = (index) => {
    setCharacters(characters.filter((_, i) => i !== index));
  };

  const updateCharacter = (index, field, value) => {
    setCharacters(characters.map((c, i) =>
      i === index ? { ...c, [field]: value } : c
    ));
  };

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
      const validCharacters = characters.filter((c) => c.name.trim());
      if (existingWorkId) {
        await submit(novelText, format, style, existingWorkId);
      } else {
        const work = await createWork({
          title: workTitle,
          synopsis: synopsis,
          summary: '',
          cover_image: '',
          genre: format,
          main_char: validCharacters.length > 0 ? validCharacters[0].name : '',
          character_profiles: validCharacters,
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
        style={{ width: 420, flexShrink: 0 }}
        bodyStyle={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}
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
                <Tag style={{ marginLeft: 8 }}>{getFormatShortLabel(format)}</Tag>
              </div>
            </div>
          ) : (
            <>
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
                <Text strong>一句话梗概</Text>
                <Input
                  placeholder="用一句话概括你的故事…"
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  style={{ marginTop: 8 }}
                  disabled={isPolling}
                  maxLength={100}
                  showCount
                />
              </div>

              <Divider style={{ margin: '0' }} />

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong>
                    <UserOutlined style={{ marginRight: 4 }} />
                    人物小传
                  </Text>
                  <Button
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={addCharacter}
                    disabled={isPolling}
                    type="dashed"
                  >
                    添加角色
                  </Button>
                </div>
                {characters.length === 0 && (
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                    尚未添加角色，可点击"添加角色"手动录入，或留空由 AI 识别
                  </Text>
                )}
                {characters.map((char, idx) => (
                  <Card
                    key={idx}
                    size="small"
                    style={{ marginTop: 8 }}
                    extra={
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeCharacter(idx)}
                      />
                    }
                    title={<Text style={{ fontSize: 13 }}>角色 {idx + 1}</Text>}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Input
                        size="small"
                        placeholder="姓名"
                        value={char.name}
                        onChange={(e) => updateCharacter(idx, 'name', e.target.value)}
                        disabled={isPolling}
                      />
                      <Select
                        size="small"
                        placeholder="性别"
                        value={char.gender || undefined}
                        onChange={(v) => updateCharacter(idx, 'gender', v)}
                        style={{ width: 100 }}
                        disabled={isPolling}
                        options={[
                          { value: '男', label: '男' },
                          { value: '女', label: '女' },
                        ]}
                        allowClear
                      />
                      <TextArea
                        size="small"
                        placeholder="性格特点（可留空，进入作品详情后由 AI 生成完整小传）"
                        value={char.personality}
                        onChange={(e) => updateCharacter(idx, 'personality', e.target.value)}
                        disabled={isPolling}
                        autoSize={{ minRows: 2, maxRows: 4 }}
                        maxLength={200}
                      />
                    </Space>
                  </Card>
                ))}
              </div>
            </>
          )}

          {!isExistingWork && <Divider style={{ margin: '0' }} />}

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
        {/* 进度面板（polling 时置顶） */}
        {isPolling && (
          <div style={{ marginBottom: 20 }}>
            <TaskProgress
              status={status}
              progress={progress}
              stage={stage}
              elapsedMs={elapsedMs}
              error={error}
              onCancel={cancel}
              onReset={reset}
            />
          </div>
        )}

        {/* 锁定提示 */}
        {isPolling && (
          <Alert
            type="info"
            message="输入内容已锁定，AI 正在后台生成剧本，你可以关闭此页面，稍后回来继续。"
            style={{ marginBottom: 16 }}
            closable={false}
          />
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
      </Card>
    </div>
  );
}
