import { API_BASE_URL } from '../config';
import React from 'react';
import { Input, Button, Form, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import './Register.css';

const Register = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (response.ok) {
        message.success(data.message);
        navigate('/');
      } else {
        message.error(data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      message.error('注册失败,请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <div className="register-header">
          <h2>账号注册</h2>
          <p>创建一个新账号</p>
        </div>

        <Form 
          form={form} 
          onFinish={handleSubmit}
          className="register-form"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { max: 20, message: '用户名不超过20位' },
              {
                pattern: /^(?:\d+|[a-zA-Z]+|[a-zA-Z\d]+)$/i,
                message: '用户名为纯数字、纯英文字母或数字与英文字母组合',
              },
            ]}
          >
            <Input
              prefix={<UserOutlined className="site-form-item-icon" />}
              size="large"
              placeholder="请输入用户名"
              style={{ color: 'black', backgroundColor: 'white' }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
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
              placeholder="请输入密码"
              style={{ color: 'black', backgroundColor: 'white' }}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
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
              placeholder="请确认密码"
              style={{ color: 'black', backgroundColor: 'white' }}
            />
          </Form.Item>

          <Form.Item className="register-form-button">
            <Button 
              type="primary" 
              htmlType="submit"
              size="large"
              block
              loading={loading}
            >
              注册
            </Button>
          </Form.Item>

          <div className="register-form-footer">
            <span>
              已有账号? <Link to="/">立即登录</Link>
            </span>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default Register;
