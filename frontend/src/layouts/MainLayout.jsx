import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import AppHeader from './Header';
import AppSidebar from './Sidebar';
import { useUIStore } from '../stores/uiStore';

const { Content } = Layout;

export default function MainLayout() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const isDark = useUIStore((s) => s.isDark);

  return (
    <Layout style={{ minHeight: '100vh', background: isDark ? '#0d1117' : '#f5f7fa' }}>
      <AppSidebar />
      <Layout
        style={{
          marginLeft: collapsed ? 72 : 230,
          transition: 'margin 0.2s',
          background: isDark ? '#0d1117' : '#f5f7fa',
        }}
      >
        <AppHeader />
        <Content style={{ margin: '20px 20px', padding: 0, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
