import {
  CheckCircleOutlined,
  CloudServerOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  FireOutlined,
  GlobalOutlined,
  LockOutlined,
  MailOutlined,
  MessageOutlined,
  MobileOutlined,
  ReloadOutlined,
  SaveOutlined,
  SendOutlined,
  SettingOutlined,
  WarningOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '../services/apiClient';
import { notificationSettingsService } from '../services/notificationSettingsService';
import PageHeader from '../components/PageHeader';
import { useUIStore } from '../stores/uiStore';

const { Text } = Typography;

const STORAGE_KEY = 'vms-settings';

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

const DEFAULTS = {
  orgName:     'VMS Bangladesh Ltd.',
  currency:    'BDT',
  dateFormat:  'DD MMM YYYY',
  language:    'en',
  timezone:    'Asia/Dhaka',
  notifMaintenance: true,
  notifDispatch:    true,
  notifFuel:        true,
  notifLeave:       true,
};

export default function Settings() {
  const isDark              = useUIStore((s) => s.isDark);
  const toggleTheme         = useUIStore((s) => s.toggleTheme);
  const sidebarCollapsed    = useUIStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);

  const saved = loadSettings();
  const [generalForm] = Form.useForm();
  const [pwdForm]     = Form.useForm();
  const [mapForm]     = Form.useForm();

  // Notification provider forms
  const [fcmForm]   = Form.useForm();
  const [smsForm]   = Form.useForm();
  const [emailForm] = Form.useForm();
  const [waForm]    = Form.useForm();

  const [notifs, setNotifs] = useState({
    maintenance: saved.notifMaintenance ?? DEFAULTS.notifMaintenance,
    dispatch:    saved.notifDispatch    ?? DEFAULTS.notifDispatch,
    fuel:        saved.notifFuel        ?? DEFAULTS.notifFuel,
    leave:       saved.notifLeave       ?? DEFAULTS.notifLeave,
  });

  const [compactTables, setCompactTables] = useState(saved.compactTables ?? false);
  const [version] = useState('v1.0.0');

  const [googleKeyVisible, setGoogleKeyVisible] = useState(false);
  const [googleKeySaved, setGoogleKeySaved]     = useState(!!saved.googleMapsKey);

  // Notification providers
  const [providerEnabled, setProviderEnabled] = useState({ fcm: false, sms: false, email: false, whatsapp: false });
  const [testTarget,  setTestTarget]  = useState({ fcm: '', sms: '', email: '', whatsapp: '' });
  const [testLoading, setTestLoading] = useState({});
  const [savingCh, setSavingCh]       = useState(null);
  const [smsProvider, setSmsProvider]   = useState('twilio');
  const [waProvider,  setWaProvider]    = useState('twilio');

  // Load provider configs from backend
  useEffect(() => {
    notificationSettingsService.getAll()
      .then((res) => {
        const list = res.data?.data ?? res.data ?? [];
        const enabled = { fcm: false, sms: false, email: false, whatsapp: false };
        list.forEach((s) => {
          enabled[s.channel] = s.enabled ?? false;
          const cfg = JSON.parse(s.configJson ?? '{}');
          if (s.channel === 'fcm')      { fcmForm.setFieldsValue(cfg); }
          if (s.channel === 'sms')      { smsForm.setFieldsValue(cfg); setSmsProvider(cfg.provider ?? 'twilio'); }
          if (s.channel === 'email')    { emailForm.setFieldsValue({ useTls: true, ...cfg }); }
          if (s.channel === 'whatsapp') { waForm.setFieldsValue(cfg); setWaProvider(cfg.provider ?? 'twilio'); }
        });
        setProviderEnabled(enabled);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveChannel(channel, form) {
    try {
      const values = await form.validateFields();
      setSavingCh(channel);
      await notificationSettingsService.save(channel, {
        enabled: providerEnabled[channel],
        configJson: JSON.stringify(values),
      });
      message.success(`${channel.toUpperCase()} settings saved`);
    } catch {
      message.error('Save failed — check required fields');
    } finally {
      setSavingCh(null);
    }
  }

  async function testChannel(channel) {
    setTestLoading((p) => ({ ...p, [channel]: true }));
    try {
      const res = await notificationSettingsService.test(channel, testTarget[channel]);
      const result = res.data?.data ?? res.data?.message ?? 'Sent successfully';
      message.success(`Test: ${result}`);
    } catch (e) {
      message.error(e.response?.data?.message ?? 'Test failed — check configuration');
    } finally {
      setTestLoading((p) => ({ ...p, [channel]: false }));
    }
  }

  /* ── System Utilization ─────────────────────────────────────────── */
  const [sysStats, setSysStats]           = useState(null);
  const [sysRefreshing, setSysRefreshing] = useState(false);
  const sysTimer = useRef(null);

  const fetchSysStats = useCallback(async (showMsg = false) => {
    if (showMsg) setSysRefreshing(true);
    try {
      const res = await apiClient.get('/system/stats');
      setSysStats(res.data.data);
      if (showMsg) message.success('System stats refreshed');
    } catch {
      if (showMsg) message.error('Failed to fetch system stats');
    } finally {
      if (showMsg) setSysRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSysStats();
    sysTimer.current = setInterval(() => fetchSysStats(), 5000);
    return () => clearInterval(sysTimer.current);
  }, [fetchSysStats]);

  const cpuPct    = sysStats?.cpu     ?? 0;
  const ramPct    = sysStats?.ramPct  ?? 0;
  const diskPct   = sysStats?.diskPct ?? 0;
  const cpuColor  = cpuPct  > 80 ? '#ff4d4f' : cpuPct  > 50 ? '#fa8c16' : '#52c41a';
  const ramColor  = ramPct  > 80 ? '#ff4d4f' : ramPct  > 50 ? '#fa8c16' : '#1677ff';
  const diskColor = diskPct > 80 ? '#ff4d4f' : diskPct > 50 ? '#fa8c16' : '#722ed1';

  function fmtBytes(bytes) {
    if (!bytes) return '—';
    return (bytes / 1073741824).toFixed(1) + ' GB';
  }

  function saveGeneral() {
    generalForm.validateFields().then((values) => {
      const prev = loadSettings();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, ...values }));
      message.success('General settings saved');
    });
  }

  function saveNotifications() {
    const prev = loadSettings();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...prev,
      notifMaintenance: notifs.maintenance,
      notifDispatch:    notifs.dispatch,
      notifFuel:        notifs.fuel,
      notifLeave:       notifs.leave,
    }));
    message.success('Notification preferences saved');
  }

  function saveAppearance() {
    const prev = loadSettings();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, compactTables }));
    message.success('Appearance settings saved');
  }

  function handlePasswordChange() {
    pwdForm.validateFields().then(() => {
      pwdForm.resetFields();
      message.success('Password updated successfully');
    });
  }

  function saveMapSettings() {
    mapForm.validateFields().then((values) => {
      const prev = loadSettings();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, ...values }));
      setGoogleKeySaved(!!values.googleMapsKey);
      message.success('Map settings saved');
    });
  }

  function clearGoogleKey() {
    mapForm.setFieldValue('googleMapsKey', '');
    const prev = loadSettings();
    delete prev.googleMapsKey;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prev));
    setGoogleKeySaved(false);
    message.success('Google Maps key removed');
  }

  /* ── Provider tab helper ─────────────────────────────────────────── */
  function ProviderHeader({ channel, form, color, icon }) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <span style={{ color, fontSize: 16 }}>{icon}</span>
          <Switch
            checked={providerEnabled[channel]}
            onChange={(v) => setProviderEnabled((p) => ({ ...p, [channel]: v }))}
            checkedChildren="ON"
            unCheckedChildren="OFF"
          />
          <Text style={{ fontSize: 12 }} type="secondary">
            {providerEnabled[channel] ? 'Channel enabled' : 'Channel disabled'}
          </Text>
        </Space>
        <Button
          type="primary"
          size="small"
          icon={<SaveOutlined />}
          loading={savingCh === channel}
          onClick={() => saveChannel(channel, form)}
        >
          Save
        </Button>
      </div>
    );
  }

  function TestRow({ channel, placeholder }) {
    return (
      <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
        <Input
          size="small"
          placeholder={placeholder}
          value={testTarget[channel]}
          onChange={(e) => setTestTarget((p) => ({ ...p, [channel]: e.target.value }))}
          style={{ flex: 1 }}
        />
        <Button
          size="small"
          icon={<SendOutlined />}
          loading={testLoading[channel]}
          disabled={!providerEnabled[channel]}
          onClick={() => testChannel(channel)}
        >
          Send Test
        </Button>
      </div>
    );
  }

  const providerTabs = [
    {
      key: 'email',
      label: <span><MailOutlined /> Email</span>,
      children: (
        <>
          <ProviderHeader channel="email" form={emailForm} color="#52c41a" icon={<MailOutlined />} />
          <Form form={emailForm} layout="vertical" size="small">
            <Row gutter={12}>
              <Col xs={24} sm={16}>
                <Form.Item name="host" label="SMTP Host" rules={[{ required: true }]}>
                  <Input placeholder="smtp.gmail.com" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="port" label="Port" rules={[{ required: true }]}>
                  <Input placeholder="587" type="number" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="username" label="Username / Login" rules={[{ required: true }]}>
                  <Input placeholder="you@gmail.com" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="password" label="SMTP Password">
                  <Input.Password placeholder="App password or SMTP password" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="fromEmail" label="From Email">
                  <Input placeholder="noreply@yourdomain.com" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="fromName" label="From Name">
                  <Input placeholder="VMS System" />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item name="useTls" label="Use TLS (STARTTLS)" valuePropName="checked">
                  <Switch checkedChildren="TLS" unCheckedChildren="SSL" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
          <Alert type="info" showIcon style={{ borderRadius: 8, marginTop: 4 }}
            message={<Text style={{ fontSize: 11 }}>For Gmail: enable 2FA and use an <b>App Password</b>, not your account password. Port 587 + TLS is recommended.</Text>}
          />
          <TestRow channel="email" placeholder="recipient@example.com" />
        </>
      ),
    },
    {
      key: 'fcm',
      label: <span><FireOutlined /> FCM Push</span>,
      children: (
        <>
          <ProviderHeader channel="fcm" form={fcmForm} color="#fa8c16" icon={<FireOutlined />} />
          <Form form={fcmForm} layout="vertical" size="small">
            <Form.Item name="serverKey" label="FCM Server Key (Legacy API)" rules={[{ required: true }]}>
              <Input.Password placeholder="AAAA…" />
            </Form.Item>
            <Form.Item name="senderId" label="Sender ID">
              <Input placeholder="123456789012" />
            </Form.Item>
            <Form.Item name="testToken" label="Default Test Device Token">
              <Input placeholder="Device FCM token for default test target" />
            </Form.Item>
          </Form>
          <Alert type="info" showIcon style={{ borderRadius: 8, marginTop: 4 }}
            message={<Text style={{ fontSize: 11 }}>Get the Server Key from Firebase Console → Project Settings → Cloud Messaging. The test token should be a real FCM device registration token.</Text>}
          />
          <TestRow channel="fcm" placeholder="Device FCM token (overrides default)" />
        </>
      ),
    },
    {
      key: 'sms',
      label: <span><MobileOutlined /> SMS</span>,
      children: (
        <>
          <ProviderHeader channel="sms" form={smsForm} color="#1677ff" icon={<MobileOutlined />} />
          <Form form={smsForm} layout="vertical" size="small">
            <Form.Item name="provider" label="SMS Provider">
              <Select
                value={smsProvider}
                onChange={(v) => { setSmsProvider(v); smsForm.setFieldValue('provider', v); }}
                options={[
                  { value: 'twilio', label: 'Twilio' },
                  { value: 'custom', label: 'Custom HTTP API' },
                ]}
              />
            </Form.Item>
            <Row gutter={12}>
              <Col xs={24} sm={12}>
                <Form.Item name="apiKey" label={smsProvider === 'twilio' ? 'Account SID' : 'API Key'} rules={[{ required: true }]}>
                  <Input placeholder={smsProvider === 'twilio' ? 'ACxxxxxxx…' : 'Your API key'} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="apiSecret" label={smsProvider === 'twilio' ? 'Auth Token' : 'API Secret'}>
                  <Input.Password placeholder="••••••••" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="fromNumber" label="From Number">
                  <Input placeholder="+14155552671" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="testNumber" label="Default Test Number">
                  <Input placeholder="+8801700000000" />
                </Form.Item>
              </Col>
              {smsProvider === 'custom' && (
                <Col xs={24}>
                  <Form.Item name="apiUrl" label="API Endpoint URL" rules={[{ required: true }]}>
                    <Input placeholder="https://sms-gateway.example.com/send" />
                  </Form.Item>
                </Col>
              )}
            </Row>
          </Form>
          <TestRow channel="sms" placeholder="+8801XXXXXXXXX (overrides default)" />
        </>
      ),
    },
    {
      key: 'whatsapp',
      label: <span><WifiOutlined /> WhatsApp</span>,
      children: (
        <>
          <ProviderHeader channel="whatsapp" form={waForm} color="#25D366" icon={<MessageOutlined />} />
          <Form form={waForm} layout="vertical" size="small">
            <Form.Item name="provider" label="WhatsApp Provider">
              <Select
                value={waProvider}
                onChange={(v) => { setWaProvider(v); waForm.setFieldValue('provider', v); }}
                options={[
                  { value: 'twilio', label: 'Twilio WhatsApp' },
                  { value: 'meta',   label: 'Meta WhatsApp Business API' },
                ]}
              />
            </Form.Item>
            {waProvider === 'twilio' && (
              <Row gutter={12}>
                <Col xs={24} sm={12}>
                  <Form.Item name="apiKey" label="Twilio Account SID" rules={[{ required: true }]}>
                    <Input placeholder="ACxxxxxxx…" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="apiSecret" label="Auth Token">
                    <Input.Password placeholder="••••••••" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="fromNumber" label="From (WhatsApp Sandbox Number)">
                    <Input placeholder="+14155238886" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="testNumber" label="Default Test Number">
                    <Input placeholder="+8801700000000" />
                  </Form.Item>
                </Col>
              </Row>
            )}
            {waProvider === 'meta' && (
              <Row gutter={12}>
                <Col xs={24} sm={12}>
                  <Form.Item name="phoneNumberId" label="Phone Number ID" rules={[{ required: true }]}>
                    <Input placeholder="1234567890" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="testNumber" label="Default Test Number">
                    <Input placeholder="+8801700000000" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="accessToken" label="Permanent Access Token" rules={[{ required: true }]}>
                    <Input.Password placeholder="EAAxxxxx…" />
                  </Form.Item>
                </Col>
              </Row>
            )}
          </Form>
          {waProvider === 'meta' && (
            <Alert type="info" showIcon style={{ borderRadius: 8, marginTop: 4 }}
              message={<Text style={{ fontSize: 11 }}>Get the Phone Number ID and Access Token from Meta Business → WhatsApp → API Setup. Use a permanent token, not a temporary one.</Text>}
            />
          )}
          <TestRow channel="whatsapp" placeholder="+8801XXXXXXXXX (overrides default)" />
        </>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        icon={<SettingOutlined />}
        color="#8c8c8c"
        title="Settings"
        subtitle="Application preferences, appearance and security options"
        stats={[
          { label: 'Version',  value: version,                    color: '#8c8c8c' },
          { label: 'Theme',    value: isDark ? 'Dark' : 'Light',  color: '#1677ff' },
          { label: 'Currency', value: 'BDT',                      color: '#52c41a' },
        ]}
      />

      <Row gutter={[16, 16]}>
        {/* System Utilization */}
        <Col xs={24}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CloudServerOutlined style={{ color: '#1677ff' }} />
                <span>System Utilization</span>
                <Tag color="blue" style={{ fontSize: 10 }}>Live</Tag>
              </div>
            }
            size="small"
            style={{ borderRadius: 12 }}
            extra={
              <Button size="small" icon={<ReloadOutlined spin={sysRefreshing} />} onClick={() => fetchSysStats(true)} loading={sysRefreshing}>
                Refresh
              </Button>
            }
          >
            <Spin spinning={!sysStats}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                  <div style={{ padding: '8px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text strong style={{ fontSize: 13 }}>CPU Usage</Text>
                      <Text style={{ fontSize: 20, fontWeight: 800, color: cpuColor }}>{cpuPct}%</Text>
                    </div>
                    <Progress percent={cpuPct} strokeColor={cpuColor} size="small" showInfo={false} />
                    <Text type="secondary" style={{ fontSize: 11 }}>{sysStats?.availableProcessors ?? '—'}-thread</Text>
                  </div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <div style={{ padding: '8px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text strong style={{ fontSize: 13 }}>RAM Usage</Text>
                      <Text style={{ fontSize: 20, fontWeight: 800, color: ramColor }}>{ramPct}%</Text>
                    </div>
                    <Progress percent={ramPct} strokeColor={ramColor} size="small" showInfo={false} />
                    <Text type="secondary" style={{ fontSize: 11 }}>{fmtBytes(sysStats?.ramUsed)} used of {fmtBytes(sysStats?.ramTotal)}</Text>
                  </div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <div style={{ padding: '8px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text strong style={{ fontSize: 13 }}>Disk Usage</Text>
                      <Text style={{ fontSize: 20, fontWeight: 800, color: diskColor }}>{diskPct}%</Text>
                    </div>
                    <Progress percent={diskPct} strokeColor={diskColor} size="small" showInfo={false} />
                    <Text type="secondary" style={{ fontSize: 11 }}>{fmtBytes(sysStats?.diskUsed)} used of {fmtBytes(sysStats?.diskTotal)}</Text>
                  </div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <div style={{ padding: '8px 0' }}>
                    <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>Server Uptime</Text>
                    <Text style={{ fontSize: 22, fontWeight: 800, color: '#13c2c2', lineHeight: 1 }}>{sysStats?.uptime ?? '—'}</Text>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>since last restart</Text>
                  </div>
                </Col>
              </Row>

              <Divider style={{ margin: '12px 0' }} />

              <Row gutter={[24, 12]}>
                {[
                  { label: 'Local IP',    value: sysStats?.ip,          color: '#1677ff' },
                  { label: 'Server OS',   value: sysStats?.os,          color: '#52c41a' },
                  { label: 'Runtime',     value: sysStats?.runtime,     color: '#fa8c16' },
                  { label: 'Uptime',      value: sysStats?.uptime,      color: '#13c2c2' },
                  { label: 'Environment', value: sysStats?.environment, color: '#8c8c8c' },
                  { label: 'App Version', value: sysStats?.version,     color: '#eb2f96' },
                  { label: 'Build',       value: sysStats?.build,       color: '#ff4d4f' },
                ].map((item) => (
                  <Col key={item.label} xs={12} sm={8} md={6} lg={3}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{item.label}</Text>
                    <Text strong style={{ fontSize: 12, color: item.color }}>{item.value ?? '—'}</Text>
                  </Col>
                ))}
              </Row>
            </Spin>
          </Card>
        </Col>

        {/* General */}
        <Col xs={24} lg={12}>
          <Card
            title="General"
            size="small"
            style={{ borderRadius: 12 }}
            extra={<Button size="small" type="primary" icon={<SaveOutlined />} onClick={saveGeneral}>Save</Button>}
          >
            <Form
              form={generalForm}
              layout="vertical"
              size="small"
              initialValues={{
                orgName:    saved.orgName    ?? DEFAULTS.orgName,
                currency:   saved.currency   ?? DEFAULTS.currency,
                dateFormat: saved.dateFormat ?? DEFAULTS.dateFormat,
                language:   saved.language   ?? DEFAULTS.language,
                timezone:   saved.timezone   ?? DEFAULTS.timezone,
              }}
            >
              <Form.Item name="orgName" label="Organisation Name" rules={[{ required: true }]}>
                <Input placeholder="Organisation name" />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="currency" label="Default Currency">
                    <Select options={[
                      { value: 'BDT', label: 'BDT — Bangladeshi Taka' },
                      { value: 'USD', label: 'USD — US Dollar' },
                      { value: 'EUR', label: 'EUR — Euro' },
                    ]} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="dateFormat" label="Date Format">
                    <Select options={[
                      { value: 'DD MMM YYYY', label: 'DD MMM YYYY' },
                      { value: 'YYYY-MM-DD',  label: 'YYYY-MM-DD' },
                      { value: 'MM/DD/YYYY',  label: 'MM/DD/YYYY' },
                    ]} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="language" label="Language">
                    <Select options={[
                      { value: 'en', label: 'English' },
                      { value: 'bn', label: 'Bengali' },
                    ]} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="timezone" label="Timezone">
                    <Select options={[
                      { value: 'Asia/Dhaka',   label: 'Asia/Dhaka (UTC+6)' },
                      { value: 'Asia/Kolkata', label: 'Asia/Kolkata (UTC+5:30)' },
                      { value: 'UTC',          label: 'UTC' },
                    ]} />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>

        {/* Appearance */}
        <Col xs={24} lg={12}>
          <Card
            title="Appearance"
            size="small"
            style={{ borderRadius: 12 }}
            extra={<Button size="small" type="primary" icon={<SaveOutlined />} onClick={saveAppearance}>Save</Button>}
          >
            {[
              { label: 'Dark Mode',                    desc: 'Use dark theme across the app',              checked: isDark,          onChange: toggleTheme },
              { label: 'Compact Tables',               desc: 'Show more rows with reduced padding',        checked: compactTables,   onChange: (v) => setCompactTables(v) },
              { label: 'Sidebar Collapsed by Default', desc: 'Start with a compact sidebar on load',      checked: sidebarCollapsed, onChange: setSidebarCollapsed },
            ].map((item, i, arr) => (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                  <div>
                    <Text strong>{item.label}</Text>
                    <div><Text type="secondary" style={{ fontSize: 12 }}>{item.desc}</Text></div>
                  </div>
                  <Switch checked={item.checked} onChange={item.onChange} />
                </div>
                {i < arr.length - 1 && <Divider style={{ margin: '4px 0' }} />}
              </div>
            ))}
          </Card>
        </Col>

        {/* In-app Notification Toggles */}
        <Col xs={24} lg={12}>
          <Card
            title="In-App Notifications"
            size="small"
            style={{ borderRadius: 12 }}
            extra={<Button size="small" type="primary" icon={<SaveOutlined />} onClick={saveNotifications}>Save</Button>}
          >
            {[
              { key: 'maintenance', label: 'Maintenance Due Alerts',  desc: 'Notify when a vehicle service is overdue' },
              { key: 'dispatch',    label: 'Dispatch Status Updates', desc: 'Email on dispatch status changes' },
              { key: 'fuel',        label: 'Fuel Threshold Warnings', desc: 'Alert when fuel expense exceeds budget' },
              { key: 'leave',       label: 'Leave Approval Requests', desc: 'Notify managers on pending leaves' },
            ].map((n, i, arr) => (
              <div key={n.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                  <div>
                    <Text strong>{n.label}</Text>
                    <div><Text type="secondary" style={{ fontSize: 12 }}>{n.desc}</Text></div>
                  </div>
                  <Switch checked={notifs[n.key]} onChange={(v) => setNotifs((p) => ({ ...p, [n.key]: v }))} />
                </div>
                {i < arr.length - 1 && <Divider style={{ margin: '4px 0' }} />}
              </div>
            ))}
          </Card>
        </Col>

        {/* Security */}
        <Col xs={24} lg={12}>
          <Card
            title="Security"
            size="small"
            style={{ borderRadius: 12 }}
            extra={<Tag color="blue">Local Account</Tag>}
          >
            <Form form={pwdForm} layout="vertical" size="small">
              <Form.Item name="current" label="Current Password" rules={[{ required: true, message: 'Enter current password' }]}>
                <Input.Password prefix={<LockOutlined />} placeholder="Current password" />
              </Form.Item>
              <Form.Item name="newPwd" label="New Password" rules={[{ required: true, min: 6, message: 'Minimum 6 characters' }]}>
                <Input.Password prefix={<LockOutlined />} placeholder="New password" />
              </Form.Item>
              <Form.Item
                name="confirm"
                label="Confirm Password"
                dependencies={['newPwd']}
                rules={[
                  { required: true },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPwd') === value) return Promise.resolve();
                      return Promise.reject(new Error('Passwords do not match'));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Confirm new password" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" icon={<SaveOutlined />} onClick={handlePasswordChange}>
                  Update Password
                </Button>
              </Form.Item>
            </Form>
            <Divider style={{ margin: '12px 0' }} />
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Session</Text>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <Tag color="green">Active Session</Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>Last login: Today, 09:12 AM</Text>
              </div>
            </div>
          </Card>
        </Col>

        {/* Notification Providers */}
        <Col xs={24}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SendOutlined style={{ color: '#722ed1' }} />
                <span>Notification Providers</span>
                <Tag color="purple" style={{ fontSize: 10 }}>Server-side</Tag>
              </div>
            }
            size="small"
            style={{ borderRadius: 12 }}
          >
            <Alert
              type="warning"
              showIcon
              style={{ borderRadius: 8, marginBottom: 16 }}
              message={
                <Text style={{ fontSize: 11 }}>
                  These settings are stored in the database and used by the backend to send notifications.
                  Enable a channel and fill in the credentials, then click <b>Save</b> before using <b>Send Test</b>.
                </Text>
              }
            />
            <Tabs items={providerTabs} type="card" size="small" />
          </Card>
        </Col>

        {/* Map Integration */}
        <Col xs={24}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <GlobalOutlined style={{ color: '#4285F4' }} />
                <span>Map Integration</span>
              </div>
            }
            size="small"
            style={{ borderRadius: 12 }}
            extra={<Button size="small" type="primary" icon={<SaveOutlined />} onClick={saveMapSettings}>Save</Button>}
          >
            <Row gutter={[24, 0]}>
              <Col xs={24} lg={14}>
                <Form
                  form={mapForm}
                  layout="vertical"
                  size="small"
                  initialValues={{
                    googleMapsKey: saved.googleMapsKey  ?? '',
                    mapProvider:   saved.mapProvider    ?? 'openstreetmap',
                    defaultLat:    saved.defaultLat     ?? '23.8',
                    defaultLng:    saved.defaultLng     ?? '90.4',
                    defaultZoom:   saved.defaultZoom    ?? '7',
                  }}
                >
                  <Form.Item name="mapProvider" label="Map Provider">
                    <Select options={[
                      { value: 'openstreetmap', label: 'OpenStreetMap (free, no key needed)' },
                      { value: 'google',        label: 'Google Maps (requires API key)' },
                    ]} />
                  </Form.Item>

                  <Form.Item
                    name="googleMapsKey"
                    label={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>Google Maps API Key</span>
                        {googleKeySaved && (
                          <Tag icon={<CheckCircleOutlined />} color="success" style={{ margin: 0, fontSize: 11 }}>Saved</Tag>
                        )}
                      </div>
                    }
                    extra={
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Enables Google Maps tiles on the VTS Map page. Leave blank to keep using OpenStreetMap.
                      </Text>
                    }
                  >
                    <Input.Password
                      placeholder="AIzaSy…"
                      iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                      visibilityToggle={{ visible: googleKeyVisible, onVisibleChange: setGoogleKeyVisible }}
                      addonBefore={<GlobalOutlined style={{ color: '#4285F4' }} />}
                    />
                  </Form.Item>

                  <Row gutter={12}>
                    <Col span={8}>
                      <Form.Item name="defaultLat" label="Default Latitude">
                        <Input placeholder="23.8" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="defaultLng" label="Default Longitude">
                        <Input placeholder="90.4" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="defaultZoom" label="Default Zoom">
                        <Select options={[5,6,7,8,9,10,11,12].map((z) => ({ value: String(z), label: `Zoom ${z}` }))} />
                      </Form.Item>
                    </Col>
                  </Row>

                  {googleKeySaved && (
                    <Form.Item>
                      <Button size="small" danger icon={<WarningOutlined />} onClick={clearGoogleKey}>
                        Remove API Key
                      </Button>
                    </Form.Item>
                  )}
                </Form>
              </Col>

              <Col xs={24} lg={10}>
                <div style={{
                  background: 'linear-gradient(135deg, #4285F408 0%, #34A85308 100%)',
                  border: '1px solid #4285F425',
                  borderRadius: 10,
                  padding: 16,
                  height: '100%',
                }}>
                  <Text strong style={{ display: 'block', marginBottom: 10, color: '#4285F4' }}>
                    How to get a Google Maps API Key
                  </Text>
                  {[
                    'Go to console.cloud.google.com',
                    'Create a new project (or select existing)',
                    'Enable "Maps JavaScript API"',
                    'Go to Credentials → Create API Key',
                    'Restrict the key to your domain',
                    'Paste the key in the field on the left',
                  ].map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', background: '#4285F4',
                        color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {i + 1}
                      </div>
                      <Text style={{ fontSize: 12 }}>{step}</Text>
                    </div>
                  ))}
                  <Divider style={{ margin: '12px 0' }} />
                  <Alert
                    type="info"
                    showIcon
                    message={<Text style={{ fontSize: 11 }}>The VTS Map currently uses <b>OpenStreetMap</b> (free). Adding a Google Maps key will switch to Google tiles.</Text>}
                    style={{ borderRadius: 8 }}
                  />
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
