import { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  List,
  Tag,
  Space,
  Modal,
  message,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
  EditOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  listProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  setDefaultProvider,
  testProvider,
} from '../services/api';

const { Text, Paragraph } = Typography;

const PROVIDER_TYPES = [
  { value: 'openai', label: 'OpenAI 兼容' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'custom', label: '自定义' },
];

// 常用预设，方便用户快速填入
const PRESETS = [
  { name: 'DeepSeek', base_url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { name: 'OpenAI GPT', base_url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { name: 'SiliconFlow', base_url: 'https://api.siliconflow.cn/v1', model: '' },
  { name: 'Ollama 本地', base_url: 'http://localhost:11434/v1', model: '' },
];

export default function SettingsPage() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [testingId, setTestingId] = useState(null);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    listProviders()
      .then((resp) => {
        setProviders(resp?.providers || []);
      })
      .catch((err) => {
        message.error(err.message || '加载失败');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ provider: 'openai', max_tokens: 32000 });
    setFormVisible(true);
  };

  const handleEdit = (provider) => {
    setEditingId(provider.id);
    form.setFieldsValue({
      name: provider.name,
      provider: provider.provider,
      base_url: provider.base_url,
      model: provider.model,
      max_tokens: provider.max_tokens,
      is_default: provider.is_default,
      api_key: '', // 不回显 API Key，让用户重新输入或留空表示不修改
    });
    setFormVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await updateProvider(editingId, values);
        message.success('已更新配置');
      } else {
        await createProvider(values);
        message.success('已添加配置');
      }
      setFormVisible(false);
      load();
    } catch (err) {
      if (err?.errorFields) return; // form validation error, already shown
      message.error(err.message || '保存失败');
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: '确认删除？',
      content: '删除后无法恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteProvider(id);
          message.success('已删除');
          load();
        } catch (err) {
          message.error(err.message || '删除失败');
        }
      },
    });
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultProvider(id);
      message.success('已设为默认');
      load();
    } catch (err) {
      message.error(err.message || '设置失败');
    }
  };

  const handleTest = async (id) => {
    setTestingId(id);
    try {
      const resp = await testProvider(id);
      if (resp?.reply) {
        message.success('连接正常：' + resp.reply);
      } else {
        message.success('连接测试成功');
      }
    } catch (err) {
      message.error('测试失败：' + (err.message || '未知错误'));
    } finally {
      setTestingId(null);
    }
  };

  const applyPreset = (preset) => {
    form.setFieldsValue({
      name: preset.name,
      base_url: preset.base_url,
      model: preset.model || form.getFieldValue('model'),
    });
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Card
        title={
          <Space>
            <SettingOutlined />
            <span>大模型 API 配置</span>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加配置
          </Button>
        }
      >
        <Paragraph type="secondary" style={{ marginTop: 0 }}>
          在这里管理您的大模型配置。所有 API Key 仅存储在您本地数据库中，不会上传到其他地方。
          改编剧本时可以选择使用哪一套配置。
        </Paragraph>

        <List
          loading={loading}
          grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }}
          dataSource={providers}
          locale={{ emptyText: '暂无配置，点击右上角「添加配置」开始' }}
          renderItem={(p) => (
            <List.Item>
              <Card
                size="small"
                title={
                  <Space>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    {p.is_default && <Tag color="green">默认</Tag>}
                  </Space>
                }
                extra={
                  <Tag color="blue" style={{ marginRight: 0 }}>
                    {p.provider}
                  </Tag>
                }
                style={{ width: '100%' }}
              >
                <div style={{ fontSize: 13, color: '#666', lineHeight: 1.8 }}>
                  <div>模型：<Text>{p.model}</Text></div>
                  <div>端点：<Text code>{p.base_url}</Text></div>
                  <div>最大 Token：<Text>{p.max_tokens}</Text></div>
                  <div>创建：<Text>{String(p.created_at || '').slice(0, 10)}</Text></div>
                </div>

                <Divider style={{ margin: '12px 0' }} />

                <Space wrap>
                  <Button size="small" onClick={() => handleTest(p.id)} loading={testingId === p.id} icon={<ExperimentOutlined />}>
                    测试连接
                  </Button>
                  {!p.is_default && (
                    <Button size="small" onClick={() => handleSetDefault(p.id)} icon={<CheckCircleOutlined />}>
                      设为默认
                    </Button>
                  )}
                  <Button size="small" onClick={() => handleEdit(p)} icon={<EditOutlined />}>
                    编辑
                  </Button>
                  <Button size="small" danger onClick={() => handleDelete(p.id)} icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Space>
              </Card>
            </List.Item>
          )}
        />
      </Card>

      <Modal
        title={editingId ? '编辑大模型配置' : '添加大模型配置'}
        open={formVisible}
        onCancel={() => setFormVisible(false)}
        onOk={handleSubmit}
        okText="保存"
        cancelText="取消"
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="配置名称"
            name="name"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="例如：我的 DeepSeek 账号" />
          </Form.Item>

          <Form.Item
            label="服务商"
            name="provider"
            rules={[{ required: true, message: '请选择服务商' }]}
          >
            <Select options={PROVIDER_TYPES} />
          </Form.Item>

          {!editingId && (
            <Form.Item label="快速预设">
              <Space wrap>
                {PRESETS.map((ps) => (
                  <Button key={ps.name} size="small" onClick={() => applyPreset(ps)}>
                    {ps.name}
                  </Button>
                ))}
              </Space>
            </Form.Item>
          )}

          <Form.Item
            label="API Base URL"
            name="base_url"
            rules={[{ required: true, message: '请输入 API Base URL' }]}
          >
            <Input placeholder="https://api.deepseek.com/v1" />
          </Form.Item>

          <Form.Item
            label="API Key"
            name="api_key"
            rules={[{ required: !editingId, message: '请输入 API Key' }]}
          >
            <Input.Password placeholder="sk-..." />
            {editingId && <Text type="secondary" style={{ fontSize: 12 }}>留空则不修改现有 Key</Text>}
          </Form.Item>

          <Form.Item
            label="模型名称"
            name="model"
            rules={[{ required: true, message: '请输入模型名称' }]}
          >
            <Input placeholder="例如 deepseek-chat、gpt-4o-mini、qwen-plus" />
          </Form.Item>

          <Form.Item label="最大 Token 数" name="max_tokens" initialValue={32000}>
            <InputNumber min={1024} max={200000} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="设为默认" name="is_default" valuePropName="checked">
            <Select
              options={[
                { value: true, label: '是' },
                { value: false, label: '否' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
