import YAML from 'js-yaml';

export const parseScriptYaml = (yamlContent) => {
  if (!yamlContent?.trim()) {
    return { script: null, errors: ['YAML 内容为空'] };
  }
  try {
    const parsed = YAML.load(yamlContent);
    const errors = validateScript(parsed);
    return { script: parsed?.script ?? null, errors };
  } catch (e) {
    return { script: null, errors: [`YAML 解析错误: ${e.message}`] };
  }
};

export const validateScript = (parsed) => {
  const errors = [];
  const script = parsed?.script;

  if (!script) {
    errors.push('缺少根节点 script');
    return errors;
  }

  const meta = script.metadata;
  if (!meta) {
    errors.push('缺少 script.metadata');
  } else {
    if (!meta.title) errors.push('metadata.title 不能为空');
  }

  if (!Array.isArray(script.characters)) {
    errors.push('script.characters 必须是数组');
  }

  if (!Array.isArray(script.scenes)) {
    errors.push('script.scenes 必须是数组');
  } else {
    script.scenes.forEach((scene, i) => {
      if (!scene.id) errors.push(`scenes[${i}].id 不能为空`);
      if (!scene.slugline) errors.push(`scenes[${i}].slugline 不能为空`);
    });
  }

  return errors;
};
