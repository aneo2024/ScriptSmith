export const generatePrompt = (novelText, config) => `
你是一位资深编剧，擅长将小说改编为专业剧本。

## 任务
将以下小说文本转换为符合 YAML Schema 的剧本。

## 改编配置
- 剧本格式：${config?.format || '电影'}
- 目标集数：${config?.episodes || 1}
- 风格倾向：${config?.style || '保留原著风格'}

## YAML Schema 结构
\`\`\`
script:
  metadata:
    title: string
    original_title: string
    author: string
    genre: string
    format: string
    total_scenes: integer
  characters:
    - id: string
      name: string
      type: protagonist|antagonist|supporting|extra
      description: string
      first_appearance: string
  scenes:
    - id: string
      sequence: integer
      title: string
      slugline: string
      location:
        type: interior|exterior
        name: string
        time: day|night|dawn|dusk
      characters_present: [string]
      content:
        - type: action|dialogue|transition|sound|note
          [对应字段见详细说明]
  adaptation_notes:
    - chapter: string
      scene_ids: [string]
      changes: string
      reason: string
\`\`\`

## 输入小说
${novelText}

## 输出要求
1. 严格遵循上述Schema，输出合法YAML
2. 改编原则：
   - 删除纯心理描写，转化为动作或对话暗示
   - 合并功能重复的次要角色
   - 每场景聚焦一个戏剧冲突点
   - 对话要口语化、有潜台词
   - 添加适当的转场和音效提示
3. 生成完整的 slugline（如"内景·咖啡馆·夜"）
4. 在 adaptation_notes 中记录所有改编决策
5. 只输出YAML代码块，不要任何解释

## 输出
\`\`\`yaml
`;

export const extractYamlFromContent = (content) => {
  if (!content || typeof content !== 'string') return '';
  const fenced = content.match(/```ya?ml\n([\s\S]*?)\n```/i);
  if (fenced) return fenced[1].trim();
  return content.trim();
};
