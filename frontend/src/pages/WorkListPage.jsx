import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Checkbox,
  Typography,
  message,
  Modal,
  Form,
  Input,
  Select,
  Space,
} from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { listWorks, deleteWork, updateWork } from '../services/work';

const { Title, Text } = Typography;

export default function WorkListPage() {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorks, setSelectedWorks] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWork, setEditingWork] = useState(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    fetchWorks();
  }, []);

  const fetchWorks = async () => {
    setLoading(true);
    try {
      const result = await listWorks();
      setWorks(result.works || []);
    } catch (err) {
      message.error('获取作品列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedWorks(works.map((w) => w.id));
    } else {
      setSelectedWorks([]);
    }
  };

  const handleSelect = (id) => {
    if (selectedWorks.includes(id)) {
      setSelectedWorks(selectedWorks.filter((w) => w !== id));
    } else {
      setSelectedWorks([...selectedWorks, id]);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteWork(id);
      message.success('删除成功');
      fetchWorks();
    } catch (err) {
      message.error('删除失败');
    }
  };

  const handleBatchDelete = () => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedWorks.length} 个作品吗？`,
      onOk: async () => {
        for (const id of selectedWorks) {
          await deleteWork(id);
        }
        message.success('批量删除成功');
        setSelectedWorks([]);
        fetchWorks();
      },
    });
  };

  const handleEdit = (work) => {
    setEditingWork(work);
    form.setFieldsValue({
      title: work.title,
      summary: work.summary,
      genre: work.genre,
      mainChar: work.mainChar,
      supportingChars: work.supportingChars?.join(', ') || '',
      wordCount: work.wordCount?.toString() || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (values) => {
    try {
      await updateWork(editingWork.id, {
        title: values.title,
        summary: values.summary,
        genre: values.genre,
        main_char: values.mainChar,
        supporting_chars: values.supportingChars?.split(',').map((s) => s.trim()) || [],
        word_count: parseInt(values.wordCount) || 0,
      });
      message.success('更新成功');
      setShowEditModal(false);
      setEditingWork(null);
      form.resetFields();
      fetchWorks();
    } catch (err) {
      message.error('更新失败');
    }
  };

  const getSupportingChars = (work) => {
    if (!work.supportingChars) return [];
    if (Array.isArray(work.supportingChars)) return work.supportingChars;
    try {
      return JSON.parse(work.supportingChars);
    } catch {
      return [];
    }
  };

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2}>作品列表</Title>
        <Space>
          {selectedWorks.length > 0 && (
            <Button danger onClick={handleBatchDelete}>
              批量删除 ({selectedWorks.length})
            </Button>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/create-work')}>
            创作新作品
          </Button>
        </Space>
      </div>

      <Card bordered={false}>
        <div style={{ marginBottom: 16 }}>
          <Checkbox onChange={handleSelectAll} checked={selectedWorks.length === works.length && works.length > 0}>
            全选
          </Checkbox>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>加载中...</div>
        ) : works.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
            <Text type="secondary">暂无作品，点击上方按钮创作新作品</Text>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {works.map((work) => (
              <div
                key={work.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '16px',
                  border: '1px solid #f0f0f0',
                  borderRadius: '8px',
                  background: '#fff',
                  gap: 16,
                }}
              >
                <Checkbox checked={selectedWorks.includes(work.id)} onChange={() => handleSelect(work.id)} />

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 16 }}>{work.title}</Text>
                    <span style={{ padding: '2px 8px', background: '#e6f7ff', color: '#1890ff', borderRadius: '4px', fontSize: 12 }}>
                      {work.status === 'published' ? '已发布' : '草稿'}
                    </span>
                  </div>
                  <p style={{ color: '#666', marginBottom: 8 }}>{work.summary}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#999', fontSize: 13 }}>
                    <span>
                      <Text strong style={{ color: '#666' }}>主角：</Text>{work.mainChar || '未设置'}
                    </span>
                    <span>
                      <Text strong style={{ color: '#666' }}>副角：</Text>
                      {getSupportingChars(work).map((char, idx) => (
                        <span key={idx}>{char}{idx < getSupportingChars(work).length - 1 ? '、' : ''}</span>
                      ))}
                      {getSupportingChars(work).length === 0 && '未设置'}
                    </span>
                    <span>字数：{work.wordCount || 0}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(work)}
                    size="small"
                  >
                    编辑
                  </Button>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(work.id)}
                    size="small"
                  >
                    删除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        title="编辑作品"
        visible={showEditModal}
        onCancel={() => {
          setShowEditModal(false);
          setEditingWork(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveEdit}
        >
          <Form.Item
            name="title"
            label="作品标题"
            rules={[{ required: true, message: '请输入作品标题' }]}
          >
            <Input placeholder="请输入作品标题" />
          </Form.Item>
          <Form.Item name="summary" label="作品简介">
            <Input.TextArea placeholder="请输入作品简介" rows={3} />
          </Form.Item>
          <Form.Item name="genre" label="类型">
            <Select placeholder="请选择类型">
              <Select.Option value="film">电影</Select.Option>
              <Select.Option value="tv">电视剧</Select.Option>
              <Select.Option value="theater">舞台剧</Select.Option>
              <Select.Option value="other">其他</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="mainChar" label="主角">
            <Input placeholder="请输入主角名称" />
          </Form.Item>
          <Form.Item name="supportingChars" label="副角">
            <Input placeholder="多个副角用逗号分隔" />
          </Form.Item>
          <Form.Item name="wordCount" label="字数">
            <Input type="number" placeholder="请输入字数" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setShowEditModal(false);
                setEditingWork(null);
                form.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                保存修改
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}