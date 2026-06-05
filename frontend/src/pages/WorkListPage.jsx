import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Typography, message, Modal } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons';
import { listWorks, deleteWork } from '../services/work';

const { Title, Text } = Typography;

export default function WorkListPage() {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWorks();
  }, []);

  const fetchWorks = async () => {
    setLoading(true);
    try {
      const result = await listWorks();
      setWorks(result.works || result.data || result || []);
    } catch (err) {
      console.error('获取作品列表失败:', err);
      message.error('获取作品列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (work, e) => {
    e.stopPropagation();
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除作品「${work.title || '(未命名)'}」吗？该作品下的所有剧本和场景都将被永久删除，此操作不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteWork(work.id || work.ID);
          message.success('删除成功');
          fetchWorks();
        } catch (err) {
          message.error('删除失败');
        }
      },
    });
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

  const handleOpen = (id) => {
    navigate(`/works/${id}`);
  };

  return (
    <div style={{ minHeight: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          作品列表
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/create-work')}>
          创作新作品
        </Button>
      </div>

      <Card bordered={false} style={{ background: 'transparent', padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: 8 }}>
            加载中...
          </div>
        ) : works.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px',
              color: '#999',
              background: '#fff',
              borderRadius: 8,
            }}
          >
            <Text type="secondary">暂无作品，点击上方按钮创作新作品</Text>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {works.map((work) => (
              <Card
                key={work.id}
                hoverable
                onClick={() => handleOpen(work.id)}
                style={{
                  cursor: 'pointer',
                  border: '1px solid #f0f0f0',
                  borderRadius: 8,
                }}
                bodyStyle={{ padding: '20px 24px' }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ fontSize: 16 }}>
                      {work.title}
                    </Text>
                    {work.summary && (
                      <p style={{ color: '#666', margin: '4px 0 8px 0' }}>{work.summary}</p>
                    )}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        color: '#999',
                        fontSize: 13,
                      }}
                    >
                      {work.mainChar && <span>主角：{work.mainChar}</span>}
                      {getSupportingChars(work).length > 0 && (
                        <span>
                          副角：
                          {getSupportingChars(work).join('、')}
                        </span>
                      )}
                      {work.wordCount && <span>字数：{work.wordCount}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Button
                      type="text"
                      icon={<DeleteOutlined />}
                      onClick={(e) => handleDelete(work, e)}
                      size="small"
                      danger
                    >
                      删除
                    </Button>
                    <RightOutlined style={{ color: '#ccc', fontSize: 14 }} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
