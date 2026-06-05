import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spin, Button, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import SceneNav from '../components/SceneNav';
import useScriptStore from '../store/scriptStore';
import '../styles/script-editor.css';

const { Title, Text } = Typography;

/** 渲染单个内容块 */
function ContentItem({ item }) {
  switch (item.type) {
    case 'action':
      return (
        <div className="script-editor__canvas-content-item script-editor__canvas-content-item--action">
          <span className="tag">动作</span>
          {item.description}
        </div>
      );
    case 'dialogue':
      return (
        <div className="script-editor__canvas-content-item script-editor__canvas-content-item--dialogue">
          <span className="tag">对话</span>
          <strong>{item.character_name || item.character_id}</strong>
          {item.emotion && <span style={{ color: '#888', marginLeft: 6 }}>({item.emotion})</span>}
          {item.parenthetical && (
            <div style={{ color: '#888', fontStyle: 'italic', marginBottom: 4 }}>
              ({item.parenthetical})
            </div>
          )}
          <div style={{ marginTop: 4 }}>{item.text}</div>
        </div>
      );
    case 'transition':
      return (
        <div className="script-editor__canvas-content-item" style={{ textAlign: 'right', borderLeftColor: '#faad14' }}>
          <span className="tag">转场</span>
          {item.transition_type}
        </div>
      );
    case 'sound':
      return (
        <div className="script-editor__canvas-content-item" style={{ borderLeftColor: '#722ed1' }}>
          <span className="tag">音效</span>
          <strong>{item.sound_type}</strong>
          {item.sound_description && ` — ${item.sound_description}`}
        </div>
      );
    case 'note':
      return (
        <div className="script-editor__canvas-content-item" style={{ borderLeftColor: '#999', fontStyle: 'italic' }}>
          <span className="tag">备注</span>
          {item.note_text}
        </div>
      );
    default:
      return (
        <div className="script-editor__canvas-content-item">
          <span className="tag">{item.type}</span>
          {item.description || item.text || JSON.stringify(item)}
        </div>
      );
  }
}

/** 渲染选中场景的右侧画布 */
function SceneCanvas() {
  const script = useScriptStore((s) => s.script);
  const selectedSceneId = useScriptStore((s) => s.selectedSceneId);

  const scenes = script?.scenes || [];
  const scene = scenes.find((s) => s.id === selectedSceneId);

  if (!scene) {
    return (
      <div className="script-editor__canvas">
        <div className="script-editor__canvas-placeholder">
          请在左侧选择一个场景查看
        </div>
      </div>
    );
  }

  const slugline = scene.slugline;

  return (
    <div className="script-editor__canvas">
      <div className="script-editor__canvas-scene-title">
        第{scene.sequence}场 — {scene.title || '未命名场景'}
      </div>

      {slugline && (
        <div className="script-editor__canvas-slugline">
          {[slugline.type, slugline.name, slugline.time]
            .filter(Boolean)
            .join(' · ')}
        </div>
      )}

      {scene.characters_present?.length > 0 && (
        <div className="script-editor__canvas-characters">
          出场角色：{scene.characters_present.join('、')}
        </div>
      )}

      {scene.mood && (
        <div className="script-editor__canvas-characters">
          氛围：{scene.mood}
        </div>
      )}

      <div className="script-editor__canvas-content">
        {(scene.content || []).map((item) => (
          <ContentItem key={item.id} item={item} />
        ))}
      </div>

      {scene.notes && (
        <div style={{ marginTop: 16, padding: 12, background: '#fffbe6', borderRadius: 4, fontSize: 13, color: '#666' }}>
          <strong>场景备注：</strong>{scene.notes}
        </div>
      )}
    </div>
  );
}

export default function EditorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scriptId = searchParams.get('scriptId');

  const isLoading = useScriptStore((s) => s.isLoading);
  const loadScript = useScriptStore((s) => s.loadScript);
  const script = useScriptStore((s) => s.script);

  useEffect(() => {
    if (scriptId) {
      loadScript(scriptId);
    }
  }, [scriptId]);

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
        {!scriptId && (
          <Text type="warning">请通过 scriptId 参数打开剧本</Text>
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
