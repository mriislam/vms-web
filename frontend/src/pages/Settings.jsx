import { CheckCircleOutlined, CloudServerOutlined, EyeInvisibleOutlined, EyeTwoTone, GlobalOutlined, LockOutlined, ReloadOutlined, SaveOutlined, SettingOutlined, WarningOutlined } from '@ant-design/icons';
import {
  Alert, Button, Card, Col, Divider, Form, Input, Progress, Row, Select, Spin, Switch, Tag, Typography, message,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '../services/apiClient';
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
  const isDark             = useUIStore((s) => s.isDark);
  const toggleTheme        = useUIStore((s) => s.toggleTheme);
  const sidebarCollapsed   = useUIStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);

  const saved = loadSettings();
  const [generalForm] = Form.useForm();
  const [pwdForm]     = Form.useForm();

  const [notifs, setNotifs] = useState({
    maintenance: saved.notifMaintenance ?? DEFAULTS.notifMaintenance,
    dispatch:    saved.notifDispatch    ?? DEFAULTS.notifDispatch,
    fuel:        saved.notifFuel        ?? DEFAULTS.notifFuel,
    leave:       saved.notifLeave       ?? DEFAULTS.notifLeave,
  });

  const [compactTables, setCompactTables] = useState(saved.compactTables ?? false);
  const [version] = useState('v1.0.0');

  const [mapForm] = Form.useForm();
  const [googleKeyVisible, setGoogleKeyVisible] = useState(false);
  const [googleKeySaved, setGoogleKeySaved] = useState(!!saved.googleMapsKey);

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

  /* ── System Utilization (real data from backend) ─────────────── */
  const [sysStats, setSysStats]       = useState(null);
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

  const cpuPct    = sysStats?.cpu ?? 0;
  const ramPct    = sysStats?.ramPct ?? 0;
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

  function handleNotifChange(key, val) {
    setNotifs((prev) => ({ ...prev, [key]: val }));
  }

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
                {/* CPU */}
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
                {/* RAM */}
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
                {/* Disk */}
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
                {/* JVM Heap */}
                <Col xs={24} sm={12} lg={6}>
                  <div style={{ padding: '8px 0' }}>
                    <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>Server Uptime</Text>
                    <Text style={{ fontSize: 22, fontWeight: 800, color: '#13c2c2', lineHeight: 1 }}>{sysStats?.uptime ?? '—'}</Text>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>since last restart</Text>
                  </div>
                </Col>
              </Row>

              <Divider style={{ margin: '12px 0' }} />

              {/* Server Info */}
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
                      { value: 'Asia/Dhaka',    label: 'Asia/Dhaka (UTC+6)' },
                      { value: 'Asia/Kolkata',  label: 'Asia/Kolkata (UTC+5:30)' },
                      { value: 'UTC',           label: 'UTC' },
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
              {
                label: 'Dark Mode',
                desc: 'Use dark theme across the app',
                checked: isDark,
                onChange: toggleTheme,
              },
              {
                label: 'Compact Tables',
                desc: 'Show more rows with reduced padding',
                checked: compactTables,
                onChange: (v) => setCompactTables(v),
              },
              {
                label: 'Sidebar Collapsed by Default',
                desc: 'Start with a compact sidebar on load',
                checked: sidebarCollapsed,
                onChange: setSidebarCollapsed,
              },
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

        {/* Notifications */}
        <Col xs={24} lg={12}>
          <Card
            title="Notifications"
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
                  <Switch checked={notifs[n.key]} onChange={(v) => handleNotifChange(n.key, v)} />
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
                    googleMapsKey:  saved.googleMapsKey  ?? '',
                    mapProvider:    saved.mapProvider    ?? 'openstreetmap',
                    defaultLat:     saved.defaultLat     ?? '23.8',
                    defaultLng:     saved.defaultLng     ?? '90.4',
                    defaultZoom:    saved.defaultZoom    ?? '7',
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
