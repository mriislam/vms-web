import { Grid, Typography } from 'antd';

const { useBreakpoint } = Grid;
const { Text } = Typography;

export default function PageHeader({ icon, color = '#1677ff', title, subtitle, stats = [], actions }) {
  const screens = useBreakpoint();
  const compact = !screens.md; // xs/sm → extra compact

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: compact ? 6 : 10,
      marginBottom: compact ? 8 : 12,
      padding: compact ? '7px 12px' : '9px 16px',
      borderRadius: 10,
      background: `linear-gradient(135deg, ${color}18 0%, ${color}06 100%)`,
      border: `1px solid ${color}28`,
      borderLeft: `4px solid ${color}`,
    }}>
      {/* Left — icon + title + stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 8 : 10, flexWrap: 'wrap' }}>
        {/* Icon box */}
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: `linear-gradient(135deg, ${color}30, ${color}10)`,
          border: `1px solid ${color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, color,
        }}>
          {icon}
        </div>

        <div>
          <div style={{ margin: 0, fontWeight: 700, fontSize: compact ? 13 : 15, lineHeight: 1.25, color: 'inherit' }}>
            {title}
          </div>
          {subtitle && (
            <Text type="secondary" style={{ fontSize: 11 }}>{subtitle}</Text>
          )}

          {/* Stats pills */}
          {stats.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
              {stats.map((s) => (
                <span key={s.label} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '2px 8px', borderRadius: 20, fontSize: 11,
                  background: (s.color ?? color) + '18',
                  border: `1px solid ${(s.color ?? color)}35`,
                  color: s.color ?? color,
                  fontWeight: 600,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{s.value}</span>
                  <span style={{ fontWeight: 400, opacity: 0.8 }}>{s.label}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right — actions */}
      {actions && <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}
