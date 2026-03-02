import { API_BASE_URL } from '../config';
import React from 'react';
import { Input, Button, Form, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { LockOutlined } from '@ant-design/icons';
import './ChangePassword.css';

const ChangePassword = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (values: any) => {
    const token = localStorage.getItem('token');
    if (!token) {
      message.error('请先登录');
      navigate('/');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/change_password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          old_password: values.oldPassword,
          new_password: values.newPassword
        }),
      });
      const data = await response.json();
      if (response.ok) {
        message.success(data.message);
        navigate('/dashboard');
      } else {
        message.error(data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      message.error('修改失败,请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-container">
      <div className="change-password-box">
        <div className="change-password-header">
          <h2>修改密码</h2>
          <p>请输入旧密码和新密码</p>
        </div>

        <Form 
          form={form} 
          onFinish={handleSubmit}
          className="change-password-form"
        >
          <Form.Item
            name="oldPassword"
            rules={[
              { required: true, message: '请输入旧密码' },
              { min: 6, message: '密码最少6位' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              size="large"
              placeholder="请输入旧密码"
            />
          </Form.Item>

          <Form.Item
            name="newPassword"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码最少6位' },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
                message: '密码需包含至少1个大写字母、1个小写字母、1个数字和1个特殊字符',
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              size="large"
              placeholder="请输入新密码"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              size="large"
              placeholder="请确认新密码"
            />
          </Form.Item>

          <Form.Item className="change-password-form-button">
            <Button 
              type="primary" 
              htmlType="submit"
              size="large"
              block
              loading={loading}
            >
              确认修改
            </Button>
          </Form.Item>

          <div className="change-password-form-footer">
            <Button 
              type="link" 
              onClick={() => navigate('/dashboard')}
            >
              返回首页
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default ChangePassword;