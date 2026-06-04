import { List, Card, Tag, Alert } from 'antd';
import { useMemo } from 'react';
import { parseScriptYaml } from '../utils/validators';

export default function SceneList({ yamlContent }) {
  const { script, errors } = useMemo(
    () => parseScriptYaml(yamlContent),
    [yamlContent],
  );

  const scenes = script?.scenes || [];

  if (errors.length && !script) {
    return <Alert type="error" message={errors[0]} showIcon />;
  }

  if (!scenes.length) {
    return <Alert type="info" message="暂无场景数据" showIcon />;
  }

  return (
    <List
      grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }}
      dataSource={scenes}
      renderItem={(scene) => (
        <List.Item>
          <Card
            title={`#${scene.sequence ?? '-'} ${scene.title || scene.id}`}
            extra={<Tag>{scene.slugline}</Tag>}
          >
            <p>
              出场角色：
              {(scene.characters_present || []).join(', ') || '—'}
            </p>
            <p>内容条目：{scene.content?.length ?? 0} 条</p>
            {scene.location && (
              <p>
                地点：{scene.location.type} / {scene.location.name} /{' '}
                {scene.location.time}
              </p>
            )}
          </Card>
        </List.Item>
      )}
    />
  );
}
