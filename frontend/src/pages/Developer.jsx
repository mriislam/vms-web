import { CodeOutlined, ExportOutlined } from '@ant-design/icons';
import { Button, Tag, Typography } from 'antd';
import { useUIStore } from '../stores/uiStore';

const { Text } = Typography;

const API_DOCS_URL = '/api-docs.html'; // served from same origin — no auth needed
const BASE_URL     = 'https://demo-vms.nexdecade.com/api';

export default function DeveloperPage() {
  const isDark = useUIStore(s => s.isDark);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', gap: 0 }}>

      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        padding: '10px 16px', marginBottom: 12,
        background: isDark ? '#0d1628' : '#fff',
        border: `1px solid ${isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)'}`,
        borderRadius: 14,
        boxShadow: isDark ? 'none' : '0 2px 8px rgba(99,102,241,0.06)',
      }}>
        {/* Icon */}
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
        }}>
          <CodeOutlined style={{ color: '#fff', fontSize: 16 }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: isDark ? '#e2e8f0' : '#1e293b', letterSpacing: '-0.02em' }}>
            API Reference
          </div>
          <Text style={{ fontSize: 12, color: '#94a3b8' }}>
            REST endpoints · AES-256-GCM encryption · JWT HS512
          </Text>
        </div>

        {/* Base URL */}
        <code style={{
          fontSize: 12, padding: '5px 12px', borderRadius: 8,
          background: isDark ? 'rgba(99,102,241,0.1)' : '#f8faff',
          border: `1px solid ${isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)'}`,
          color: '#6366f1', fontWeight: 500, whiteSpace: 'nowrap',
        }}>
          {BASE_URL}
        </code>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <Tag color="processing" style={{ borderRadius: 20, fontWeight: 700, margin: 0 }}>v1.0</Tag>
          <Tag color="success" style={{ borderRadius: 20, fontWeight: 700, margin: 0 }}>● Live</Tag>
        </div>

        {/* Open in new tab */}
        <Button
          icon={<ExportOutlined />}
          size="small"
          style={{ borderRadius: 8, flexShrink: 0, fontWeight: 600 }}
          onClick={() => window.open('/api-docs.html', '_blank')}
        >
          Open Full Page
        </Button>
      </div>

      {/* ── Iframe ─────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, minHeight: 0, borderRadius: 14, overflow: 'hidden',
        border: `1px solid ${isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)'}`,
        boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 4px 24px rgba(99,102,241,0.08)',
      }}>
        <iframe
          src={API_DOCS_URL}
          title="NEXVMS API Reference"
          style={{
            width: '100%', height: '100%',
            border: 'none', display: 'block',
            background: '#0D1117',
          }}
          allow="clipboard-write"
        />
      </div>
    </div>
  );
}
