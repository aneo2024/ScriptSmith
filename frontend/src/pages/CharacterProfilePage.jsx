import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Input,
  Typography,
  message,
  Spin,
  Space,
  Divider,
  App,
} from 'antd';
import {
  ArrowLeftOutlined,
  ThunderboltOutlined,
  SaveOutlined,
  EditOutlined,
  UserOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  getWork,
  generateCharacterBiography,
  updateCharacterProfile,
} from '../services/work';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// 简易 Markdown 渲染：把 ## 标题加粗、段落换行
function renderMarkdown(md) {
  if (!md) return null;
  return md.split('\n').map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return <br key={idx} />;
    if (trimmed.startsWith('## ')) {
      return (
        <div
          key={idx}
          style={{
            fontSize: 16,
            fontWeight: 600,
            margin: '14px 0 6px',
            color: '#3a6b28',
          }}
        >
          {trimmed.slice(3)}
        </div>
      );
    }
    return (
      <Paragraph
        key={idx}
        style={{ margin: '6px 0', fontSize: 14, lineHeight: 1.8 }}
      >
        {trimmed}
      </Paragraph>
    );
  });
}

export default function CharacterProfilePage() {
  const { id: workId, index: indexStr } = useParams();
  const navigate = useNavigate();
  const { modal } = App.useApp();
  const charIndex = parseInt(indexStr, 10);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [, setWork] = useState(null);
  const [form, setForm] = useState({
    appearance: '',
    personality: '',
    background: '',
    biography: '',
  });

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const w = await getWork(workId);
      setWork(w);
      let profiles = [];
      if (w.character_profiles) {
        profiles = typeof w.character_profiles === 'string'
          ? JSON.parse(w.character_profiles)
          : w.character_profiles;
      }
      if (charIndex < 0 || charIndex >= profiles.length) {
        message.error('该角色小传不存在');
        navigate(`/works/${workId}`);
        return;
      }
      const p = profiles[charIndex];
      setProfile(p);
      setForm({
        appearance: p.appearance || '',
        personality: p.personality || '',
        background: p.background || '',
        biography: p.biography || '',
      });
    } catch (err) {
      message.error('加载失败: ' + (err.response?.data?.error || err.message));
      navigate(`/works/${workId}`);
    } finally {
      setLoading(false);
    }
  }, [workId, charIndex, navigate]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleGenerateBiography = async () => {
    setGenerating(true);
    try {
      const { profile: updated } = await generateCharacterBiography(workId, charIndex);
      setProfile(updated);
      setForm((prev) => ({ ...prev, biography: updated.biography || '' }));
      message.success('生平传记已生成');
    } catch (err) {
      message.error('AI 生成失败: ' + (err.response?.data?.error || err.message));
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { profile: updated } = await updateCharacterProfile(workId, charIndex, {
        appearance: form.appearance,
        personality: form.personality,
        background: form.background,
        biography: form.biography,
      });
      setProfile(updated);
      setEditing(false);
      message.success('已保存');
    } catch (err) {
      message.error('保存失败: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (editing) {
      modal.confirm({
        title: '放弃编辑？',
        content: '当前修改尚未保存，确定要离开吗？',
        okText: '离开',
        cancelText: '继续编辑',
        onOk: () => navigate(`/works/${workId}`),
      });
    } else {
      navigate(`/works/${workId}`);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" tip="加载人物小传中..." />
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ padding: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/works/${workId}`)}>
          返回作品详情
        </Button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100%' }}>
      {/* 顶部操作栏 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
          返回作品详情
        </Button>
        <Title level={3} style={{ margin: 0 }}>
          <UserOutlined style={{ marginRight: 8 }} />
          {profile.name} 的小传
        </Title>
        {profile.gender && (
          <span style={{ color: '#666', fontSize: 14 }}>· {profile.gender}</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        {editing ? (
          <>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
            >
              保存修改
            </Button>
            <Button onClick={() => {
              setForm({
                appearance: profile.appearance || '',
                personality: profile.personality || '',
                background: profile.background || '',
                biography: profile.biography || '',
              });
              setEditing(false);
            }}>
              取消
            </Button>
          </>
        ) : (
          <Button
            icon={<EditOutlined />}
            onClick={() => setEditing(true)}
          >
            编辑小传
          </Button>
        )}
        <Button
          icon={generating ? <ReloadOutlined spin /> : <ThunderboltOutlined />}
          loading={generating}
          onClick={handleGenerateBiography}
        >
          {generating ? 'AI 生成中...' : (profile.biography ? '重新生成生平' : 'AI 生平传记')}
        </Button>
      </div>

      {/* 基础信息卡片 */}
      <Card
        title="基础信息"
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <FieldView
            label="外貌"
            value={profile.appearance}
            editing={editing}
            onChange={(v) => setForm({ ...form, appearance: v })}
            formValue={form.appearance}
            placeholder="长相/体型/肤色等固定生理特征"
          />
          <FieldView
            label="性格"
            value={profile.personality}
            editing={editing}
            onChange={(v) => setForm({ ...form, personality: v })}
            formValue={form.personality}
            placeholder="性格特质、内在动机"
          />
          <FieldView
            label="背景"
            value={profile.background}
            editing={editing}
            onChange={(v) => setForm({ ...form, background: v })}
            formValue={form.background}
            placeholder="身世、出身、关键经历"
          />
        </Space>
      </Card>

      {/* 生平传记卡片 */}
      <Card
        title="生平传记 / 人物评价"
        size="small"
        extra={
          editing && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              支持 Markdown 格式
            </Text>
          )
        }
      >
        {editing ? (
          <TextArea
            value={form.biography}
            onChange={(e) => setForm({ ...form, biography: e.target.value })}
            placeholder="可点击上方「AI 生平传记」自动生成，也可手动撰写。支持 ## 段落标题。"
            autoSize={{ minRows: 12, maxRows: 30 }}
            style={{ fontSize: 14, lineHeight: 1.8 }}
          />
        ) : profile.biography ? (
          <div>{renderMarkdown(profile.biography)}</div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              尚未生成生平传记，点击上方「AI 生平传记」让 AI 为你撰写
            </Text>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={generating}
              onClick={handleGenerateBiography}
            >
              立即生成
            </Button>
          </div>
        )}
      </Card>

      {editing && (
        <>
          <Divider />
          <div style={{ color: '#999', fontSize: 12 }}>
            提示：编辑时随时可点击「保存修改」生效；点击「取消」会放弃当前修改。
          </div>
        </>
      )}
    </div>
  );
}

function FieldView({ label, value, editing, onChange, formValue, placeholder }) {
  return (
    <div>
      <Text strong style={{ display: 'block', marginBottom: 6 }}>{label}</Text>
      {editing ? (
        <TextArea
          value={formValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoSize={{ minRows: 2, maxRows: 6 }}
          maxLength={500}
          showCount
        />
      ) : (
        <Paragraph style={{ margin: 0, color: value ? '#333' : '#bbb' }}>
          {value || '（暂无）'}
        </Paragraph>
      )}
    </div>
  );
}
