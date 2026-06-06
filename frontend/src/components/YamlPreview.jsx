import { Alert } from 'antd';
import { parseScriptYaml } from '../utils/validators';

export default function YamlPreview({ content }) {
  const { script, errors } = parseScriptYaml(content);

  if (errors.length && !script) {
    return <Alert type="error" message={errors[0]} showIcon />;
  }

  if (!script) {
    return <Alert type="info" message="暂无剧本数据，请先转换或编辑 YAML" showIcon />;
  }

  return (
    <div className="script-preview">
      <div className="title-page">
        <h1>{script.metadata?.title || '未命名'}</h1>
        {script.metadata?.original_title && (
          <p>原著：{script.metadata.original_title}</p>
        )}
        {script.metadata?.author && <p>作者：{script.metadata.author}</p>}
        {script.metadata?.adapter && <p>改编：{script.metadata.adapter}</p>}
        {script.metadata?.format && <p>格式：{script.metadata.format}</p>}
      </div>

      {script.characters?.length > 0 && (
        <div className="character-page">
          <h2>角色表</h2>
          {script.characters.map((char) => (
            <div key={char.id || char.name} className="character-item">
              <strong>{char.name}</strong> ({char.type})
              <p>{char.description}</p>
            </div>
          ))}
        </div>
      )}

      {script.scenes?.map((scene) => (
        <div key={scene.id || scene.sequence} className="scene">
          <div className="slugline">
            {typeof scene.slugline === 'string'
              ? scene.slugline
              : scene.slugline
                ? [scene.slugline.type, scene.slugline.name, scene.slugline.time].filter(Boolean).join(' · ')
                : ''}
          </div>
          {scene.title && <p className="scene-title">{scene.title}</p>}

          {scene.content?.map((item, idx) => (
            <div key={idx} className={`content-${item.type}`}>
              {item.type === 'action' && (
                <p className="action-text">{item.description || item.text}</p>
              )}
              {item.type === 'dialogue' && (
                <div className="dialogue-block">
                  <div className="character-name">{item.character_name}</div>
                  {item.parenthetical && (
                    <div className="parenthetical">({item.parenthetical})</div>
                  )}
                  <div className="dialogue-text">{item.text}</div>
                </div>
              )}
              {item.type === 'transition' && (
                <div className="transition">{item.transition_type}</div>
              )}
              {item.type === 'sound' && (
                <p className="sound-text">【音效】{item.description || item.text}</p>
              )}
              {item.type === 'note' && (
                <p className="note-text">（注：{item.text || item.description}）</p>
              )}
            </div>
          ))}
        </div>
      ))}

      {errors.length > 0 && (
        <Alert
          type="warning"
          message="结构提示"
          description={errors.join('；')}
          style={{ marginTop: 24 }}
          showIcon
        />
      )}
    </div>
  );
}
