import {
  AlertOutlined,
  AppstoreOutlined,
  AuditOutlined,
  CarOutlined,
  ControlOutlined,
  DashboardOutlined,
  EnvironmentOutlined,
  ExperimentOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  FundOutlined,
  GlobalOutlined,
  HomeOutlined,
  IdcardOutlined,
  LaptopOutlined,
  LeftOutlined,
  NotificationOutlined,
  PieChartOutlined,
  RightOutlined,
  SafetyOutlined,
  ScheduleOutlined,
  SettingOutlined,
  SyncOutlined,
  ShopOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  UnorderedListOutlined,
  UserOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { Layout, Menu, Tooltip } from 'antd';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUIStore } from '../stores/uiStore';

const { Sider } = Layout;

const chip = (icon, color, active = false) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 24, height: 24, borderRadius: 7, flexShrink: 0,
    background: active ? color + '33' : color + '18',
    color: active ? color : color + 'cc',
    fontSize: 13, lineHeight: 1,
    transition: 'all 0.2s',
  }}>
    {icon}
  </span>
);

const MENU_GROUPS = [
  {
    key: '/dashboard', color: '#1677ff', label: 'Dashboard',
    icon: <DashboardOutlined />,
  },
  {
    key: 'fleet', color: '#52c41a', label: 'Fleet Management',
    icon: <CarOutlined />,
    children: [
      { key: '/vehicles', icon: <CarOutlined />,    color: '#52c41a', label: 'Vehicles' },
      { key: '/drivers',  icon: <IdcardOutlined />, color: '#13c2c2', label: 'Drivers' },
    ],
  },
  {
    key: 'booking', color: '#0958d9', label: 'Vehicle Booking',
    icon: <ScheduleOutlined />,
    children: [
      { key: '/booking/single',      icon: <UserOutlined />,          color: '#0958d9', label: 'Single Booking' },
      { key: '/booking/multiple',    icon: <AppstoreOutlined />,      color: '#531dab', label: 'Multiple Booking' },
      { key: '/booking/manage-trip', icon: <ThunderboltOutlined />,   color: '#08979c', label: 'Manage Trip' },
      { key: '/booking/log',         icon: <UnorderedListOutlined />, color: '#d4380d', label: 'Vehicle Booking Log' },
      { key: '/booking/approval',    icon: <SafetyOutlined />,        color: '#cf1322', label: 'Approval Authority' },
      { key: '/booking/tpt',         icon: <ControlOutlined />,       color: '#096dd9', label: 'TPT Control Requisition' },
      { key: '/routes',              icon: <GlobalOutlined />,        color: '#722ed1', label: 'Routes' },
      { key: '/vts-map',             icon: <EnvironmentOutlined />,   color: '#eb2f96', label: 'VTS Map' },
      { key: '/accidents',           icon: <AlertOutlined />,         color: '#ff4d4f', label: 'Accident/Occurrence' },
    ],
  },
  {
    key: 'operations', color: '#fa541c', label: 'Operations',
    icon: <ToolOutlined />,
    children: [
      { key: '/fuel',           icon: <ExperimentOutlined />, color: '#ff4d4f', label: 'Fuel' },
      { key: '/maintenance',    icon: <ToolOutlined />,       color: '#fa541c', label: 'Maintenance' },
      { key: '/pm-maintenance',       icon: <SyncOutlined />,          color: '#d46b08', label: 'PM Maintenance' },
      { key: '/maintenance-approval', icon: <FileProtectOutlined />,   color: '#7cb305', label: 'Maintenance Approver' },
      { key: '/inventory',    icon: <LaptopOutlined />,     color: '#a0d911', label: 'Inventory' },
      { key: '/parking',      icon: <HomeOutlined />,       color: '#1890ff', label: 'Parking' },
    ],
  },
  {
    key: 'finance', color: '#13c2c2', label: 'Finance',
    icon: <WalletOutlined />,
    children: [
      { key: '/expenses', icon: <WalletOutlined />, color: '#13c2c2', label: 'Expenses' },
      { key: '/vendors',  icon: <ShopOutlined />,   color: '#722ed1', label: 'Suppliers' },
    ],
  },
  {
    key: 'people', color: '#9254de', label: 'People',
    icon: <TeamOutlined />,
    children: [
      { key: '/employees',     icon: <TeamOutlined />,         color: '#9254de', label: 'Employees' },
      { key: '/driver-leave',  icon: <UserOutlined />,         color: '#eb2f96', label: 'Driver Leave' },
      { key: '/coordinators',  icon: <TeamOutlined />,         color: '#52c41a', label: 'Coordinators' },
      { key: '/notices',       icon: <NotificationOutlined />, color: '#faad14', label: 'Notices' },
      { key: '/driver/trips',  icon: <CarOutlined />,          color: '#13c2c2', label: 'Driver Portal' },
    ],
  },
  {
    key: 'analytics', color: '#eb2f96', label: 'Analytics',
    icon: <PieChartOutlined />,
    children: [
      { key: '/reports',  icon: <FundOutlined />,     color: '#1677ff', label: 'Reports' },
      { key: '/insights', icon: <PieChartOutlined />, color: '#eb2f96', label: 'Insights' },
    ],
  },
  {
    key: 'system', color: '#ff4d4f', label: 'System',
    icon: <SettingOutlined />,
    children: [
      { key: '/audit-log', icon: <AuditOutlined />, color: '#722ed1', label: 'Audit Log' },
    ],
  },
  {
    key: 'settings', color: '#8c8c8c', label: 'Settings',
    icon: <SettingOutlined />,
    children: [
      { key: '/user-admin',       icon: <TeamOutlined />,    color: '#ff4d4f', label: 'User Admin' },
      { key: '/role-permissions', icon: <SafetyOutlined />,  color: '#fa8c16', label: 'Role Permissions' },
      { key: '/settings',         icon: <SettingOutlined />, color: '#8c8c8c', label: 'Application Settings' },
    ],
  },
];

function getGroupKey(pathname) {
  for (const g of MENU_GROUPS) {
    if (g.children?.some((c) => c.key === pathname)) return g.key;
  }
  return null;
}

function buildMenuItems(groups, activeKey, collapsed) {
  return groups.map((g) => {
    const isActive = g.children ? g.children.some((c) => c.key === activeKey) : g.key === activeKey;
    const item = {
      key: g.key,
      icon: chip(g.icon, g.color, isActive),
      label: collapsed ? null : (
        <span style={{ fontWeight: 600, fontSize: 12, letterSpacing: '0.03em', textTransform: 'uppercase', opacity: 0.85 }}>
          {g.label}
        </span>
      ),
    };
    if (g.children) {
      item.children = g.children.map((c) => ({
        key: c.key,
        icon: chip(c.icon, c.color, c.key === activeKey),
        label: c.label,
      }));
    }
    return item;
  });
}

const SIDEBAR_W = 220;
const SIDEBAR_COLLAPSED_W = 60;

export default function AppSidebar({ isMobile = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const isDark = useUIStore((s) => s.isDark);
  // On mobile, sidebar is always icon-only
  const effectiveCollapsed = collapsed || isMobile;

  const currentGroup = getGroupKey(location.pathname);
  const [openKeys, setOpenKeys] = useState(currentGroup ? [currentGroup] : []);

  const siderBg   = isDark ? '#0b0f1a' : '#ffffff';
  const borderClr = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const textClr   = isDark ? '#e6edf3' : '#1a1f2e';
  const subClr    = isDark ? '#8b949e' : '#6b7280';

  function onOpenChange(keys) {
    const latest = keys.find((k) => !openKeys.includes(k));
    setOpenKeys(latest ? [latest] : []);
  }

  const menuItems = buildMenuItems(MENU_GROUPS, location.pathname, effectiveCollapsed);

  return (
    <Sider
      width={SIDEBAR_W}
      collapsedWidth={SIDEBAR_COLLAPSED_W}
      collapsed={effectiveCollapsed}
      trigger={null}
      theme={isDark ? 'dark' : 'light'}
      style={{
        height: '100vh',
        position: 'fixed',
        left: 0, top: 0, bottom: 0,
        zIndex: 100,
        background: siderBg,
        borderRight: `1px solid ${borderClr}`,
        transition: 'background 0.3s, width 0.2s',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── Top: Logo + Collapse Button ── */}
      <div style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: effectiveCollapsed ? 'center' : 'space-between',
        padding: effectiveCollapsed ? '0 8px' : '0 12px 0 14px',
        borderBottom: `1px solid ${borderClr}`,
        flexShrink: 0,
        gap: 6,
      }}>
        {/* Logo mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', flex: 1, minWidth: 0 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, #1677ff 0%, #722ed1 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 3px 10px rgba(22,119,255,0.4)',
          }}>
            <CarOutlined style={{ fontSize: 15, color: '#fff' }} />
          </div>
          {!effectiveCollapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: textClr, lineHeight: 1.2, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>VMS</div>
              <div style={{ fontSize: 9, color: subClr, lineHeight: 1, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Fleet Manager</div>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <Tooltip title={collapsed ? 'Expand' : 'Collapse'} placement="right">
          <div onClick={() => setSidebarCollapsed(!collapsed)}
            style={{
              width: 24, height: 24, borderRadius: 7, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              color: subClr, fontSize: 11,
              transition: 'all 0.2s',
              border: `1px solid ${borderClr}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? 'rgba(22,119,255,0.2)' : 'rgba(22,119,255,0.1)';
              e.currentTarget.style.color = '#1677ff';
              e.currentTarget.style.borderColor = '#1677ff44';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
              e.currentTarget.style.color = subClr;
              e.currentTarget.style.borderColor = borderClr;
            }}
          >
            {collapsed ? <RightOutlined style={{ fontSize: 10 }} /> : <LeftOutlined style={{ fontSize: 10 }} />}
          </div>
        </Tooltip>
      </div>

      {/* ── Navigation Menu ── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: 6, paddingBottom: 12 }}>
        <Menu
          mode="inline"
          theme={isDark ? 'dark' : 'light'}
          selectedKeys={[location.pathname]}
          openKeys={effectiveCollapsed ? [] : openKeys}
          onOpenChange={onOpenChange}
          items={menuItems}
          onClick={({ key }) => {
            const group = MENU_GROUPS.find((g) => g.key === key);
            if (!group || !group.children) navigate(key);
          }}
          style={{
            background: 'transparent',
            borderRight: 0,
            fontSize: 13,
          }}
          inlineIndent={16}
        />
      </div>

      {/* ── Bottom copyright ── */}
      {!effectiveCollapsed && (
        <div style={{
          padding: '10px 18px',
          borderTop: `1px solid ${borderClr}`,
          flexShrink: 0,
          textAlign: 'center',
        }}>
          <span style={{ fontSize: 10, color: subClr }}>© Nexdecade</span>
        </div>
      )}
    </Sider>
  );
}
