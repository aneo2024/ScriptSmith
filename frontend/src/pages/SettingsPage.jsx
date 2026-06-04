import { Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

export default function SettingsPage() {
  return (
    <Card>
      <Title level={4}>项目设置页面</Title>
      <Paragraph type="secondary">
        在这里配置项目的相关参数和选项。
      </Paragraph>
    </Card>
  );
}
