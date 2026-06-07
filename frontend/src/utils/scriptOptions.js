// 影视类别与改编风格的"单一真相来源"
// value 必须与后端 buildStructuredPrompt 的 key 完全一致
// label 用于 Select 展示；shortLabel 用于作品列表/详情的 Tag
// color 用于作品列表/详情的主题色

export const FORMATS = [
  { value: 'film',        label: '电影剧本',   shortLabel: '电影',   color: '#1890ff' },
  { value: 'tv_series',   label: '电视剧本',   shortLabel: '电视剧', color: '#52c41a' },
  { value: 'stage_play',  label: '舞台剧',     shortLabel: '舞台剧', color: '#722ed1' },
  { value: 'animation',   label: '动画剧本',   shortLabel: '动画',   color: '#fa8c16' },
  { value: 'short_film',  label: '短片剧本',   shortLabel: '短片',   color: '#eb2f96' },
  { value: 'web_series',  label: '网剧剧本',   shortLabel: '网剧',   color: '#13c2c2' },
  { value: 'documentary', label: '纪录片脚本', shortLabel: '纪录片', color: '#faad14' },
];

export const STYLES = [
  { value: 'faithful',     label: '忠实原著' },
  { value: 'commercial',   label: '商业化' },
  { value: 'experimental', label: '实验性' },
  { value: 'noir',         label: '黑色电影' },
  { value: 'romantic',     label: '浪漫抒情' },
  { value: 'thriller',     label: '悬疑惊悚' },
  { value: 'wuxia',        label: '武侠风' },
  { value: 'xianxia',      label: '仙侠玄幻' },
  { value: 'comedy',       label: '喜剧幽默' },
  { value: 'tragedy',      label: '悲剧深沉' },
  { value: 'minimalist',   label: '极简留白' },
];

// —— 默认值（前端 UI 默认项；后端 service 层已统一兜底为这两个）——
export const DEFAULT_FORMAT = 'film';
export const DEFAULT_STYLE  = 'faithful';

// —— 工具：Select 用的 { value, label } 数组 ——
export const formatOptions = FORMATS.map(({ value, label }) => ({ value, label }));
export const styleOptions  = STYLES.map(({ value, label }) => ({ value, label }));

// —— 工具：从 value 查询中文短标签 / 颜色 / 完整 label ——
const formatByValue = new Map(FORMATS.map((f) => [f.value, f]));
const styleByValue  = new Map(STYLES.map((s) => [s.value, s]));

export const getFormat = (v) => formatByValue.get(v) || null;
export const getStyle  = (v) => styleByValue.get(v) || null;

export const getFormatShortLabel = (v) => getFormat(v)?.shortLabel || v;
export const getFormatColor      = (v) => getFormat(v)?.color || null;
export const getFormatLabel      = (v) => getFormat(v)?.label || v;
export const getStyleLabel       = (v) => getStyle(v)?.label || v;
