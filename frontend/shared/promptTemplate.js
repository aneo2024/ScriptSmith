export const generatePrompt = (novelText, config) => `
你是一位资深编剧，擅长将小说改编为专业剧本。

## 任务
将以下小说文本转换为符合 YAML Schema 的剧本。

## 改编配置
- 剧本格式：${config?.format || '电影'}
- 目标集数：${config?.episodes || 1}
- 风格倾向：${config?.style || '保留原著风格'}

## YAML Schema 结构（严格按此字段名输出）
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
      slugline:
        type: interior|exterior|both
        name: string
        time: day|night|dawn|dusk|continuous
      characters_present: [string]
      mood: string
      content:
        # action 动作/描写
        - id: string
          type: action
          description: string
        # dialogue 对话
        - id: string
          type: dialogue
          character_id: string
          character_name: string
          text: string
          emotion: string
          parenthetical: string
        # transition 转场
        - id: string
          type: transition
          transition_type: string
        # sound 音效
        - id: string
          type: sound
          sound_type: string
          sound_description: string
        # note 备注
        - id: string
          type: note
          note_text: string
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
3. 每个内容项必须有唯一 id
4. slugline 必须是包含 type/name/time 的对象（如 type: interior, name: 咖啡馆, time: night）
5. 在 adaptation_notes 中记录所有改编决策
6. 只输出YAML代码块，不要任何解释

## 输出
\`\`\`yaml
`;

export const extractYamlFromContent = (content) => {
  if (!content || typeof content !== 'string') return '';
  const fenced = content.match(/```ya?ml\n([\s\S]*?)\n```/i);
  if (fenced) return fenced[1].trim();
  return content.trim();
};
