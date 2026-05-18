import { Grid, Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import AppHeader from './Header';
import AppSidebar from './Sidebar';
import { useUIStore } from '../stores/uiStore';

const { Content } = Layout;
const { useBreakpoint } = Grid;

// Must stay in sync with Sidebar.jsx constants
const SIDEBAR_W = 220;
const SIDEBAR_COLLAPSED_W = 60;

export default function MainLayout() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const isDark    = useUIStore((s) => s.isDark);
  const screens   = useBreakpoint();

  // On xs/sm screens the sidebar is always icon-only and doesn't push content
  const isMobile    = !screens.md;
  const marginLeft  = isMobile ? SIDEBAR_COLLAPSED_W : (collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W);
  const contentPad  = isMobile ? '8px 8px' : '10px 14px';

  return (
    <Layout style={{ minHeight: '100vh', background: isDark ? '#0d1117' : '#f5f7fa' }}>
      <AppSidebar isMobile={isMobile} />
      <Layout style={{ marginLeft, transition: 'margin 0.2s', background: isDark ? '#0d1117' : '#f5f7fa' }}>
        <AppHeader />
        <Content style={{ margin: contentPad, padding: 0, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
