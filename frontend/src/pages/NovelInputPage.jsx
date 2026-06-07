import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Typography, Input, Select, Button, message, Upload, Alert } from 'antd';
import { ThunderboltOutlined, ClearOutlined, UploadOutlined } from '@ant-design/icons';
import TaskProgress from '../components/TaskProgress';
import { useTask } from '../hooks/useTask';
import { listProviders } from '../services/api';
import {
  formatOptions,
  styleOptions,
  DEFAULT_FORMAT,
  DEFAULT_STYLE,
} from '../utils/scriptOptions';

const { TextArea } = Input;
const { Title, Text } = Typography;
const MAX_CHARS = 50000;

export default function NovelInputPage() {
  const navigate = useNavigate();
  const { submit, status, progress, error, isActive, yaml, taskId, reset, stage, elapsedMs, cancel } = useTask();

  const [novelText, setNovelText] = useState(() => {
    try {
      return localStorage.getItem('novel_draft') || '';
    } catch {
      return '';
    }
  });
  const [format, setFormat] = useState(DEFAULT_FORMAT);
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [uploading, setUploading] = useState(false);

  // AI Provider 选择
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');

  useEffect(() => {
    listProviders()
      .then((resp) => {
        const list = resp?.providers || [];
        setProviders(list);
        // 默认选 is_default 的
        const def = list.find((p) => p.is_default);
        if (def) {
          setSelectedProvider(def.id);
        }
      })
      .catch(() => {
        // 失败则保持空，使用系统默认
      });
  }, []);

  const charCount = novelText.length;

  useEffect(() => {
    if (status === 'completed' && yaml && taskId) {
      try { localStorage.removeItem('novel_draft'); } catch { /* ignore */ }
      navigate(`/editor?taskId=${taskId}`);
    }
  }, [status, yaml, taskId, navigate]);

  const handleTextChange = (e) => {
    const val = e.target.value;
    setNovelText(val);
    try { localStorage.setItem('novel_draft', val); } catch { /* ignore */ }
  };

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
      try { localStorage.setItem('novel_draft', trimmed); } catch { /* ignore */ }
      message.success('文件导入成功');
    } catch (err) {
      message.error('文件读取失败，请确保文件编码正确');
    } finally {
      setUploading(false);
    }
    return false;
  }, []);

  const handleSubmit = async () => {
    if (!novelText.trim()) {
      message.warning('请先输入小说内容');
      return;
    }
    if (isActive) {
      message.warning('当前有任务正在处理，请等待完成');
      return;
    }
    await submit(novelText, format, style, null, selectedProvider || undefined);
  };

  const handleClear = () => {
    setNovelText('');
    try { localStorage.removeItem('novel_draft'); } catch { /* ignore */ }
  };

  const isPolling = isActive || status === 'submitting';

  return (
    <Card>
      <Title level={4} style={{ marginTop: 0 }}>
        输入小说文本
      </Title>

      {/* 进度面板（polling 时置顶，最醒目） */}
      {isPolling && (
        <div style={{ marginBottom: 24 }}>
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

      {/* 锁定提示（polling 时显示在表单上方） */}
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
          accept=".txt,.md,.txt,.text"
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
        onChange={handleTextChange}
        placeholder="在此粘贴或输入小说文本…"
        rows={8}
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
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            使用大模型
          </Text>
          <Select
            value={selectedProvider || 'system'}
            onChange={(v) => setSelectedProvider(v === 'system' ? '' : v)}
            options={[
              { value: 'system', label: '系统默认' },
              ...providers.map((p) => ({
                value: p.id,
                label: `${p.name} · ${p.model}${p.is_default ? '（默认）' : ''}`,
              })),
            ]}
            disabled={isPolling}
            style={{ minWidth: 220 }}
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
    </Card>
  );
}