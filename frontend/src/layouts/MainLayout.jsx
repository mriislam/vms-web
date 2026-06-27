import { Grid, Layout } from 'antd';
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import AppHeader from './Header';
import AppSidebar from './Sidebar';
import { useUIStore } from '../stores/uiStore';
import { initFcm, requestNotificationPermission } from '../utils/firebase';

const { Content } = Layout;
const { useBreakpoint } = Grid;

const SIDEBAR_W           = 240;
const SIDEBAR_COLLAPSED_W = 64;

export default function MainLayout() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const isDark    = useUIStore((s) => s.isDark);
  const screens   = useBreakpoint();

  useEffect(() => {
    requestNotificationPermission().then((granted) => {
      if (granted) initFcm();
    });
  }, []);

  const isMobile   = !screens.md;
  const marginLeft = isMobile ? SIDEBAR_COLLAPSED_W : (collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W);
  const contentPad = isMobile ? '10px 10px' : '12px 16px';

  const bg = isDark
    ? 'radial-gradient(ellipse at 0% 0%, rgba(99,102,241,0.06) 0%, #070c14 50%)'
    : 'radial-gradient(ellipse at 0% 0%, rgba(99,102,241,0.05) 0%, #eef1ff 50%)';

  return (
    <Layout style={{ minHeight: '100vh', background: isDark ? '#070c14' : '#eef1ff' }}>
      <AppSidebar isMobile={isMobile} />
      <Layout
        style={{
          marginLeft,
          transition: 'margin 0.22s cubic-bezier(0.4,0,0.2,1)',
          background: 'transparent',
          minHeight: '100vh',
        }}
      >
        {/* Ambient background glow */}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: bg,
        }} />

        <AppHeader />
        <Content style={{ margin: contentPad, padding: 0, minHeight: 280, position: 'relative', zIndex: 1 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
