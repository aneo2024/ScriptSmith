import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Typography, Button, Space, Alert, message, Tabs } from 'antd';
import { ExportOutlined, ArrowLeftOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import CodeMirror from '@uiw/react-codemirror';
import { yaml as yamlLang } from '@codemirror/lang-yaml';
import { oneDark } from '@codemirror/theme-one-dark';
import { useTask } from '../hooks/useTask';
import { saveEditorDraft, loadEditorDraft } from '../hooks/useRecentTasks';
import ScriptPreview from '../components/ScriptPreview';

const { Title, Text } = Typography;

export default function EditorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { yaml, status, error, reset } = useTask();

  const [editedYaml, setEditedYaml] = useState(() => loadEditorDraft() || '');
  const [activeTab, setActiveTab] = useState('edit');

  // Sync yaml from context when task completes
  useEffect(() => {
    if (yaml) {
      setEditedYaml(yaml);
    }
  }, [yaml]);

  // Auto-save draft on change (debounced)
  useEffect(() => {
    if (!editedYaml) return;
    const timer = setTimeout(() => saveEditorDraft(editedYaml), 500);
    return () => clearTimeout(timer);
  }, [editedYaml]);

  const handleExport = () => {
    const content = editedYaml || yaml;
    if (!content?.trim()) {
      message.warning('没有可导出的 YAML 内容');
      return;
    }
    const blob = new Blob([content], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'script.yaml';
    a.click();
    URL.revokeObjectURL(url);
    message.success('已导出 script.yaml');
  };

  const handleBack = () => {
    reset();
    navigate('/');
  };

  // Guard: no content available
  if (!yaml && status !== 'completed' && !editedYaml) {
    return (
      <Card>
        <Title level={4}>YAML 编辑</Title>
        <Alert
          type="info"
          message="暂无剧本内容"
          description={
            <span>
              请先在「小说输入」页面提交小说文本进行 AI 转换。
              <br />
              <Button
                type="link"
                icon={<ArrowLeftOutlined />}
                onClick={handleBack}
                style={{ paddingLeft: 0 }}
              >
                返回小说输入
              </Button>
            </span>
          }
          showIcon
        />
      </Card>
    );
  }

  const tabItems = [
    {
      key: 'edit',
      label: <span><EditOutlined /> 编辑</span>,
      children: (
        <CodeMirror
          value={editedYaml || yaml}
          height="calc(100vh - 340px)"
          minHeight="400px"
          extensions={[yamlLang()]}
          theme={oneDark}
          onChange={(val) => setEditedYaml(val)}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLine: true,
            foldGutter: true,
          }}
        />
      ),
    },
    {
      key: 'preview',
      label: <span><EyeOutlined /> 预览</span>,
      children: <ScriptPreview yamlContent={editedYaml || yaml} />,
    },
  ];

  return (
    <Card
      title="剧本工作台"
      extra={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
            返回输入
          </Button>
          <Button
            type="primary"
            icon={<ExportOutlined />}
            onClick={handleExport}
          >
            导出 YAML
          </Button>
        </Space>
      }
    >
      {error && (
        <Alert type="error" message={error} style={{ marginBottom: 12 }} showIcon closable />
      )}

      <div style={{ marginBottom: 12 }}>
        <Text type="secondary">
          <EditOutlined style={{ marginRight: 4 }} />
          可编辑 YAML 或切换到「预览」查看标准剧本格式。修改内容自动保存到本地。
        </Text>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        destroyInactiveTabPane={false}
      />
    </Card>
  );
}
