import { API_BASE_URL } from '../config';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Input, List, Space, message, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import ReactJson from 'react-json-view';
import { UploadChangeParam, UploadFile } from 'antd/es/upload';

const { TextArea } = Input;

// 定义表单值的接口
interface FormValues {
  subject: string;
  grade: string;
  class: string;
  students: string;
  book_name: string;
  content: string;
  duration: string;
  location: string;
  time: string;
  method: string;
  teaching_process: string[];
  teaching_process_image?: File;
}

const Dashboard = () => {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();
  const [jsonMode, setJsonMode] = useState(false);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [teachingProcessImage, setTeachingProcessImage] = useState<File | null>(null);
  const resultRef = useRef('');

  const defaultProcess = [
    '明确任务', '分析任务', '探究新知', '训练技能', '评价总结'
  ];

  const defaultFormValues: FormValues = {
    book_name: ' 十四五国家规划：《人机对话智能系统开发》 李国燕 陈静 孙光明等 编著 机械工业出版社 2022.7。',
    subject: '人工智能技术应用',    // 默认专业名称
    grade: '大二',      // 默认授课年级
    class: '二班',      // 默认授课班级
    students: '全体学生', // 默认授课对象
    content: '云小微平台的使用',  // 默认授课内容
    duration: '2',   // 默认授课学时
    location: '2405',  // 默认授课地点
    time: '周一34', // 默认授课时间
    method: '理实一体化',   // 默认授课方式
    teaching_process: defaultProcess, // 默认教学流程
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
    } else {
      setUsername('User');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const onFinish = async (values: FormValues) => {
    setLoading(true);
    setResult('');
    resultRef.current = '';

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('未登录或登录已过期');
        navigate('/');
        return;
      }
      const response = await fetch(`${API_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify(values),
      });

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        resultRef.current += chunk;
        setResult(resultRef.current);
      }
    } catch (error) {
      console.error('Error:', error);
      setResult('生成过程中发生错误');
    }

    setLoading(false);
  };

  const handleDownload = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('未登录或登录已过期');
        navigate('/');
        return;
      }
      // 创建 FormData 对象
      const formData = new FormData();

      // 添加文本内容
      formData.append('content', result);

      // 如果有上传的教学流程图片，添加到 FormData
      if (teachingProcessImage) {
        formData.append('teaching_process_image', teachingProcessImage);
      }

      const response = await fetch(`${API_BASE_URL}/api/download`, {
        method: 'POST',
        headers: {
          'Authorization': token
        },
        body: formData,
        // 注意：使用 FormData 时不要设置 Content-Type 头，浏览器会自动设置
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'lesson_plan.docx';
      document.body.appendChild(a);
      a.click();

      a.remove();
      URL.revokeObjectURL(url);
      message.success('File downloaded successfully');
    } catch (error) {
      console.error('Error:', error);
      message.error('Failed to download file');
    }
  };


  const handleImageUpload = (info: UploadChangeParam<UploadFile>) => {
    if (info.file.originFileObj) {
      setTeachingProcessImage(info.file.originFileObj);
      message.success(`${info.file.name} 文件上传成功`);
    }
  };

  const toggleMode = () => {
    if (jsonMode) {
      const values = form.getFieldsValue();
      form.setFieldsValue(JSON.parse(JSON.stringify(values)));
    }
    setJsonMode(!jsonMode);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '20px', backgroundColor: '#f0f2f5' }}>
      <div style={{ display: 'flex', flex: 1, gap: '20px' }}>
        <div style={{ flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, color: '#1890ff' }}>课程计划表单</h2>
            <Space>
              <Button size="small" type="primary" onClick={() => navigate('/courses')}>📘 课程管理</Button>
              <Button size="small" onClick={() => navigate('/schedule')}>📋 授课计划</Button>
              <Button size="small" onClick={() => navigate('/textbooks')}>📚 教材中心</Button>
              <Button size="small" onClick={() => navigate('/change-password')}>修改密码</Button>
              <Button size="small" danger onClick={() => { localStorage.removeItem('token'); navigate('/'); }}>退出</Button>
            </Space>
          </div>

          {jsonMode ? (
            <ReactJson
              src={form.getFieldsValue()}
              onEdit={(edit) => {
                form.setFieldsValue(edit.updated_src);
              }}
              onAdd={(add) => {
                form.setFieldsValue(add.updated_src);
              }}
              onDelete={(del) => {
                form.setFieldsValue(del.updated_src);
              }}
              displayDataTypes={false}
              name={null}
            />
          ) : (
            <Form form={form} onFinish={onFinish} layout="vertical" initialValues={defaultFormValues}>
              <Form.Item name="subject" label="专业名称">
                <Input style={{ color: 'black', backgroundColor: 'white' }} />
              </Form.Item>
              <Form.Item name="grade" label="授课年级">
                <Input style={{ color: 'black', backgroundColor: 'white' }} />
              </Form.Item>
              <Form.Item name="class" label="授课班级">
                <Input style={{ color: 'black', backgroundColor: 'white' }} />
              </Form.Item>
              <Form.Item name="students" label="授课对象">
                <Input style={{ color: 'black', backgroundColor: 'white' }} />
              </Form.Item>
              <Form.Item name="book_name" label="教材">
                <Input style={{ color: 'black', backgroundColor: 'white' }} />
              </Form.Item>
              <Form.Item name="content" label="授课内容">
                <TextArea rows={4} style={{ color: 'black', backgroundColor: 'white' }} />
              </Form.Item>
              <Form.Item name="duration" label="授课学时">
                <Input style={{ color: 'black', backgroundColor: 'white' }} />
              </Form.Item>
              <Form.Item name="location" label="授课地点">
                <Input style={{ color: 'black', backgroundColor: 'white' }} />
              </Form.Item>
              <Form.Item name="time" label="授课时间">
                <Input style={{ color: 'black', backgroundColor: 'white' }} />
              </Form.Item>
              <Form.Item name="method" label="授课方式">
                <Input style={{ color: 'black', backgroundColor: 'white' }} />
              </Form.Item>

              {/* 添加教学流程图片上传 */}
              <Form.Item name="teaching_process_image" label="教学流程图片">
                <Upload
                  name="teaching_process_image"
                  accept="image/*"
                  maxCount={1}
                  onChange={handleImageUpload}
                  beforeUpload={() => false}
                  showUploadList={true}
                  listType="picture"
                >
                  <Button icon={<UploadOutlined />}>点击上传教学流程图片</Button>
                </Upload>
              </Form.Item>

              <Form.List name="teaching_process" initialValue={defaultProcess}>
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field, index) => (
                      <Space key={field.key} align="baseline">
                        <Form.Item
                          {...field}
                          validateTrigger={['onChange', 'onBlur']}
                          rules={[
                            {
                              required: true,
                              whitespace: true,
                              message: "请输入教学流程或删除此项",
                            },
                          ]}
                          noStyle
                        >
                          <Input placeholder="教学流程" style={{ width: '60%', color: 'black', backgroundColor: 'white' }} />
                        </Form.Item>
                        {fields.length > 1 && (
                          <Button onClick={() => remove(field.name)} type="link" danger>
                            删除
                          </Button>
                        )}
                      </Space>
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block>
                        添加教学流程
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </Form>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            <Button onClick={toggleMode} type="default">
              切换到{jsonMode ? '表单' : 'JSON'}模式
            </Button>
            <Button type="primary" onClick={() => form.submit()} loading={loading}>
              生成课程计划
            </Button>
          </div>
        </div>
        <div style={{ flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            <h2 style={{ marginBottom: '20px', color: '#1890ff' }}>生成的课程计划</h2>
            <Space>
              <Button onClick={() => navigate('/textbooks')}>教材中心</Button>
              <Button type="primary" onClick={handleLogout}>注销</Button>
            </Space>
          </div>
          <div style={{ flex: 1, border: '1px solid #d9d9d9', borderRadius: '4px', padding: '10px', marginBottom: '20px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
            <ReactMarkdown>{result || '生成的课程计划将显示在这里'}</ReactMarkdown>
          </div>
          <Button onClick={handleDownload} disabled={!result} type="primary" size="large">
            下载Word文档
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
