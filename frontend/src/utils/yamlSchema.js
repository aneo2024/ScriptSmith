export const DEFAULT_SCRIPT = {
  script: {
    metadata: {
      title: '未命名剧本',
      original_title: '',
      author: '',
      genre: '',
      format: '电影',
      total_scenes: 0,
    },
    characters: [],
    scenes: [],
    adaptation_notes: [],
  },
};

export const EMPTY_YAML = `script:
  metadata:
    title: 未命名剧本
    original_title: ""
    author: ""
    genre: ""
    format: 电影
    total_scenes: 0
  characters: []
  scenes: []
  adaptation_notes: []
`;
