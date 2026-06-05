import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Input,
  Typography,
  message,
  Upload,
  Alert,
  List,
  Tag,
  Space,
} from 'antd';
import {
  UploadOutlined,
  PlayCircleOutlined,
  ArrowLeftOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { createWork } from '../services/work';
import { parseScript } from '../utils/parseScript';

const { Title, Text } = Typography;

export default function CreateWorkPage() {
  const [workTitle, setWorkTitle] = useState('');
  const [scenes, setScenes] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [yamlContent, setYamlContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const navigate = useNavigate();

  const handleUploadYAML = useCallback(async (file) => {
    setUploading(true);
    try {
      const content = await file.text();
      setYamlContent(content);
      const script = parseScript(content);
      setScenes(script.scenes || []);
      setCharacters(script.characters || []);
      setShowPreview(true);
      message.success('YAML 导入成功');
    } catch (err) {
      message.error('导入失败，请检查 YAML 格式');
      console.error(err);
    } finally {
      setUploading(false);
    }
    return false;
  }, []);

  const handleGenerateScript = async () => {
    if (!workTitle.trim()) {
      message.warning('请先输入作品名');
      return;
    }
    setGenerating(true);
    try {
      message.info('正在生成剧本，请稍候...');
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const mockScenes = [
        {
          id: 'scene-1',
          sequence: 1,
          title: '开场',
          slugline: { type: 'exterior', name: '城市街道', time: 'day' },
        },
        {
          id: 'scene-2',
          sequence: 2,
          title: '咖啡馆相遇',
          slugline: { type: 'interior', name: '咖啡馆', time: 'afternoon' },
        },
        {
          id: 'scene-3',
          sequence: 3,
          title: '深夜对话',
          slugline: { type: 'interior', name: '主角公寓', time: 'night' },
        },
      ];
      const mockCharacters = [
        { id: 'char-1', name: '张明', type: 'protagonist', description: '男主角' },
        { id: 'char-2', name: '李婷', type: 'protagonist', description: '女主角' },
        { id: 'char-3', name: '老王', type: 'supporting', description: '咖啡馆老板' },
      ];
      setScenes(mockScenes);
      setCharacters(mockCharacters);
      setShowPreview(true);
      message.success('剧本生成成功');
    } catch (err) {
      message.error('生成失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveWork = async () => {
    if (!workTitle.trim()) {
      message.warning('请输入作品名');
      return;
    }
    try {
      await createWork({
        title: workTitle,
        summary: '',
        genre: '',
        main_char: characters[0]?.name || '',
        supporting_chars: characters.slice(1).map((c) => c.name),
        word_count: yamlContent.length,
      });
      message.success('作品创建成功');
      navigate('/works');
    } catch (err) {
      message.error('创建失败');
    }
  };

  const handleBack = () => {
    navigate('/works');
  };

  return (
    <div style={{ minHeight: '100%', display: 'flex', gap: 24 }}>
      <Card
        style={{ width: 360, flexShrink: 0 }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileTextOutlined />
            <span>创作新作品</span>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <Text strong>作品名</Text>
            <Input
              placeholder="请输入作品名称"
              value={workTitle}
              onChange={(e) => setWorkTitle(e.target.value)}
              size="large"
              style={{ marginTop: 8 }}
            />
          </div>

          <div>
            <Text strong>导入剧本 (YAML)</Text>
            <Upload
              accept=".yaml,.yml"
              showUploadList={false}
              beforeUpload={handleUploadYAML}
              style={{ marginTop: 8 }}
            >
              <Button
                type="default"
                icon={<UploadOutlined />}
                block
                loading={uploading}
              >
                {uploading ? '导入中...' : '选择 YAML 文件'}
              </Button>
            </Upload>
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              支持 .yaml 或 .yml 格式文件
            </Text>
          </div>

          <div>
            <Text strong>生成剧本</Text>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              block
              loading={generating}
              onClick={handleGenerateScript}
              style={{ marginTop: 8 }}
            >
              {generating ? '生成中...' : 'AI 生成剧本'}
            </Button>
          </div>

          {showPreview && (
            <Button
              type="primary"
              block
              onClick={handleSaveWork}
            >
              保存作品
            </Button>
          )}

          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
          >
            返回作品列表
          </Button>
        </div>
      </Card>

      <Card
        style={{ flex: 1 }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileTextOutlined />
            <span>场景列表</span>
            {showPreview && (
              <Tag color="success">已导入</Tag>
            )}
          </div>
        }
      >
        {!showPreview ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#999' }}>
            <Alert
              message="请先导入 YAML 或生成剧本"
              description="导入剧本文件或使用 AI 生成后，场景列表将在此显示"
              type="info"
              showIcon
            />
          </div>
        ) : (
          <div>
            {characters.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <Text strong style={{ marginBottom: 8, display: 'block' }}>角色列表</Text>
                <Space wrap>
                  {characters.map((char) => (
                    <Tag
                      key={char.id}
                      color={char.type === 'protagonist' ? 'blue' : 'gray'}
                    >
                      {char.name} ({char.type === 'protagonist' ? '主角' : '配角'})
                    </Tag>
                  ))}
                </Space>
              </div>
            )}

            <Text strong style={{ marginBottom: 8, display: 'block' }}>场景预览</Text>
            <List
              dataSource={scenes}
              renderItem={(scene) => (
                <List.Item
                  key={scene.id}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #f0f0f0',
                    borderRadius: '8px',
                    marginBottom: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        background: '#1890ff',
                        color: '#fff',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      {scene.sequence}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{scene.title}</div>
                      <div style={{ color: '#666', fontSize: 13 }}>
                        {scene.slugline.type === 'interior' ? '内景' : '外景'} · {scene.slugline.name} ·{' '}
                        {scene.slugline.time === 'day' ? '白天' : scene.slugline.time === 'night' ? '夜晚' : scene.slugline.time}
                      </div>
                    </div>
                  </div>
                </List.Item>
              )}
              locale={{ emptyText: '暂无场景' }}
            />
          </div>
        )}
      </Card>
    </div>
  );
}