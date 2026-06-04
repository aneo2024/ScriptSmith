import yaml from 'js-yaml';

/**
 * 解析剧本 YAML，提取 metadata、characters、scenes
 */
export function parseScript(yamlStr) {
  if (!yamlStr) return { metadata: null, characters: [], scenes: [] };

  try {
    const doc = yaml.load(yamlStr);
    if (!doc || !doc.script) return { metadata: null, characters: [], scenes: [] };

    const { metadata = null, characters = [], scenes = [] } = doc.script;
    return { metadata, characters, scenes };
  } catch {
    return { metadata: null, characters: [], scenes: [] };
  }
}

/** 角色类型中文标签 */
export const characterTypeLabel = {
  protagonist: '主角',
  antagonist: '反派',
  supporting: '配角',
  extra: '群众',
};

/** 角色类型颜色映射 */
export const characterTypeColor = {
  protagonist: 'blue',
  antagonist: 'red',
  supporting: 'green',
  extra: 'default',
};
