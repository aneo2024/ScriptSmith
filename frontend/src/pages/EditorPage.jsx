import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spin, Button, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import SceneNav from '../components/SceneNav';
import SceneCard from '../components/SceneCard';
import useScriptStore from '../store/scriptStore';
import { getScriptByTaskId } from '../services/api';
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

  const isLoading = useScriptStore((s) => s.isLoading);
  const loadScript = useScriptStore((s) => s.loadScript);
  const setScript = useScriptStore((s) => s.setScript);
  const script = useScriptStore((s) => s.script);

  useEffect(() => {
    if (scriptId) {
      loadScript(scriptId);
    } else if (taskId) {
      getScriptByTaskId(taskId)
        .then((data) => setScript(data))
        .catch((err) => console.error('通过任务ID加载剧本失败:', err));
    }
  }, [scriptId, taskId]);

  const hasParam = scriptId || taskId;

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
            onClick={() => navigate('/')}
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
        {!hasParam && (
          <Text type="warning">请通过 scriptId 或 taskId 参数打开剧本</Text>
        )}
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
