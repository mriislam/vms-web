import { Typography } from 'antd';

const { Title, Text } = Typography;

/**
 * PageHeader — consistent page title bar with colored icon, stats row, and actions.
 *
 * Props:
 *  icon     – React node (Ant Design icon)
 *  color    – accent hex string
 *  title    – page title string
 *  subtitle – optional subtitle string
 *  stats    – optional array of { label, value, color? }
 *  actions  – optional React node (buttons etc.)
 */
export default function PageHeader({ icon, color = '#1677ff', title, subtitle, stats = [], actions }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 20,
        padding: '18px 24px',
        borderRadius: 14,
        background: `linear-gradient(135deg, ${color}18 0%, ${color}06 100%)`,
        border: `1px solid ${color}28`,
        borderLeft: `4px solid ${color}`,
      }}
    >
      {/* Left — icon + title + stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        {/* Icon box */}
        <div style={{
          width: 46, height: 46, borderRadius: 12, flexShrink: 0,
          background: `linear-gradient(135deg, ${color}30, ${color}10)`,
          border: `1px solid ${color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, color,
        }}>
          {icon}
        </div>

        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 700, lineHeight: 1.2 }}>
            {title}
          </Title>
          {subtitle && (
            <Text type="secondary" style={{ fontSize: 12 }}>{subtitle}</Text>
          )}

          {/* Stats pills */}
          {stats.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {stats.map((s) => (
                <span
                  key={s.label}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px', borderRadius: 20, fontSize: 12,
                    background: (s.color ?? color) + '18',
                    border: `1px solid ${(s.color ?? color)}35`,
                    color: s.color ?? color,
                    fontWeight: 600,
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{s.value}</span>
                  <span style={{ fontWeight: 400, opacity: 0.8 }}>{s.label}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right — actions */}
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
    </div>
  );
}
