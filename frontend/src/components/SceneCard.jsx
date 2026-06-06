import useScriptStore from '../store/scriptStore';
import '../styles/scene-card.css';

const ContentBlock = ({ item, isSelected, onClick }) => {
  return (
    <div
      className={`content-block ${item.type} ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      {item.type === 'action' && (
        <div className="action-text">{item.description}</div>
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
        <div className="transition-text">{item.transition_type}</div>
      )}

      {item.type === 'sound' && (
        <div className="sound-text">
          <span className="sound-label">【{item.sound_type}】</span>
          {item.sound_description}
        </div>
      )}
    </div>
  );
};

const SceneCard = ({ scene }) => {
  const selectedSceneId = useScriptStore((s) => s.selectedSceneId);
  const selectedContentId = useScriptStore((s) => s.selectedContentId);
  const selectContent = useScriptStore((s) => s.selectContent);
  const isSelected = scene.id === selectedSceneId;

  if (!isSelected) return null;

  const slugline = scene.slugline;

  return (
    <div className={`scene-card ${isSelected ? 'selected' : ''}`}>
      <div className="scene-header">
        <div className="slugline">
          {slugline?.type === 'interior' ? '内景' : '外景'}
          {slugline?.name && `·${slugline.name}`}
          {slugline?.time && (
            slugline.time === 'night' ? '·夜' :
            slugline.time === 'dawn' ? '·黎明' :
            slugline.time === 'dusk' ? '·黄昏' : '·日'
          )}
        </div>
        <h3 className="scene-title">{scene.title}</h3>
      </div>

      <div className="scene-content">
        {scene.content?.map((item) => (
          <ContentBlock
            key={item.id}
            item={item}
            isSelected={selectedContentId === item.id}
            onClick={() => selectContent(item.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default SceneCard;
