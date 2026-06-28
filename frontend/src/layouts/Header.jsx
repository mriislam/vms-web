import {
  BellOutlined,
  EditOutlined,
  LockOutlined,
  LogoutOutlined,
  MoonOutlined,
  NotificationOutlined,
  QrcodeOutlined,
  SaveOutlined,
  SearchOutlined,
  SunOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Badge, Button, Dropdown, Form, Grid, Input, Layout, Modal, Select, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { useLogout } from '../hooks/useAuth';
import { noticeService } from '../services/noticeService';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';

const { Header } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const PAGE_META = {
  '/dashboard':           { title: 'NEXVMS Dashboard',       color: '#6366f1' },
  '/vehicles':            { title: 'Vehicles',               color: '#10b981' },
  '/drivers':             { title: 'Drivers',                color: '#06b6d4' },
  '/accidents':           { title: 'Accident / Occurrence',  color: '#f43f5e' },
  '/routes':              { title: 'Routes',                 color: '#8b5cf6' },
  '/fuel':                { title: 'Fuel Records',           color: '#f43f5e' },
  '/maintenance':         { title: 'Maintenance',            color: '#f97316' },
  '/pm-maintenance':      { title: 'PM Maintenance',         color: '#f59e0b' },
  '/maintenance-approval':{ title: 'Maintenance Approver',   color: '#10b981' },
  '/inventory':           { title: 'Inventory',              color: '#06b6d4' },
  '/expenses':            { title: 'Expenses',               color: '#06b6d4' },
  '/vendors':             { title: 'Suppliers',              color: '#8b5cf6' },
  '/driver-leave':        { title: 'Driver Leave',           color: '#ec4899' },
  '/coordinators':        { title: 'Coordinators',           color: '#10b981' },
  '/parking':             { title: 'Parking',                color: '#6366f1' },
  '/notices':             { title: 'Notices',                color: '#f59e0b' },
  '/reports':             { title: 'Reports',                color: '#6366f1' },
  '/vts-map':             { title: 'VTS Map',                color: '#ec4899' },
  '/insights':            { title: 'Insights',               color: '#ec4899' },
  '/user-admin':          { title: 'User Admin',             color: '#f43f5e' },
  '/role-permissions':    { title: 'Role Permissions',       color: '#f97316' },
  '/audit-log':           { title: 'Audit Log',              color: '#8b5cf6' },
  '/settings':            { title: 'App Settings',           color: '#94a3b8' },
  '/employees':           { title: 'Employees',              color: '#8b5cf6' },
  '/driver/trips':        { title: 'Driver Portal',          color: '#06b6d4' },
  '/booking/single':      { title: 'Single Booking',         color: '#6366f1' },
  '/booking/multiple':    { title: 'Multiple Booking',       color: '#8b5cf6' },
  '/booking/manage-trip': { title: 'Manage Trip',            color: '#06b6d4' },
  '/booking/log':         { title: 'Booking Log',            color: '#f97316' },
  '/booking/approval':    { title: 'Approval Authority',     color: '#f43f5e' },
  '/booking/tpt':         { title: 'TPT Control',            color: '#06b6d4' },
};

const ROLE_GRADIENT = {
  admin:    'linear-gradient(135deg,#f43f5e,#f97316)',
  manager:  'linear-gradient(135deg,#f59e0b,#f97316)',
  operator: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
  viewer:   'linear-gradient(135deg,#64748b,#94a3b8)',
};
const ROLE_COLOR = {
  admin: '#f43f5e', manager: '#f59e0b', operator: '#6366f1', viewer: '#64748b',
};

// ── Live clock ────────────────────────────────────────────────────────────────
function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// ── Backend health check — public /api/health endpoint, no auth, no console noise ──
function useBackendHealth() {
  const { isSuccess, isError } = useQuery({
    queryKey: ['backend-health'],
    queryFn: () =>
      fetch('/api/health', { signal: AbortSignal.timeout(4000) })
        .then((r) => { if (!r.ok) throw new Error('down'); return r.json(); }),
    refetchInterval: 20000,
    retry: 0,
    staleTime: 10000,
    throwOnError: false,
  });
  if (isSuccess) return 'online';
  if (isError)   return 'offline';
  return 'checking';
}

// ── Status dot ─────────────────────────────────────────────────────────────────
function StatusDot({ status }) {
  const color =
    status === 'online'   ? '#10b981' :
    status === 'offline'  ? '#f43f5e' :
    '#f59e0b';
  const label =
    status === 'online'   ? 'Backend live' :
    status === 'offline'  ? 'Backend unreachable' :
    'Checking…';

  return (
    <span title={label} style={{ display: 'inline-flex', alignItems: 'center' }}>
      <span style={{
        width: 9, height: 9, borderRadius: '50%',
        background: color,
        boxShadow: status === 'online'
          ? `0 0 0 0 ${color}, 0 0 8px ${color}`
          : `0 0 8px ${color}`,
        display: 'inline-block', flexShrink: 0,
        animation: status === 'online' ? 'statusPulse 2s ease-in-out infinite' : 'none',
      }} />
    </span>
  );
}

export default function AppHeader() {
  const isDark      = useUIStore((s) => s.isDark);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const user        = useAuthStore((s) => s.user);
  const { mutate: logout } = useLogout();
  const location  = useLocation();
  const navigate  = useNavigate();
  const screens   = useBreakpoint();
  const now       = useClock();
  const backendStatus = useBackendHealth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdForm] = Form.useForm();
  const [pwdSaving, setPwdSaving] = useState(false);
  // 2FA self-service state
  const [mfaSetup, setMfaSetup]     = useState(null); // { secret, otpUri }
  const [mfaCode, setMfaCode]       = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(null); // null = unknown until fetched

  const meta = PAGE_META[location.pathname] ?? { title: 'VMS', color: '#6366f1' };
  const role = user?.role ?? 'operator';

  const { data: notices = [] } = useQuery({
    queryKey: ['notices'],
    queryFn: () => noticeService.getAll().then((r) => r.data.data ?? []),
    refetchInterval: 60000,
  });
  const unreadCount = notices.filter((n) => !n.readByMe).length;

  // One-line combined date + time
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  const userMenu = {
    items: [
      {
        key: 'info', disabled: true,
        label: (
          <div style={{ padding: '4px 0' }}>
            <div style={{ fontWeight: 800, fontSize: 13 }}>{user?.name ?? user?.username}</div>
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 10, marginTop: 4, display: 'inline-block',
              background: ROLE_COLOR[role] + '22', color: ROLE_COLOR[role], fontWeight: 700,
            }}>
              {role.toUpperCase()}
            </span>
          </div>
        ),
      },
      { type: 'divider' },
      { key: 'profile', icon: <EditOutlined />, label: 'Edit Profile',
        onClick: async () => {
          profileForm.setFieldsValue({ fullName: user?.name, email: user?.email, phone: user?.phone, department: user?.department });
          // Check 2FA status for current user
          try { const r = await apiClient.get(`/users`); const me = (r.data?.data??[]).find(u=>u.username===user?.username); setMfaEnabled(!!me?.mfaEnabled); } catch { setMfaEnabled(false); }
          setMfaSetup(null); setMfaCode('');
          setProfileOpen(true);
        } },
      { key: 'password', icon: <LockOutlined />, label: 'Change Password',
        onClick: () => { pwdForm.resetFields(); setPwdOpen(true); } },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Sign Out', danger: true, onClick: () => logout() },
    ],
  };

  const isMobile    = !screens.sm;
  const headerBg    = isDark ? 'rgba(7,12,20,0.9)' : 'rgba(248,250,255,0.9)';
  const borderColor = isDark ? 'rgba(99,102,241,0.14)' : 'rgba(99,102,241,0.12)';
  const textColor   = isDark ? '#e2e8f0' : '#1e293b';
  const subColor    = isDark ? '#94a3b8' : '#64748b';

  return (
    <>
      {/* Pulse animation for online status dot */}
      <style>{`
        @keyframes statusPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.6), 0 0 8px #10b981; }
          50%      { box-shadow: 0 0 0 5px rgba(16,185,129,0),  0 0 8px #10b981; }
        }
      `}</style>

      <Header
        className="vms-header"
        style={{
          position: 'sticky', top: 0, zIndex: 99,
          padding: isMobile ? '0 10px' : '0 16px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          background: headerBg,
          borderBottom: `1px solid ${borderColor}`,
          boxShadow: isDark
            ? '0 4px 20px rgba(0,0,0,0.3)'
            : '0 4px 20px rgba(99,102,241,0.06)',
          height: 52,
          lineHeight: '52px',
          gap: 8,
          overflow: 'hidden',
        }}
      >
        {/* ── Left: status dot + page title ─────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: '0 1 auto' }}>
          <StatusDot status={backendStatus} />
          <Text style={{
            fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em',
            color: textColor, whiteSpace: 'nowrap',
          }}>
            {meta.title}
          </Text>
        </div>

        {/* ── Center: time · date on ONE line ────────────────────────────── */}
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 6,
          whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          <span style={{
            fontSize: 13, fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
            background: isDark
              ? 'linear-gradient(135deg,#a5b4fc,#67e8f9)'
              : 'linear-gradient(135deg,#6366f1,#06b6d4)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            {timeStr}
          </span>
          <span style={{ fontSize: 12, color: subColor, fontWeight: 400 }}>·</span>
          <span style={{ fontSize: 12, color: subColor, fontWeight: 500 }}>
            {dateStr}
          </span>
        </div>

        {/* ── Right: actions ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: '0 0 auto' }}>
          {screens.lg && (
            <Input
              placeholder="Search..."
              prefix={<SearchOutlined style={{ color: 'rgba(99,102,241,0.5)' }} />}
              style={{
                width: 140,
                background: isDark ? 'rgba(99,102,241,0.07)' : 'rgba(99,102,241,0.05)',
                border: `1px solid ${isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.15)'}`,
                borderRadius: 10, fontSize: 12,
              }}
              size="small"
            />
          )}

          {/* Theme: Moon icon in light mode (click → dark), Sun in dark mode (click → light) */}
          <Button
            type="text"
            size="small"
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            icon={isDark
              ? <SunOutlined  style={{ fontSize: 15, color: '#f59e0b' }} />
              : <MoonOutlined style={{ fontSize: 15, color: '#6366f1' }} />
            }
            style={{
              borderRadius: 8, width: 32, height: 32,
              background: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.08)',
              border: isDark ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(99,102,241,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          />

          <Badge count={unreadCount} size="small" color="#6366f1" offset={[-2, 2]}>
            <Button
              type="text" size="small"
              icon={<NotificationOutlined style={{ fontSize: 15 }} />}
              style={{ borderRadius: 8, color: subColor, width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => navigate('/notices')}
            />
          </Badge>

          <Badge count={3} size="small" color="#f43f5e" offset={[-2, 2]}>
            <Button
              type="text" size="small"
              icon={<BellOutlined style={{ fontSize: 15 }} />}
              style={{ borderRadius: 8, color: subColor, width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            />
          </Badge>

          <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              cursor: 'pointer', padding: '4px 8px', borderRadius: 10,
              transition: 'background 0.2s',
              border: isDark ? '1px solid rgba(99,102,241,0.14)' : '1px solid rgba(99,102,241,0.12)',
              background: isDark ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.04)',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? 'rgba(99,102,241,0.14)' : 'rgba(99,102,241,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = isDark ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.04)'; }}
            >
              <Avatar size={26} icon={<UserOutlined />}
                style={{ background: ROLE_GRADIENT[role] ?? ROLE_GRADIENT.operator, flexShrink: 0 }} />
              {screens.md && (
                <div style={{ lineHeight: 1.3 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: textColor, whiteSpace: 'nowrap' }}>
                    {user?.name ?? user?.username ?? 'User'}
                  </div>
                  <div style={{ fontSize: 10, color: ROLE_COLOR[role], fontWeight: 700, letterSpacing: '0.04em' }}>
                    {role.toUpperCase()}
                  </div>
                </div>
              )}
            </div>
          </Dropdown>
        </div>
      </Header>

      {/* ── Edit Profile Modal ───────────────────────────────────────────── */}
      <Modal open={profileOpen} onCancel={() => setProfileOpen(false)} footer={null}
        title={<><EditOutlined style={{ color:'#6366f1', marginRight:8 }}/>Edit My Profile</>}
        width={480} destroyOnClose>
        <Form form={profileForm} layout="vertical" style={{ marginTop:16 }}
          onFinish={async (vals) => {
            setSaving(true);
            try {
              await apiClient.put(`/users/${user?.username}`, vals);
              setProfileOpen(false);
              window.location.reload(); // refresh to pick up new name
            } catch { } finally { setSaving(false); }
          }}>
          <Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}>
            <Input prefix={<UserOutlined />} placeholder="Full name" size="large" style={{ borderRadius:10 }} />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="Email address" size="large" style={{ borderRadius:10 }} />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input placeholder="Phone number" size="large" style={{ borderRadius:10 }} />
          </Form.Item>
          <Form.Item name="department" label="Department">
            <Select size="large" style={{ borderRadius:10 }} placeholder="Select department"
              options={['IT','Operations','Finance','HR','Admin','Logistics','Procurement','Fleet Management']
                .map(d => ({ value:d, label:d }))} />
          </Form.Item>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:8 }}>
            <Button onClick={() => setProfileOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}
              style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:10, fontWeight:700 }}>
              Save Changes
            </Button>
          </div>
        </Form>

        {/* ── 2FA self-service ───────────────────────────────────────── */}
        <div style={{ borderTop:'1px solid #f1f5f9', marginTop:20, paddingTop:20 }}>
          <div style={{ fontWeight:800, fontSize:13, color:'#6366f1', marginBottom:12,
            display:'flex', alignItems:'center', gap:6 }}>
            🔐 Two-Factor Authentication
          </div>

          {mfaEnabled === true && !mfaSetup && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'12px 14px', background:'rgba(16,185,129,0.06)',
              border:'1.5px solid rgba(16,185,129,0.25)', borderRadius:10 }}>
              <div>
                <div style={{ fontWeight:700, color:'#059669' }}>✓ 2FA is Active</div>
                <div style={{ fontSize:12, color:'#64748b' }}>Your account is protected by Google Authenticator</div>
              </div>
              <Button danger size="small" loading={mfaLoading} style={{ borderRadius:8, fontWeight:700 }}
                onClick={async () => {
                  const code = window.prompt('Enter your 6-digit Authenticator code to disable 2FA:');
                  if (!code || code.length !== 6) return;
                  setMfaLoading(true);
                  try { await apiClient.post('/auth/disable-mfa', { code }); setMfaEnabled(false); window.location.reload(); }
                  catch (e) { alert(e?.response?.data?.message ?? 'Invalid code'); }
                  finally { setMfaLoading(false); }
                }}>Disable 2FA</Button>
            </div>
          )}

          {mfaEnabled === false && !mfaSetup && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'12px 14px', background:'#f8faff',
              border:'1.5px dashed #e2e8f0', borderRadius:10 }}>
              <div>
                <div style={{ fontWeight:700, color:'#64748b' }}>2FA is Disabled</div>
                <div style={{ fontSize:12, color:'#94a3b8' }}>Add Google Authenticator for extra login security</div>
              </div>
              <Button type="primary" size="small" loading={mfaLoading} icon={<QrcodeOutlined />}
                style={{ borderRadius:8, fontWeight:700, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none' }}
                onClick={async () => {
                  setMfaLoading(true);
                  try { const r = await apiClient.get('/auth/setup-mfa'); setMfaSetup(r.data?.data); setMfaCode(''); }
                  catch { alert('Failed to start 2FA setup'); }
                  finally { setMfaLoading(false); }
                }}>Enable 2FA</Button>
            </div>
          )}

          {mfaSetup && (
            <div style={{ background:'#fafbff', border:'1px solid rgba(99,102,241,0.2)', borderRadius:12, padding:16 }}>
              <div style={{ textAlign:'center', marginBottom:12 }}>
                <div style={{ fontWeight:700, color:'#1e293b', marginBottom:4 }}>
                  📱 Scan with Google Authenticator
                </div>
                <div style={{ fontSize:12, color:'#64748b', marginBottom:10 }}>
                  Manual key: <code style={{ background:'#f1f5f9', padding:'2px 8px', borderRadius:6, color:'#6366f1', fontWeight:700 }}>{mfaSetup.secret}</code>
                </div>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(mfaSetup.otpUri)}`}
                  alt="QR" style={{ borderRadius:12, border:'3px solid #6366f1' }} width={180} height={180} />
              </div>
              <div style={{ fontSize:12, color:'#64748b', marginBottom:8, fontWeight:600 }}>
                Enter the 6-digit code from the app to confirm:
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <Input placeholder="000000" maxLength={6} value={mfaCode}
                  onChange={e => setMfaCode(e.target.value.replace(/\D/g,''))}
                  style={{ textAlign:'center', fontSize:22, fontWeight:800, letterSpacing:6, borderRadius:10, border:'2px solid #6366f1', background:'#eef1ff', height:44 }} />
                <Button type="primary" loading={mfaLoading} disabled={mfaCode.length!==6}
                  style={{ borderRadius:10, fontWeight:700, height:44, background:'linear-gradient(135deg,#059669,#06b6d4)', border:'none' }}
                  onClick={async () => {
                    setMfaLoading(true);
                    try {
                      await apiClient.post('/auth/enable-mfa', { code: mfaCode });
                      setMfaEnabled(true); setMfaSetup(null); setMfaCode('');
                      alert('✓ 2FA enabled! Your account is now protected.');
                    } catch (e) { alert(e?.response?.data?.message ?? 'Invalid code'); setMfaCode(''); }
                    finally { setMfaLoading(false); }
                  }}>Verify & Enable</Button>
                <Button style={{ borderRadius:10, height:44 }} onClick={() => { setMfaSetup(null); setMfaCode(''); }}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ── Change Password Modal ────────────────────────────────────────── */}
      <Modal open={pwdOpen} onCancel={() => setPwdOpen(false)} footer={null}
        title={<><LockOutlined style={{ color:'#6366f1', marginRight:8 }}/>Change Password</>}
        width={420} destroyOnClose>
        <Form form={pwdForm} layout="vertical" style={{ marginTop:16 }}
          onFinish={async (vals) => {
            setPwdSaving(true);
            try {
              await apiClient.post(`/users/me/change-password`, { currentPassword: vals.current, newPassword: vals.newPwd });
              setPwdOpen(false);
            } catch (e) { } finally { setPwdSaving(false); }
          }}>
          <Form.Item name="current" label="Current Password" rules={[{ required: true }]}>
            <Input.Password placeholder="Current password" size="large" style={{ borderRadius:10 }} />
          </Form.Item>
          <Form.Item name="newPwd" label="New Password" rules={[{ required: true, min: 6 }]}>
            <Input.Password placeholder="New password (min 6 chars)" size="large" style={{ borderRadius:10 }} />
          </Form.Item>
          <Form.Item name="confirm" label="Confirm Password"
            dependencies={['newPwd']}
            rules={[{ required: true }, ({ getFieldValue }) => ({
              validator(_, v) {
                return !v || getFieldValue('newPwd') === v
                  ? Promise.resolve() : Promise.reject('Passwords do not match');
              }
            })]}>
            <Input.Password placeholder="Confirm new password" size="large" style={{ borderRadius:10 }} />
          </Form.Item>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <Button onClick={() => setPwdOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={pwdSaving} icon={<LockOutlined />}
              style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:10, fontWeight:700 }}>
              Update Password
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}
