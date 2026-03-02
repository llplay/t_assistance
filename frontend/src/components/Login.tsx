import { API_BASE_URL } from '../config';
import React from 'react';
import { Input, Button, Form, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import './Login.css'; // 需要创建对应的CSS文件

const Login = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        message.success('登录成功');
        navigate('/courses');
      } else {
        message.error(data.message || '登录失败');
      }
    } catch (error) {
      console.error('Error:', error);
      message.error('网络错误,请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h2>欢迎登录</h2>
          <p>请输入您的账号和密码</p>
        </div>

        <Form
          form={form}
          onFinish={handleSubmit}
          className="login-form"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { max: 6, message: '用户名不超过6位' },
              {
                pattern: /^(?:\d+|[a-zA-Z]+|[a-zA-Z\d]+)$/i,
                message: '用户名格式不正确',
              },
            ]}
          >
            <Input
              prefix={<UserOutlined
                className="site-form-item-icon"
              />}
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
                message: '密码格式不正确',
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

          <Form.Item className="login-form-button">
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
            >
              登录
            </Button>
          </Form.Item>

          <div className="login-form-footer">
            <Link to="/change-password">忘记密码?</Link>
            <span className="register-link">
              还没有账号? <Link to="/register">立即注册</Link>
            </span>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default Login;
