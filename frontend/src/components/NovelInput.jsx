import { Input, Typography } from 'antd';

const { TextArea } = Input;
const { Text } = Typography;

const MAX_CHARS = 50000;

export default function NovelInput({ value, onChange }) {
  const count = value?.length || 0;

  return (
    <div>
      <TextArea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="在此粘贴或输入小说文本…"
        rows={18}
        maxLength={MAX_CHARS}
        showCount
        style={{ fontSize: 15, lineHeight: 1.7 }}
      />
      {count > 40000 && (
        <Text type="warning" style={{ display: 'block', marginTop: 8 }}>
          文本较长，AI 转换可能因 token 限制而截断，建议分段转换。
        </Text>
      )}
    </div>
  );
}
