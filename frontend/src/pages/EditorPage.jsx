import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spin, Button, Typography, App, Select, Space } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, SwapOutlined, FileTextOutlined, DeleteOutlined, PrinterOutlined } from '@ant-design/icons';
import SceneNav from '../components/SceneNav';
import SceneCard from '../components/SceneCard';
import AdaptationNotes from '../components/AdaptationNotes';
import useScriptStore from '../store/scriptStore';
import { useTask } from '../hooks/useTask';
import api, { getScriptByTaskId, exportScriptYAML } from '../services/api';
import { listWorkScripts, deleteScript } from '../services/work';
import '../styles/script-editor.css';

const { Title, Text } = Typography;

function SceneCanvas({ printAll }) {
  const script = useScriptStore((s) => s.script);
  const selectedSceneId = useScriptStore((s) => s.selectedSceneId);
  const scenes = script?.scenes || [];

  if (printAll && scenes.length > 0) {
    return (
      <div className="script-editor__canvas">
        {scenes.map((scene) => (
          <SceneCard key={scene.id} scene={scene} />
        ))}
      </div>
    );
  }

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

function AdaptationNotesButton({ notes, onClick }) {
  return (
    <Button icon={<FileTextOutlined />} onClick={onClick}>
      改编备注 {notes.length > 0 && `(${notes.length})`}
    </Button>
  );
}

function FloatingNotesPanel({ notes, onClose }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const panelRef = useRef(null);

  const onMouseDown = useCallback((e) => {
    dragging.current = true;
    startPos.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging.current) return;
      setPos({
        x: e.clientX - startPos.current.x,
        y: e.clientY - startPos.current.y,
      });
    };
    const onMouseUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 380,
        maxHeight: 'calc(100% - 32px)',
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.7)',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)',
        zIndex: 10,
        padding: '12px 16px 16px',
        border: '1px solid rgba(0,0,0,0.04)',
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: dragging.current ? 'none' : undefined,
      }}
    >
      <div
        onMouseDown={onMouseDown}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: '1px solid #f0f0f0',
          cursor: 'grab',
          userSelect: 'none',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 15 }}>改编备注</span>
        <Button size="small" type="text" onClick={onClose} style={{ fontSize: 14, color: '#999', lineHeight: 1 }}>✕</Button>
      </div>
      <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
        <AdaptationNotes notes={notes} />
      </div>
    </div>
  );
}

export default function EditorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scriptId = searchParams.get('scriptId');
  const { modal, message } = App.useApp();
  const taskId = searchParams.get('taskId');
  const workId = searchParams.get('workId');

  const isLoading = useScriptStore((s) => s.isLoading);
  const loadScript = useScriptStore((s) => s.loadScript);
  const setScript = useScriptStore((s) => s.setScript);
  const script = useScriptStore((s) => s.script);
  const { reset } = useTask();

  const [notesPanelOpen, setNotesPanelOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // 监听打印结束，恢复视图
  useEffect(() => {
    const onAfterPrint = () => setIsPrinting(false);
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, []);

  // 剧集列表（当 workId 存在时加载）
  const [episodes, setEpisodes] = useState([]);
  const [activeEpisodeId, setActiveEpisodeId] = useState(scriptId);

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
      // 先保存当前编辑器状态到数据库，确保导出的是最新数据
      const currentScript = useScriptStore.getState().script;
      if (currentScript) {
        await api.put(`/scripts/${id}`, currentScript);
      }
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

  const handlePrintPDF = () => {
    setIsPrinting(true);
    // 等 DOM 更新完成后再调用打印
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  };

  const handleSwitchEpisode = (epId) => {
    setActiveEpisodeId(epId);
    loadScript(epId);
    // 更新 URL 不刷新页面
    const params = new URLSearchParams();
    params.set('scriptId', epId);
    if (workId) params.set('workId', workId);
    window.history.replaceState(null, '', `/editor?${params.toString()}`);
  };

  const handleDeleteScript = () => {
    const sid = script?.id;
    if (!sid) return;
    modal.confirm({
      title: `确认删除第${script.episode || '?'}集「${script.metadata?.title || script.title || ''}」?`,
      content: '删除后将移除该剧本及其关联任务，此操作不可恢复。',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteScript(sid);
          message.success('已删除');
          handleBack();
        } catch (err) {
          message.error('删除失败: ' + (err.response?.data?.error || err.message));
        }
      },
    });
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
              value={activeEpisodeId || script?.id || scriptId}
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
            <>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                导出 YAML
              </Button>
              <Button icon={<PrinterOutlined />} onClick={handlePrintPDF}>
                导出 PDF
              </Button>
              <AdaptationNotesButton
                notes={script.adaptation_notes || []}
                onClick={() => setNotesPanelOpen(true)}
              />
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleDeleteScript}
              >
                删除此集
              </Button>
            </>
          )}
        </Space>
      </div>

      {/* 主体布局：左侧场景导航 + 右侧画布 */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <Spin size="large" tip="加载剧本中..." />
        </div>
      ) : (
        <div className="script-editor" style={{ position: 'relative' }}>
          {script && notesPanelOpen && (
            <FloatingNotesPanel
              notes={script.adaptation_notes || []}
              onClose={() => setNotesPanelOpen(false)}
            />
          )}
          <SceneNav />
          <SceneCanvas printAll={isPrinting} />
        </div>
      )}
    </div>
  );
}
