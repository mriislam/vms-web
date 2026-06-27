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

const SIDEBAR_W           = 240;
const SIDEBAR_COLLAPSED_W = 64;

// Chip adapts to isDark for light/dark mode compatibility
const chip = (icon, color, active, isDark) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
    background: active
      ? (isDark ? `linear-gradient(135deg,${color}35,${color}18)` : `${color}18`)
      : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
    color: active ? color : (isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)'),
    fontSize: 13, lineHeight: 1,
    transition: 'all 0.25s ease',
    boxShadow: active ? `0 0 14px ${color}45` : 'none',
    border: active
      ? `1px solid ${color}35`
      : `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
  }}>
    {icon}
  </span>
);

const MENU_GROUPS = [
  { key: '/dashboard', color: '#6366f1', label: 'Dashboard', icon: <DashboardOutlined /> },
  {
    key: 'fleet', color: '#10b981', label: 'Fleet Management', icon: <CarOutlined />,
    children: [
      { key: '/vehicles', icon: <CarOutlined />,    color: '#10b981', label: 'Vehicles' },
      { key: '/drivers',  icon: <IdcardOutlined />, color: '#06b6d4', label: 'Drivers' },
    ],
  },
  {
    key: 'booking', color: '#6366f1', label: 'Vehicle Booking', icon: <ScheduleOutlined />,
    children: [
      { key: '/booking/single',      icon: <UserOutlined />,          color: '#6366f1', label: 'Single Booking' },
      { key: '/booking/multiple',    icon: <AppstoreOutlined />,      color: '#8b5cf6', label: 'Multiple Booking' },
      { key: '/booking/manage-trip', icon: <ThunderboltOutlined />,   color: '#06b6d4', label: 'Manage Trip' },
      { key: '/booking/log',         icon: <UnorderedListOutlined />, color: '#f97316', label: 'Booking Log' },
      { key: '/booking/approval',    icon: <SafetyOutlined />,        color: '#f43f5e', label: 'Approval Authority' },
      { key: '/booking/tpt',         icon: <ControlOutlined />,       color: '#06b6d4', label: 'TPT Control Requisition' },
      { key: '/routes',              icon: <GlobalOutlined />,        color: '#8b5cf6', label: 'Routes' },
      { key: '/vts-map',             icon: <EnvironmentOutlined />,   color: '#ec4899', label: 'VTS Map' },
      { key: '/accidents',           icon: <AlertOutlined />,         color: '#f43f5e', label: 'Accident / Occurrence' },
    ],
  },
  {
    key: 'operations', color: '#f97316', label: 'Operations', icon: <ToolOutlined />,
    children: [
      { key: '/fuel',                 icon: <ExperimentOutlined />,  color: '#f43f5e', label: 'Fuel' },
      { key: '/maintenance',          icon: <ToolOutlined />,        color: '#f97316', label: 'Maintenance' },
      { key: '/pm-maintenance',       icon: <SyncOutlined />,        color: '#f59e0b', label: 'PM Maintenance' },
      { key: '/maintenance-approval', icon: <FileProtectOutlined />, color: '#10b981', label: 'Maintenance Approver' },
      { key: '/inventory',            icon: <LaptopOutlined />,      color: '#06b6d4', label: 'Inventory' },
      { key: '/parking',              icon: <HomeOutlined />,        color: '#6366f1', label: 'Parking' },
    ],
  },
  {
    key: 'finance', color: '#06b6d4', label: 'Finance', icon: <WalletOutlined />,
    children: [
      { key: '/expenses', icon: <WalletOutlined />, color: '#06b6d4', label: 'Expenses' },
      { key: '/vendors',  icon: <ShopOutlined />,   color: '#8b5cf6', label: 'Suppliers' },
    ],
  },
  {
    key: 'people', color: '#ec4899', label: 'People', icon: <TeamOutlined />,
    children: [
      { key: '/employees',    icon: <TeamOutlined />,         color: '#8b5cf6', label: 'Employees' },
      { key: '/driver-leave', icon: <UserOutlined />,         color: '#ec4899', label: 'Driver Leave' },
      { key: '/coordinators', icon: <TeamOutlined />,         color: '#10b981', label: 'Coordinators' },
      { key: '/notices',      icon: <NotificationOutlined />, color: '#f59e0b', label: 'Notices' },
      { key: '/driver/trips', icon: <CarOutlined />,          color: '#06b6d4', label: 'Driver Portal' },
    ],
  },
  {
    key: 'analytics', color: '#ec4899', label: 'Analytics', icon: <PieChartOutlined />,
    children: [
      { key: '/reports',  icon: <FundOutlined />,     color: '#6366f1', label: 'Reports' },
      { key: '/insights', icon: <PieChartOutlined />, color: '#ec4899', label: 'Insights' },
    ],
  },
  {
    key: 'system', color: '#f43f5e', label: 'System', icon: <SettingOutlined />,
    children: [
      { key: '/audit-log', icon: <AuditOutlined />, color: '#8b5cf6', label: 'Audit Log' },
    ],
  },
  {
    key: 'settings', color: '#94a3b8', label: 'Settings', icon: <SettingOutlined />,
    children: [
      { key: '/user-admin',       icon: <TeamOutlined />,    color: '#f43f5e', label: 'User Admin' },
      { key: '/role-permissions', icon: <SafetyOutlined />,  color: '#f97316', label: 'Role Permissions' },
      { key: '/settings',         icon: <SettingOutlined />, color: '#94a3b8', label: 'App Settings' },
    ],
  },
];

function getGroupKey(pathname) {
  for (const g of MENU_GROUPS) {
    if (g.children?.some((c) => c.key === pathname)) return g.key;
  }
  return null;
}

function buildMenuItems(groups, activeKey, collapsed, isDark) {
  const groupLabelColor = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)';
  const activeGroupLabelColor = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.78)';
  const itemColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';

  return groups.map((g) => {
    const isGroupActive = g.children
      ? g.children.some((c) => c.key === activeKey)
      : g.key === activeKey;

    const item = {
      key: g.key,
      icon: chip(g.icon, g.color, isGroupActive, isDark),
      label: collapsed ? null : (
        <span style={{
          fontWeight: 700, fontSize: 11, letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: isGroupActive ? activeGroupLabelColor : groupLabelColor,
          transition: 'color 0.2s',
        }}>
          {g.label}
        </span>
      ),
    };

    if (g.children) {
      item.children = g.children.map((c) => {
        const isActive = c.key === activeKey;
        return {
          key: c.key,
          icon: chip(c.icon, c.color, isActive, isDark),
          label: (
            <span style={{
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? c.color : itemColor,
              transition: 'color 0.2s',
            }}>
              {c.label}
            </span>
          ),
          style: isActive ? {
            background: isDark
              ? `linear-gradient(90deg,${c.color}12 0%,transparent 100%)`
              : `linear-gradient(90deg,${c.color}10 0%,transparent 100%)`,
            borderLeft: `2px solid ${c.color}`,
            paddingLeft: 10,
          } : {},
        };
      });
    }
    return item;
  });
}

export default function AppSidebar({ isMobile = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const isDark = useUIStore((s) => s.isDark);
  const effectiveCollapsed = collapsed || isMobile;

  const currentGroup = getGroupKey(location.pathname);
  const [openKeys, setOpenKeys] = useState(currentGroup ? [currentGroup] : []);

  // Theme-aware colors
  const siderBg    = isDark
    ? 'linear-gradient(165deg,#060a1a 0%,#0c1138 45%,#07091e 100%)'
    : 'linear-gradient(165deg,#ffffff 0%,#f8faff 100%)';
  const borderClr  = isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.1)';
  const logoBgText = isDark
    ? 'linear-gradient(135deg,#a5b4fc,#67e8f9)'
    : 'linear-gradient(135deg,#6366f1,#06b6d4)';
  const subTextClr = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.35)';
  const collapseButtonBg  = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const collapseButtonClr = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)';
  const siderBoxShadow    = isDark ? '4px 0 24px rgba(0,0,0,0.4)' : '4px 0 16px rgba(99,102,241,0.08)';

  function onOpenChange(keys) {
    const latest = keys.find((k) => !openKeys.includes(k));
    setOpenKeys(latest ? [latest] : []);
  }

  const menuItems = buildMenuItems(MENU_GROUPS, location.pathname, effectiveCollapsed, isDark);

  return (
    <Sider
      width={SIDEBAR_W}
      collapsedWidth={SIDEBAR_COLLAPSED_W}
      collapsed={effectiveCollapsed}
      trigger={null}
      theme={isDark ? 'dark' : 'light'}
      className="vms-sidebar"
      style={{
        height: '100vh',
        position: 'fixed',
        left: 0, top: 0, bottom: 0,
        zIndex: 100,
        background: siderBg,
        borderRight: `1px solid ${borderClr}`,
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: siderBoxShadow,
      }}
    >
      {/* ── Logo + Collapse ─────────────────────────────────────────────── */}
      <div style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: effectiveCollapsed ? 'center' : 'space-between',
        padding: effectiveCollapsed ? '0 8px' : '0 14px 0 16px',
        borderBottom: `1px solid ${borderClr}`,
        flexShrink: 0,
        gap: 8,
        background: isDark ? 'rgba(99,102,241,0.04)' : 'rgba(99,102,241,0.03)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden', flex: 1, minWidth: 0 }}>
          <img src="/nexvms-logo.svg" alt="NEXVMS"
            style={{ width: 36, height: 36, flexShrink: 0, objectFit: 'contain',
              filter: 'drop-shadow(0 2px 8px rgba(22,163,74,0.4))' }} />
          {!effectiveCollapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                fontSize: 15, fontWeight: 900, lineHeight: 1.15,
                letterSpacing: '-0.04em', whiteSpace: 'nowrap',
                background: logoBgText,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                NEXVMS
              </div>
              <div style={{ fontSize: 9, color: subTextClr, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', fontWeight: 700 }}>
                Fleet Manager
              </div>
            </div>
          )}
        </div>

        {!isMobile && (
          <Tooltip title={collapsed ? 'Expand' : 'Collapse'} placement="right">
            <div
              onClick={() => setSidebarCollapsed(!collapsed)}
              style={{
                width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                background: collapseButtonBg,
                color: collapseButtonClr, fontSize: 10,
                transition: 'all 0.2s',
                border: `1px solid ${borderClr}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(99,102,241,0.2)';
                e.currentTarget.style.color = '#6366f1';
                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = collapseButtonBg;
                e.currentTarget.style.color = collapseButtonClr;
                e.currentTarget.style.borderColor = borderClr;
              }}
            >
              {collapsed ? <RightOutlined style={{ fontSize: 10 }} /> : <LeftOutlined style={{ fontSize: 10 }} />}
            </div>
          </Tooltip>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: 8, paddingBottom: 16 }}>
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
          style={{ background: 'transparent', borderRight: 0, fontSize: 13 }}
          inlineIndent={12}
        />
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      {!effectiveCollapsed && (
        <div style={{
          padding: '10px 18px',
          borderTop: `1px solid ${borderClr}`,
          flexShrink: 0,
          textAlign: 'center',
          background: isDark ? 'rgba(99,102,241,0.03)' : 'rgba(99,102,241,0.02)',
        }}>
          <span style={{ fontSize: 10, color: subTextClr, letterSpacing: '0.05em' }}>
            © Nexdecade Technology
          </span>
        </div>
      )}
    </Sider>
  );
}
