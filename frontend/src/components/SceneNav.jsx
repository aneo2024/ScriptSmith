import useScriptStore from '../store/scriptStore';

export default function SceneNav() {
  const script = useScriptStore((s) => s.script);
  const selectedSceneId = useScriptStore((s) => s.selectedSceneId);
  const selectScene = useScriptStore((s) => s.selectScene);

  const scenes = script?.scenes || [];
  const sorted = [...scenes].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

  return (
    <div className="script-editor__nav">
      <div className="script-editor__nav-header">
        场景列表 ({scenes.length})
      </div>
      <ul className="script-editor__nav-list">
        {sorted.map((scene) => {
          const slugline = scene.slugline;
          const isActive = selectedSceneId === scene.id;
          return (
            <li
              key={scene.id}
              className={`script-editor__nav-item${isActive ? ' script-editor__nav-item--active' : ''}`}
              onClick={() => {
                selectScene(scene.id);
                console.log('选中场景:', scene);
              }}
            >
              <div className="script-editor__nav-item-title">
                {scene.sequence ?? '-'}. {scene.title || '未命名场景'}
              </div>
              {slugline && (
                <div className="script-editor__nav-item-meta">
                  {[slugline.type, slugline.name, slugline.time]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              )}
            </li>
          );
        })}
        {scenes.length === 0 && (
          <li className="script-editor__nav-item" style={{ cursor: 'default', color: '#bbb' }}>
            暂无场景
          </li>
        )}
      </ul>
    </div>
  );
}
