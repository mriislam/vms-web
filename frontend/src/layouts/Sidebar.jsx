import {
  AlertOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  AuditOutlined,
  CarOutlined,
  CodeOutlined,
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
import { Layout, Menu, Popover, Tooltip } from 'antd';
import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';

const { Sider } = Layout;

const SIDEBAR_W           = 240;
const SIDEBAR_COLLAPSED_W = 64;

export const MENU_GROUPS = [
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
      { key: '/booking/tpt',         icon: <ControlOutlined />,       color: '#06b6d4', label: 'TPT Requisition' },
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
      { key: '/departments',  icon: <ApartmentOutlined />,    color: '#8b5cf6', label: 'Departments' },
      { key: '/employees',    icon: <TeamOutlined />,         color: '#6366f1', label: 'Employees' },
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
      { key: '/service-centers',  icon: <ShopOutlined />,    color: '#06b6d4', label: 'Service Centers' },
      { key: '/settings',         icon: <SettingOutlined />, color: '#94a3b8', label: 'App Settings' },
      { key: '/developer',        icon: <CodeOutlined />,    color: '#6366f1', label: 'Developer' },
    ],
  },
];

function getGroupKey(pathname) {
  for (const g of MENU_GROUPS) {
    if (g.children?.some((c) => c.key === pathname)) return g.key;
  }
  return null;
}

// Icon chip — always colorful, glows when active
function Chip({ icon, color, active, isDark, size = 32 }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: size * 0.28, flexShrink: 0,
      background: active
        ? `linear-gradient(135deg,${color}30,${color}15)`
        : (isDark ? `${color}14` : `${color}12`),
      color: active ? color : `${color}cc`,
      fontSize: size * 0.44, lineHeight: 1,
      transition: 'all 0.22s ease',
      boxShadow: active ? `0 0 16px ${color}50, 0 2px 8px ${color}25` : 'none',
    }}>
      {icon}
    </span>
  );
}

// Collapsed sidebar: icon + popover submenu
function CollapsedNav({ activeKey, isDark, navigate }) {
  const [openPopover, setOpenPopover] = useState(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 0' }}>
      {MENU_GROUPS.map((g) => {
        const isGroupActive = g.children
          ? g.children.some((c) => c.key === activeKey)
          : g.key === activeKey;

        const iconBtn = (
          <div
            onClick={() => {
              if (!g.children) { navigate(g.key); setOpenPopover(null); }
              else setOpenPopover(openPopover === g.key ? null : g.key);
            }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 44, height: 44, margin: '0 auto', borderRadius: 12,
              cursor: 'pointer',
              background: isGroupActive
                ? (isDark ? `${g.color}20` : `${g.color}15`)
                : 'transparent',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${g.color}18`; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = isGroupActive ? (isDark ? `${g.color}20` : `${g.color}15`) : 'transparent'; }}
          >
            <Chip icon={g.icon} color={g.color} active={isGroupActive} isDark={isDark} size={30} />
          </div>
        );

        if (!g.children) {
          return (
            <Tooltip key={g.key} title={g.label} placement="right">
              {iconBtn}
            </Tooltip>
          );
        }

        const popContent = (
          <div style={{ minWidth: 180, padding: '4px 0' }}>
            <div style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: g.color,
              padding: '4px 12px 8px', borderBottom: `1px solid ${g.color}20`, marginBottom: 4,
            }}>
              {g.label}
            </div>
            {g.children.map((c) => {
              const isActive = c.key === activeKey;
              return (
                <div key={c.key}
                  onClick={() => { navigate(c.key); setOpenPopover(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 12px', cursor: 'pointer', borderRadius: 8, margin: '0 4px',
                    background: isActive ? `${c.color}12` : 'transparent',
                    borderLeft: isActive ? `2px solid ${c.color}` : '2px solid transparent',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = `${c.color}0e`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? `${c.color}12` : 'transparent'; }}
                >
                  <Chip icon={c.icon} color={c.color} active={isActive} isDark={false} size={24} />
                  <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 400, color: isActive ? c.color : '#374151' }}>
                    {c.label}
                  </span>
                </div>
              );
            })}
          </div>
        );

        return (
          <Popover
            key={g.key}
            open={openPopover === g.key}
            onOpenChange={(v) => setOpenPopover(v ? g.key : null)}
            content={popContent}
            placement="rightTop"
            trigger="click"
            overlayStyle={{ padding: 0 }}
            overlayInnerStyle={{ padding: '6px 0', borderRadius: 12, minWidth: 190 }}
            arrow={false}
          >
            <Tooltip title={openPopover === g.key ? null : g.label} placement="right">
              {iconBtn}
            </Tooltip>
          </Popover>
        );
      })}
    </div>
  );
}

// Expanded sidebar: full Ant Design Menu
function buildMenuItems(groups, activeKey, isDark) {
  const groupLabelColor       = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';
  const activeGroupLabelColor = isDark ? 'rgba(255,255,255,0.9)'  : 'rgba(0,0,0,0.82)';
  const itemColor             = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.62)';

  return groups.map((g) => {
    const isGroupActive = g.children
      ? g.children.some((c) => c.key === activeKey)
      : g.key === activeKey;

    const item = {
      key: g.key,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Chip icon={g.icon} color={g.color} active={isGroupActive} isDark={isDark} size={26} />
          <span style={{
            fontWeight: 700, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: isGroupActive ? activeGroupLabelColor : groupLabelColor,
            transition: 'color 0.2s',
          }}>
            {g.label}
          </span>
        </div>
      ),
    };

    if (g.children) {
      item.children = g.children.map((c) => {
        const isActive = c.key === activeKey;
        return {
          key: c.key,
          label: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Chip icon={c.icon} color={c.color} active={isActive} isDark={isDark} size={22} />
              <span style={{
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                color: isActive ? c.color : itemColor,
                transition: 'color 0.2s',
              }}>
                {c.label}
              </span>
            </div>
          ),
          style: isActive ? {
            background: isDark
              ? `linear-gradient(90deg,${c.color}14 0%,transparent 100%)`
              : `linear-gradient(90deg,${c.color}10 0%,transparent 100%)`,
            borderLeft: `2px solid ${c.color}`,
          } : {},
        };
      });
    }
    return item;
  });
}

export default function AppSidebar({ isMobile = false }) {
  const rawNavigate         = useNavigate();
  const location            = useLocation();
  const collapsed           = useUIStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const isDark              = useUIStore((s) => s.isDark);
  const effectiveCollapsed  = collapsed || isMobile;

  // Tenant-aware navigation — prefix all paths with /:tenantSlug
  const { tenantSlug } = useParams();
  const prefix     = tenantSlug ? `/${tenantSlug}` : '';
  const navigate   = (key) => rawNavigate(`${prefix}${key}`);
  const activePath = tenantSlug
    ? (location.pathname.startsWith(prefix) ? location.pathname.slice(prefix.length) || '/dashboard' : location.pathname)
    : location.pathname;

  const currentGroup = getGroupKey(activePath);
  const [openKeys, setOpenKeys] = useState(currentGroup ? [currentGroup] : []);

  const siderBg         = isDark ? 'linear-gradient(165deg,#060a1a 0%,#0c1138 45%,#07091e 100%)' : 'linear-gradient(165deg,#ffffff 0%,#f8faff 100%)';
  const borderClr       = isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.1)';
  const logoBgText      = isDark ? 'linear-gradient(135deg,#a5b4fc,#67e8f9)' : 'linear-gradient(135deg,#6366f1,#06b6d4)';
  const subTextClr      = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.35)';
  const colBtnBg        = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const colBtnClr       = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)';
  const siderBoxShadow  = isDark ? '4px 0 24px rgba(0,0,0,0.4)' : '4px 0 16px rgba(99,102,241,0.08)';

  function onOpenChange(keys) {
    const latest = keys.find((k) => !openKeys.includes(k));
    setOpenKeys(latest ? [latest] : []);
  }

  return (
    <Sider
      width={SIDEBAR_W} collapsedWidth={SIDEBAR_COLLAPSED_W}
      collapsed={effectiveCollapsed} trigger={null}
      theme={isDark ? 'dark' : 'light'} className="vms-sidebar"
      style={{
        height: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100,
        background: siderBg, borderRight: `1px solid ${borderClr}`,
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: siderBoxShadow,
      }}
    >
      {/* Logo + Collapse */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center',
        justifyContent: effectiveCollapsed ? 'center' : 'space-between',
        padding: effectiveCollapsed ? '0 8px' : '0 14px 0 16px',
        borderBottom: `1px solid ${borderClr}`, flexShrink: 0, gap: 8,
        background: isDark ? 'rgba(99,102,241,0.04)' : 'rgba(99,102,241,0.03)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden', flex: 1, minWidth: 0 }}>
          <img src="/nexvms-logo.svg" alt="NEXVMS"
            style={{ width: 36, height: 36, flexShrink: 0, objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(22,163,74,0.4))' }} />
          {!effectiveCollapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                fontSize: 15, fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.04em', whiteSpace: 'nowrap',
                background: logoBgText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>NEXVMS</div>
              <div style={{ fontSize: 9, color: subTextClr, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
                {useAuthStore.getState().tenantName || 'Fleet Manager'}
              </div>
            </div>
          )}
        </div>
        {!isMobile && (
          <Tooltip title={collapsed ? 'Expand' : 'Collapse'} placement="right">
            <div onClick={() => setSidebarCollapsed(!collapsed)} style={{
              width: 24, height: 24, borderRadius: 7, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', background: colBtnBg, color: colBtnClr, fontSize: 10,
              transition: 'all 0.2s', border: `1px solid ${borderClr}`,
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = colBtnBg; e.currentTarget.style.color = colBtnClr; e.currentTarget.style.borderColor = borderClr; }}
            >
              {collapsed ? <RightOutlined style={{ fontSize: 10 }} /> : <LeftOutlined style={{ fontSize: 10 }} />}
            </div>
          </Tooltip>
        )}
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 16 }}>
        {effectiveCollapsed ? (
          /* ── Collapsed: custom popover nav ── */
          <CollapsedNav activeKey={activePath} isDark={isDark} navigate={navigate} />
        ) : (
          /* ── Expanded: Ant Design Menu ── */
          <Menu
            mode="inline"
            theme={isDark ? 'dark' : 'light'}
            selectedKeys={[activePath]}
            openKeys={openKeys}
            onOpenChange={onOpenChange}
            items={buildMenuItems(MENU_GROUPS, activePath, isDark)}
            onClick={({ key }) => {
              const group = MENU_GROUPS.find((g) => g.key === key);
              if (!group || !group.children) navigate(key);
            }}
            style={{ background: 'transparent', borderRight: 0, fontSize: 13, paddingTop: 8 }}
            inlineIndent={12}
          />
        )}
      </div>

      {/* Footer */}
      {!effectiveCollapsed && (
        <div style={{
          padding: '10px 18px', borderTop: `1px solid ${borderClr}`, flexShrink: 0,
          textAlign: 'center', background: isDark ? 'rgba(99,102,241,0.03)' : 'rgba(99,102,241,0.02)',
        }}>
          <span style={{ fontSize: 10, color: subTextClr, letterSpacing: '0.05em' }}>
            © Nexdecade Technology
          </span>
        </div>
      )}
    </Sider>
  );
}
