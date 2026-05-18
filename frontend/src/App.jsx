import { ConfigProvider, theme } from 'antd';
import { BrowserRouter } from 'react-router-dom';
import AppRouter from './routes/AppRouter';
import { useUIStore } from './stores/uiStore';
import { darkTheme, lightTheme } from './theme/antdTheme';

export default function App() {
  const isDark = useUIStore((s) => s.isDark);

  return (
    <ConfigProvider theme={isDark ? darkTheme : lightTheme}>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </ConfigProvider>
  );
}
