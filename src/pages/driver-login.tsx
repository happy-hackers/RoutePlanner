import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Input, Button, Checkbox, Typography, message, Spin } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { loginDriver } from '../utils/authUtils';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function DriverLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      message.error('Please enter email and password');
      return;
    }

    setLoading(true);

    try {
      const result = await loginDriver(email, password);

      if (result.success) {
        message.success('Login successful!');
        navigate('/driver-route');
      } else {
        message.error(result.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      message.error('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '400px',
          background: '#fff',
          padding: '40px 30px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {/* Logo/Title */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <Title level={2} style={{ margin: 0 }}>
              RoutePlanner
            </Title>
            <Text type="secondary">Driver Portal</Text>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
            </div>
          ) : (
            <>
              {/* Email Input */}
              <div style={{ marginBottom: '20px' }}>
                <Input
                  size="large"
                  prefix={<UserOutlined />}
                  placeholder="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  style={{ fontSize: '16px' }}
                  autoComplete="email"
                />
              </div>

              {/* Password Input */}
              <div style={{ marginBottom: '20px' }}>
                <Input.Password
                  size="large"
                  prefix={<LockOutlined />}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  style={{ fontSize: '16px' }}
                  autoComplete="current-password"
                />
              </div>

              {/* Remember Me */}
              <div style={{ marginBottom: '24px' }}>
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                >
                  Remember me
                </Checkbox>
              </div>

              {/* Login Button */}
              <Button
                type="primary"
                size="large"
                block
                onClick={handleLogin}
                style={{
                  height: '56px',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}
              >
                Login
              </Button>

              {/* Help Text */}
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: '14px' }}>
                  Contact your admin if you need help logging in
                </Text>
              </div>
            </>
          )}
        </div>
      </Content>
    </Layout>
  );
}
