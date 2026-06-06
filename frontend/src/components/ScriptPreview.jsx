import { Card, Typography, Divider, Tag } from 'antd';
import { parseScript } from '../utils/parseScript';

const { Title, Text, Paragraph } = Typography;

function CharacterPage({ characters }) {
  if (!characters?.length) return null;
  return (
    <div style={{ pageBreakBefore: 'always', marginBottom: 32 }}>
      <Title level={5} style={{ textTransform: 'uppercase', borderBottom: '1px solid #ccc', paddingBottom: 8 }}>
        角色列表
      </Title>
      {characters.map((c) => (
        <div key={c.id} style={{ margin: '12px 0' }}>
          <Tag color="blue">{c.name}</Tag>
          <Tag>{c.type}</Tag>
          {c.description && <Text type="secondary"> — {c.description}</Text>}
        </div>
      ))}
    </div>
  );
}

function SceneBlock({ scene }) {
  const renderContent = (item, i) => {
    switch (item.type) {
      case 'action':
        return (
          <div className="action-text" key={i}>
            {item.text || item.description || item.action}
          </div>
        );
      case 'dialogue':
        return (
          <div className="dialogue-block" key={i}>
            <div className="character-name">
              {item.character || item.name}
            </div>
            {item.parenthetical && (
              <div className="parenthetical">({item.parenthetical})</div>
            )}
            <div className="dialogue-text">
              {item.text || item.dialogue}
            </div>
          </div>
        );
      case 'transition':
        return (
          <div className="transition" key={i}>
            {item.text || item.description}
          </div>
        );
      case 'sound':
        return (
          <div className="sound-text" key={i}>
            {item.text || item.description}
          </div>
        );
      case 'note':
        return (
          <div className="note-text" key={i}>
            【备注】{item.text || item.description}
          </div>
        );
      default:
        return (
          <div key={i} style={{ margin: '8px 0' }}>
            {item.text || item.description || JSON.stringify(item)}
          </div>
        );
    }
  };

  return (
    <div className="scene">
      {scene.title && (
        <Paragraph className="scene-title">
          第{scene.sequence}场 — {scene.title}
        </Paragraph>
      )}
      {scene.slugline && (
        <div className="slugline">
          {typeof scene.slugline === 'string'
            ? scene.slugline
            : [scene.slugline.type, scene.slugline.name, scene.slugline.time].filter(Boolean).join(' · ')}
        </div>
      )}
      {scene.content?.map(renderContent)}
    </div>
  );
}

export default function ScriptPreview({ yamlContent }) {
  const { metadata, characters, scenes } = parseScript(yamlContent);

  if (!scenes?.length && !characters?.length) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Text type="secondary">无法解析剧本内容，请检查 YAML 格式</Text>
      </div>
    );
  }

  return (
    <div className="script-preview">
      {/* 标题页 */}
      {metadata && (
        <div className="title-page">
          <Title level={2}>{metadata.title || '未命名剧本'}</Title>
          {metadata.original_title && (
            <Paragraph type="secondary">
              原作：{metadata.original_title}
            </Paragraph>
          )}
          {metadata.format && <Tag>{metadata.format}</Tag>}
        </div>
      )}

      <Divider />

      {/* 角色表 */}
      <CharacterPage characters={characters} />

      {/* 场景 */}
      {scenes.map((scene, idx) => (
        <SceneBlock key={scene.id || idx} scene={scene} />
      ))}
    </div>
  );
}
