import { useState, useCallback, useRef, useEffect } from 'react';
import useScriptStore from '../store/scriptStore';
import { updateContent, updateScene as updateSceneAPI } from '../services/api';
import '../styles/scene-card.css';

/** 内容块编辑内联控件 */
function ContentEdit({ item, onSave, onCancel }) {
  const [text, setText] = useState(item.text || item.description || '');
  const [characterName, setCharacterName] = useState(item.character_name || '');
  const containerRef = useRef(null);

  // 打开编辑时自动聚焦到台词/内容区域（非角色名）
  useEffect(() => {
    const el = containerRef.current?.querySelector('.dialogue-edit, .edit-input');
    if (el) {
      el.focus();
      // 把光标放到末尾
      const len = el.value.length;
      el.setSelectionRange?.(len, len);
    }
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave();
  };

  const handleSave = () => {
    const updated = { ...item };
    if (item.type === 'dialogue') {
      updated.text = text;
      updated.character_name = characterName;
    } else if (item.type === 'action') {
      updated.description = text;
    } else if (item.type === 'transition') {
      updated.transition_type = text;
    } else if (item.type === 'sound') {
      updated.sound_description = text;
    } else {
      updated.description = text;
    }
    onSave(updated);
  };

  if (item.type === 'dialogue') {
    return (
      <div className="content-block dialogue editing" ref={containerRef}>
        <input
          className="edit-input name-input"
          value={characterName}
          onChange={(e) => setCharacterName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="角色名"
        />
        <textarea
          className="edit-input dialogue-edit"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="台词"
          rows={3}
        />
        <div className="edit-actions">
          <button className="edit-btn save" onClick={handleSave}>保存</button>
          <button className="edit-btn cancel" onClick={onCancel}>取消</button>
        </div>
      </div>
    );
  }

  return (
    <div className="content-block editing" ref={containerRef}>
      <textarea
        className="edit-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={item.type === 'action' ? '动作描述' : '内容'}
        rows={Math.max(2, text.split('\n').length)}
      />
      <div className="edit-actions">
        <button className="edit-btn save" onClick={handleSave}>保存</button>
        <button className="edit-btn cancel" onClick={onCancel}>取消</button>
      </div>
    </div>
  );
}

/** 场景标题编辑内联控件 */
function TitleEdit({ scene, onSave, onCancel }) {
  const [title, setTitle] = useState(scene.title || '');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      onSave({ ...scene, title });
    }
    if (e.key === 'Escape') onCancel();
  };

  return (
    <input
      className="scene-title-input"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={() => onSave({ ...scene, title })}
      onKeyDown={handleKeyDown}
      autoFocus
      style={{ fontSize: 18, fontWeight: 'normal', color: '#666', width: '100%', border: '1px solid #1890ff', borderRadius: 4, padding: '4px 8px' }}
    />
  );
}

/** 只读内容块 */
function ContentBlockRead({ item, isSelected, onClick, onDoubleClick }) {
  return (
    <div
      className={`content-block ${item.type} ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
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
}

const SceneCard = ({ scene: sceneProp }) => {
  const script = useScriptStore((s) => s.script);
  const selectedContentId = useScriptStore((s) => s.selectedContentId);
  const selectContent = useScriptStore((s) => s.selectContent);
  const setScript = useScriptStore((s) => s.setScript);
  const updateStoreScene = useScriptStore((s) => s.updateScene);
  const updateStoreContent = useScriptStore((s) => s.updateContent);

  const [editingContentId, setEditingContentId] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);

  const slugline = sceneProp.slugline;

  const handleContentClick = useCallback((itemId) => {
    selectContent(itemId);
  }, [selectContent]);

  const handleContentDoubleClick = useCallback((itemId) => {
    setEditingContentId(itemId);
  }, []);

  const handleContentSave = useCallback(async (updatedContent) => {
    setEditingContentId(null);
    const scriptId = script?.id;
    if (!scriptId) return;

    // 本地乐观更新
    updateStoreContent(sceneProp.id, updatedContent.id, updatedContent);

    // 异步保存到后端
    try {
      await updateContent(scriptId, updatedContent.id, updatedContent);
    } catch (err) {
      console.error('保存内容块失败:', err);
      // 回退：重新加载
      setScript(script);
    }
  }, [script, sceneProp.id, updateStoreContent, setScript]);

  const handleContentCancel = useCallback(() => {
    setEditingContentId(null);
  }, []);

  const handleTitleSave = useCallback(async (updatedScene) => {
    setEditingTitle(false);
    const scriptId = script?.id;
    if (!scriptId) return;

    updateStoreScene(sceneProp.id, updatedScene);

    try {
      await updateSceneAPI(scriptId, sceneProp.id, updatedScene);
    } catch (err) {
      console.error('保存场景标题失败:', err);
      setScript(script);
    }
  }, [script, sceneProp.id, updateStoreScene, setScript]);

  const handleTitleCancel = useCallback(() => {
    setEditingTitle(false);
  }, []);

  return (
    <div className="scene-card selected">
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
        {editingTitle ? (
          <TitleEdit scene={sceneProp} onSave={handleTitleSave} onCancel={handleTitleCancel} />
        ) : (
          <h3
            className="scene-title"
            onDoubleClick={() => setEditingTitle(true)}
            style={{ cursor: 'pointer' }}
            title="双击编辑标题"
          >
            {sceneProp.title || '未命名场景'}
          </h3>
        )}
      </div>

      <div className="scene-content">
        {sceneProp.content?.map((item) => (
          editingContentId === item.id ? (
            <ContentEdit
              key={item.id}
              item={item}
              onSave={handleContentSave}
              onCancel={handleContentCancel}
            />
          ) : (
            <ContentBlockRead
              key={item.id}
              item={item}
              isSelected={selectedContentId === item.id}
              onClick={() => handleContentClick(item.id)}
              onDoubleClick={() => handleContentDoubleClick(item.id)}
            />
          )
        ))}
      </div>
    </div>
  );
};

export default SceneCard;
