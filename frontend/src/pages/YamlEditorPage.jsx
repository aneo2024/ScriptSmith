import { Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

export default function YamlEditorPage() {
  return (
    <Card>
      <Title level={4}>YAML编辑页面</Title>
      <Paragraph type="secondary">
        在这里编辑剧本的 YAML 结构化内容。
      </Paragraph>
    </Card>
  );
}
