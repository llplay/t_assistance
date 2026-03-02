import React, { useState, useEffect } from 'react';
import { Button, Input, Modal, Form, List, Card, Space, Tree, message, Divider, Typography } from 'antd';
import { BookOutlined, FileAddOutlined, ArrowRightOutlined, SaveOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '../config';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface Textbook {
  id: number;
  name: string;
  toc_content: any[];
  created_at: string;
}

const TextbookCenter: React.FC = () => {
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [tocPreview, setTocPreview] = useState<any[] | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchTextbooks();
  }, []);

  const fetchTextbooks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/textbooks`, {
        headers: { 'Authorization': token || '' }
      });
      if (response.ok) {
        const data = await response.json();
        setTextbooks(data);
      }
    } catch (error) {
      console.error('Fetch textbooks error:', error);
    }
  };

  const handleExtract = async () => {
    const text = form.getFieldValue('raw_text');
    if (!text) {
      message.warning('请输入目录文本');
      return;
    }

    setExtracting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/textbooks/extract-toc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token || ''
        },
        body: JSON.stringify({ text })
      });
      if (response.ok) {
        const data = await response.json();
        setTocPreview(data);
        message.success('提取成功');
      } else {
        message.error('提取失败');
      }
    } catch (error) {
      message.error('网络错误');
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    const name = form.getFieldValue('name');
    if (!name || !tocPreview) {
      message.warning('请输入教材名称并先完成数字化提取');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/textbooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token || ''
        },
        body: JSON.stringify({ name, toc_content: tocPreview })
      });
      if (response.ok) {
        message.success('保存成功');
        setModalVisible(false);
        setTocPreview(null);
        form.resetFields();
        fetchTextbooks();
      } else {
        message.error('保存失败');
      }
    } catch (error) {
      message.error('保存出错');
    } finally {
      setLoading(false);
    }
  };

  const renderTreeData = (data: any[]): { title: string; key: string; children: any[] }[] => {
    return data.map((item, index) => ({
      title: item.title,
      key: `${item.title}-${index}`,
      children: item.children ? renderTreeData(item.children) : []
    }));
  };

  return (
    <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <Title level={2}><BookOutlined /> 教材中心</Title>
          <Button type="primary" icon={<FileAddOutlined />} onClick={() => setModalVisible(true)}>
            数字化新教材
          </Button>
        </div>

        <List
          grid={{ gutter: 16, column: 3 }}
          dataSource={textbooks}
          renderItem={(tb) => (
            <List.Item>
              <Card
                title={tb.name}
                className="textbook-card"
                hoverable
                extra={<Text type="secondary">{new Date(tb.created_at).toLocaleDateString()}</Text>}
              >
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  <Tree treeData={renderTreeData(tb.toc_content)} />
                </div>
                <Divider />
                <Button block type="link" onClick={() => message.info('第二阶段将支持基于目录生成计划')}>
                  生成授课计划 <ArrowRightOutlined />
                </Button>
              </Card>
            </List.Item>
          )}
        />

        <Modal
          title="教材目录数字化"
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          width={800}
          footer={[
            <Button key="cancel" onClick={() => setModalVisible(false)}>取消</Button>,
            <Button key="save" type="primary" icon={<SaveOutlined />} loading={loading} onClick={handleSave} disabled={!tocPreview}>
              保存教材
            </Button>
          ]}
        >
          <Form form={form} layout="vertical">
            <Form.Item name="name" label="教材名称" rules={[{ required: true }]}>
              <Input placeholder="例如：人工智能技术应用" />
            </Form.Item>
            <Form.Item name="raw_text" label="粘贴目录文本" extra="提示：将教材的目录页文字粘贴在此处，AI 将自动分析结构。">
              <TextArea rows={10} placeholder="第一章... 第一节... 第二节... 第二章..." />
            </Form.Item>
            <Button loading={extracting} onClick={handleExtract} icon={<ArrowRightOutlined />}>
              开始数字化提取
            </Button>
          </Form>

          {tocPreview && (
            <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #d9d9d9', borderRadius: '4px', background: '#fafafa' }}>
              <Text strong>AI 结构化预览：</Text>
              <div style={{ marginTop: '10px' }}>
                <Tree treeData={renderTreeData(tocPreview)} defaultExpandAll />
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default TextbookCenter;
