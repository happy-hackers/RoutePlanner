import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Input, Button, Checkbox, Typography, message, Spin } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { loginDriver } from '../utils/authUtils';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from "../components/LanguageSwitcher.tsx";

const { Content } = Layout;
const { Title, Text } = Typography;

export default function DriverLogin() {
  const { t } = useTranslation('driverLogin');
  const navigate = useNavigate();
  const [email, setEmail] = useState('hsupisces@hotmail.com');
  const [password, setPassword] = useState('adminadmin');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      message.error(t('message_error_required'));
      return;
    }

    setLoading(true);

    try {
      const result = await loginDriver(email, password);

      if (result.success) {
        message.success(t('message_login_success'));
        navigate('/driver-route');
      } else {
        message.error(result.error || t('message_login_failed_generic'));
      }
    } catch (error) {
      message.error(t('message_error_occurred'));
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

          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <Title level={2} style={{ margin: 0 }}>
              {t('app_name')}
            </Title>
            <Text type="secondary">{t('portal_title')}</Text>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
            </div>
          ) : (
            <>

              <div style={{ marginBottom: '20px' }}>
                <Input
                  size="large"
                  prefix={<UserOutlined />}
                  placeholder={t('placeholder_email')}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  style={{ fontSize: '16px' }}
                  autoComplete="email"
                />
              </div>


              <div style={{ marginBottom: '20px' }}>
                <Input.Password
                  size="large"
                  prefix={<LockOutlined />}
                  placeholder={t('placeholder_password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  style={{ fontSize: '16px' }}
                  autoComplete="current-password"
                />
              </div>


              <div style={{ marginBottom: '24px' }}>
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                >
                  {t('checkbox_remember_me')}
                </Checkbox>
              </div>


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
                {t('button_login')}
              </Button>

              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: '14px' }}>
                  {t('help_text')}
                </Text>
              </div>

              <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                zIndex: 1
              }}>
                <span style={{ whiteSpace: 'nowrap' }}>
                  {t('language_select')}
                </span>
                <LanguageSwitcher />
              </div>
            </>
          )}
        </div>
      </Content>
    </Layout>
  );
}