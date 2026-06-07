import { Spin, Progress, Button, Row, Col, Typography, Space, Tag, Alert } from 'antd';
import {
  LoadingOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  RobotOutlined,
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;

function formatElapsed(ms) {
  if (!ms || ms < 0) return '0 秒';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s} 秒`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${m} 分 ${rest} 秒`;
}

function stageMeta(stage) {
  if (!stage) return { color: 'blue', icon: <RobotOutlined /> };
  if (stage.includes('取消') || stage.includes('异常')) return { color: 'default', icon: <CloseCircleOutlined /> };
  if (stage.includes('完成')) return { color: 'green', icon: <CheckCircleOutlined /> };
  if (stage.includes('大模型') || stage.includes('AI') || stage.includes('生成')) return { color: 'geekblue', icon: <RobotOutlined /> };
  return { color: 'blue', icon: <RobotOutlined /> };
}

const TIPS = [
  '大模型正在理解你的故事结构…',
  '正在设计人物对白与潜台词…',
  '正在为每一幕组织戏剧冲突…',
  '请稍等，长文本可能需要 1~3 分钟。',
  '不要急，好剧本值得等待。',
];
function pickTip(progress) {
  const idx = Math.min(TIPS.length - 1, Math.floor(progress * TIPS.length * 1.5));
  return TIPS[idx] || TIPS[TIPS.length - 1];
}

/**
 * 全屏任务面板 —— 替代表单区域，显示 AI 生成进度。
 */
export default function TaskProgress({
  status,
  progress,
  stage,
  elapsedMs,
  error,
  onCancel,
  onReset,
}) {
  const isProcessing = status === 'pending' || status === 'processing';
  const isFailed = status === 'failed';
  const isCompleted = status === 'completed';

  const percent = Math.max(0, Math.min(100, Math.round((progress || 0) * 100)));
  const meta = stageMeta(stage || '');

  const bgColor = isFailed ? '#fff1f0' : isCompleted ? '#f6ffed' : '#f6ffed';
  const borderColor = isFailed ? '#ffccc7' : isCompleted ? '#b7eb8f' : '#d9f7be';

  return (
    <div
      style={{
        width: '100%',
        padding: 20,
        borderRadius: 12,
        background: bgColor,
        border: `1px solid ${borderColor}`,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        marginBottom: 12,
      }}
    >
      <Row gutter={16} align="middle">
        {/* 左侧图标 */}
        <Col flex="48px" style={{ textAlign: 'center' }}>
          {isProcessing && (
            <Spin indicator={<LoadingOutlined style={{ fontSize: 32, color: '#3a6b28' }} spin />} />
          )}
          {isCompleted && (
            <CheckCircleOutlined style={{ fontSize: 36, color: '#52c41a' }} />
          )}
          {isFailed && (
            <CloseCircleOutlined style={{ fontSize: 36, color: '#ff4d4f' }} />
          )}
        </Col>

        {/* 右侧内容 */}
        <Col flex="auto">
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {/* 第一行：阶段 + 计时 + 百分比 */}
            <Row align="middle" gutter={[8, 4]} wrap>
              <Tag
                color={meta.color}
                icon={meta.icon}
                style={{ fontSize: 13, padding: '2px 10px', borderRadius: 6 }}
              >
                {stage || (isProcessing ? 'AI 生成中' : isCompleted ? '已完成' : '失败')}
              </Tag>
              <Text style={{ fontSize: 13 }}>
                <ClockCircleOutlined /> 已用时：{formatElapsed(elapsedMs)}
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                进度 {percent}%
              </Text>
            </Row>

            {/* 第二行：进度条 */}
            <Progress
              percent={percent}
              status={isFailed ? 'exception' : isCompleted ? 'success' : 'active'}
              strokeWidth={8}
              strokeColor={
                isProcessing
                  ? { '0%': '#3a6b28', '100%': '#52c41a' }
                  : undefined
              }
              trailColor={isProcessing ? '#d9f7be' : undefined}
            />

            {/* 第三行：动态提示 */}
            {isProcessing && (
              <Paragraph
                type="secondary"
                style={{ margin: 0, fontSize: 12, fontStyle: 'italic' }}
              >
                {pickTip(progress || 0)}
              </Paragraph>
            )}

            {/* 错误提示 */}
            {error && !isCompleted && (
              <Alert
                type="error"
                message={error}
                showIcon
                closable={false}
                style={{ fontSize: 13 }}
              />
            )}

            {/* 操作按钮 */}
            <Row gutter={8} align="middle">
              {isProcessing && onCancel && (
                <>
                  <Button danger size="middle" onClick={onCancel}>
                    取消任务
                  </Button>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    取消后本次生成的剧本不会被保存
                  </Text>
                </>
              )}
              {isFailed && onReset && (
                <Button type="primary" size="middle" onClick={onReset}>
                  再来一次
                </Button>
              )}
            </Row>
          </Space>
        </Col>
      </Row>
    </div>
  );
}
