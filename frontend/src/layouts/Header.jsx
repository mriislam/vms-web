import {
  BellOutlined,
  LogoutOutlined,
  MoonOutlined,
  NotificationOutlined,
  SearchOutlined,
  SunOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Badge, Button, Dropdown, Grid, Input, Layout, Space, Tooltip, Typography } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLogout } from '../hooks/useAuth';
import { noticeService } from '../services/noticeService';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';

const { Header } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const PAGE_TITLES = {
  '/dashboard':    'Dashboard',
  '/vehicles':     'Vehicles',
  '/drivers':      'Drivers',
  '/requisitions': 'Requisitions',
  '/vehicle-requisition': 'Vehicle Requisition',
  '/accidents':           'Accident / Occurrence',
  '/routes':       'Routes',
  '/fuel':         'Fuel Records',
  '/maintenance':  'Maintenance',
  '/inventory':    'Inventory',
  '/expenses':     'Expenses',
  '/vendors':      'Vendors',
  '/driver-leave': 'Driver Leave',
  '/coordinators': 'Coordinators',
  '/parking':      'Parking',
  '/notices':      'Notices',
  '/reports':      'Reports',
  '/vts-map':      'VTS Map',
  '/insights':     'Insights',
  '/user-admin':        'User Admin',
  '/role-permissions':  'Role Permissions',
  '/audit-log':         'Audit Log',
  '/settings':          'Settings',
};

const roleColor = { admin: '#ff4d4f', manager: '#fa8c16', operator: '#1677ff', viewer: '#8c8c8c' };

export default function AppHeader() {
  const isDark = useUIStore((s) => s.isDark);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const user = useAuthStore((s) => s.user);
  const { mutate: logout } = useLogout();
  const location = useLocation();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'VMS';
  const role = user?.role ?? 'operator';

  const { data: notices = [] } = useQuery({
    queryKey: ['notices'],
    queryFn: () => noticeService.getAll().then((r) => r.data.data ?? []),
    refetchInterval: 60000,
  });
  const unreadCount = notices.filter((n) => !n.readByMe).length;

  const userMenu = {
    items: [
      { key: 'info', label: (
          <div style={{ padding: '2px 0' }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{user?.name ?? user?.username}</div>
            <div>
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 10,
                background: roleColor[role] + '22', color: roleColor[role], fontWeight: 600,
              }}>
                {role.toUpperCase()}
              </span>
            </div>
          </div>
        ), disabled: true,
      },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Sign Out', danger: true, onClick: () => logout() },
    ],
  };

  const isMobile = !screens.sm;

  return (
    <Header style={{
      position: 'sticky', top: 0, zIndex: 99,
      padding: isMobile ? '0 10px' : '0 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: isDark ? '#0d1117' : '#ffffff',
      borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)',
      height: 48,
      lineHeight: '48px',
    }}>
      {/* Left — page title */}
      <Text style={{ fontSize: 14, fontWeight: 700, color: isDark ? '#fff' : '#1a1a1a' }}>{pageTitle}</Text>

      {/* Right */}
      <Space size={4}>
        {screens.sm && (
          <Input
            placeholder="Search..."
            prefix={<SearchOutlined style={{ color: '#8c9ab0' }} />}
            style={{
              width: 160,
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)',
              borderRadius: 7,
              fontSize: 12,
            }}
            size="small"
          />
        )}

        {/* Theme toggle pill */}
        <div onClick={toggleTheme} title={isDark ? 'Switch to Light' : 'Switch to Dark'}
          style={{
            display: 'flex', alignItems: 'center',
            width: 48, height: 24, borderRadius: 12, padding: '0 2px',
            cursor: 'pointer', position: 'relative',
            background: isDark ? 'linear-gradient(135deg, #1a2236, #2a3a5e)' : 'linear-gradient(135deg, #ffe066, #ffaa00)',
            border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.1)',
            boxShadow: isDark ? '0 0 8px rgba(99,140,255,0.3)' : '0 0 8px rgba(255,170,0,0.4)',
            transition: 'all 0.3s ease', flexShrink: 0,
          }}>
          <SunOutlined  style={{ position:'absolute', left: 5,  fontSize: 10, color: isDark ? 'rgba(255,255,255,0.25)' : '#fff' }} />
          <MoonOutlined style={{ position:'absolute', right: 5, fontSize: 10, color: isDark ? '#aac4ff' : 'rgba(0,0,0,0.2)' }} />
          <div style={{
            width: 18, height: 18, borderRadius: '50%',
            background: isDark ? '#1677ff' : '#fff',
            boxShadow: isDark ? '0 2px 6px rgba(22,119,255,0.6)' : '0 2px 6px rgba(0,0,0,0.2)',
            transform: isDark ? 'translateX(24px)' : 'translateX(0)',
            transition: 'transform 0.3s ease, background 0.3s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
          }}>
            {isDark ? <MoonOutlined style={{ fontSize: 9, color: '#fff' }} /> : <SunOutlined style={{ fontSize: 10, color: '#fa8c16' }} />}
          </div>
        </div>

        <Tooltip title="Notices">
          <Badge count={unreadCount} size="small" offset={[-2, 2]}>
            <Button type="text" size="small" icon={<NotificationOutlined />}
              style={{ borderRadius: 7 }} onClick={() => navigate('/notices')} />
          </Badge>
        </Tooltip>

        <Badge count={3} size="small" offset={[-2, 2]}>
          <Button type="text" size="small" icon={<BellOutlined />} style={{ borderRadius: 7 }} />
        </Badge>

        <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
          <Space size={6} style={{ cursor: 'pointer', padding: '3px 6px', borderRadius: 7, transition: 'background 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <Avatar size={24} icon={<UserOutlined />}
              style={{ background: `linear-gradient(135deg, ${roleColor[role]}, ${roleColor[role]}99)` }} />
            {screens.sm && (
              <div style={{ lineHeight: 1.25 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#fff' : '#1a1a1a' }}>
                  {user?.name ?? user?.username ?? 'User'}
                </div>
                <div style={{ fontSize: 10, color: roleColor[role], fontWeight: 600 }}>
                  {role.toUpperCase()}
                </div>
              </div>
            )}
          </Space>
        </Dropdown>
      </Space>
    </Header>
  );
}
