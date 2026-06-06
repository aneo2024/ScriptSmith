import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spin, Button, Typography, message, Select, Space } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, SwapOutlined, FileTextOutlined } from '@ant-design/icons';
import SceneNav from '../components/SceneNav';
import SceneCard from '../components/SceneCard';
import useScriptStore from '../store/scriptStore';
import { useTask } from '../hooks/useTask';
import { getScriptByTaskId, exportScriptYAML } from '../services/api';
import { listWorkScripts } from '../services/work';
import '../styles/script-editor.css';

const { Title, Text } = Typography;

function SceneCanvas() {
  const script = useScriptStore((s) => s.script);
  const selectedSceneId = useScriptStore((s) => s.selectedSceneId);
  const scenes = script?.scenes || [];
  const selectedScene = scenes.find((s) => s.id === selectedSceneId);

  if (!selectedScene) {
    return (
      <div className="script-editor__canvas">
        <div className="script-editor__canvas-placeholder">
          请在左侧选择一个场景查看
        </div>
      </div>
    );
  }

  return (
    <div className="script-editor__canvas">
      <SceneCard scene={selectedScene} />
    </div>
  );
}

export default function EditorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scriptId = searchParams.get('scriptId');
  const taskId = searchParams.get('taskId');
  const workId = searchParams.get('workId');

  const isLoading = useScriptStore((s) => s.isLoading);
  const loadScript = useScriptStore((s) => s.loadScript);
  const setScript = useScriptStore((s) => s.setScript);
  const script = useScriptStore((s) => s.script);
  const { reset } = useTask();

  // 剧集列表（当 workId 存在时加载）
  const [episodes, setEpisodes] = useState([]);

  useEffect(() => {
    if (scriptId) {
      loadScript(scriptId);
    } else if (taskId) {
      getScriptByTaskId(taskId)
        .then((data) => setScript(data))
        .catch((err) => console.error('通过任务ID加载剧本失败:', err));
    }
  }, [scriptId, taskId]);

  // 加载同一作品下的所有剧集，用于切换
  useEffect(() => {
    if (workId) {
      listWorkScripts(workId).then((data) => {
        setEpisodes(data.scripts || []);
      }).catch(() => {});
    }
  }, [workId]);

  const hasParam = scriptId || taskId;

  const handleBack = () => {
    reset();
    if (workId) {
      navigate(`/works/${workId}`);
    } else if (script?.work_id) {
      navigate(`/works/${script.work_id}`);
    } else {
      navigate('/works');
    }
  };

  const handleExport = async () => {
    const id = script?.id;
    if (!id) {
      message.warning('剧本数据未加载，无法导出');
      return;
    }
    try {
      const blob = await exportScriptYAML(id);
      const url = URL.createObjectURL(new Blob([blob], { type: 'text/yaml' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${script.metadata?.title || 'script'}.yaml`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('YAML 导出成功');
    } catch (err) {
      message.error('导出失败: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSwitchEpisode = (epId) => {
    loadScript(epId);
    // 更新 URL 不刷新页面
    const params = new URLSearchParams();
    params.set('scriptId', epId);
    if (workId) params.set('workId', workId);
    window.history.replaceState(null, '', `/editor?${params.toString()}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      {/* 顶部标题栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          background: '#fff',
          borderBottom: '1px solid #e8e8e8',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
          >
            返回
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            剧本编辑器
          </Title>
          {script?.metadata?.title && (
            <Text type="secondary">— {script.metadata.title}</Text>
          )}
        </div>

        <Space>
          {/* 剧集切换器 */}
          {episodes.length > 1 && (
            <Select
              value={scriptId}
              onChange={handleSwitchEpisode}
              style={{ width: 150 }}
              placeholder="切换剧集"
              suffixIcon={<SwapOutlined />}
              options={episodes.map((ep) => ({
                value: ep.id,
                label: (
                  <span>
                    <FileTextOutlined style={{ marginRight: 6 }} />
                    第{ep.episode || '?'}集
                  </span>
                ),
              }))}
            />
          )}
          {!hasParam && (
            <Text type="warning">请通过 scriptId 或 taskId 参数打开剧本</Text>
          )}
          {script?.id && (
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出 YAML
            </Button>
          )}
        </Space>
      </div>

      {/* 主体布局：左侧场景导航 + 右侧画布 */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <Spin size="large" tip="加载剧本中..." />
        </div>
      ) : (
        <div className="script-editor">
          <SceneNav />
          <SceneCanvas />
        </div>
      )}
    </div>
  );
}
