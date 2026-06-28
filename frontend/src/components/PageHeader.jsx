import { Grid, Typography } from 'antd';

const { useBreakpoint } = Grid;
const { Text } = Typography;

// Gradient presets matching the VMS palette
const GRAD = {
  '#6366f1': ['#4f46e5','#8b5cf6'],
  '#52c41a': ['#059669','#10b981'],
  '#ff4d4f': ['#e11d48','#f43f5e'],
  '#fa8c16': ['#d97706','#f59e0b'],
  '#1677ff': ['#1d4ed8','#3b82f6'],
  '#08979c': ['#0891b2','#06b6d4'],
  '#722ed1': ['#7c3aed','#8b5cf6'],
  '#eb2f96': ['#db2777','#ec4899'],
  '#0958d9': ['#1d4ed8','#6366f1'],
};

export default function PageHeader({ icon, color = '#6366f1', title, subtitle, stats = [], actions }) {
  const screens = useBreakpoint();
  const compact = !screens.md;
  const [c1, c2] = GRAD[color] ?? [color, color + 'cc'];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: compact ? 8 : 12,
      marginBottom: compact ? 10 : 14,
      padding: compact ? '10px 14px' : '14px 20px',
      borderRadius: 16,
      background: `linear-gradient(135deg, ${c1}12 0%, ${c2}06 100%)`,
      border: `1.5px solid ${color}20`,
      borderLeft: `4px solid ${color}`,
      boxShadow: `0 4px 20px ${color}08`,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Subtle background orb */}
      <div style={{
        position: 'absolute', right: -30, top: -30,
        width: 120, height: 120, borderRadius: '50%',
        background: `radial-gradient(circle, ${color}10, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Left — icon + title + stats */}
      <div style={{ display:'flex', alignItems:'center', gap: compact ? 10 : 14, flexWrap:'wrap', position:'relative', zIndex:1 }}>
        {/* Gradient icon box */}
        <div style={{
          width: compact ? 36 : 42, height: compact ? 36 : 42,
          borderRadius: 12, flexShrink: 0,
          background: `linear-gradient(135deg, ${c1}25, ${c2}12)`,
          border: `1.5px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: compact ? 16 : 19, color,
          boxShadow: `0 4px 12px ${color}20`,
        }}>
          {icon}
        </div>

        <div>
          <div style={{
            fontWeight: 900, fontSize: compact ? 15 : 18,
            lineHeight: 1.2, color: 'inherit', letterSpacing: '-0.02em',
          }}>
            {title}
          </div>
          {subtitle && (
            <Text type="secondary" style={{ fontSize: compact ? 11 : 12, marginTop: 2, display: 'block' }}>
              {subtitle}
            </Text>
          )}

          {/* Stats pills */}
          {stats.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
              {stats.map((s) => (
                <span key={s.label} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px', borderRadius: 20, fontSize: 12,
                  background: (s.color ?? color) + '14',
                  border: `1px solid ${(s.color ?? color)}30`,
                  color: s.color ?? color,
                  fontWeight: 600,
                  boxShadow: `0 2px 6px ${(s.color ?? color)}15`,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{s.value}</span>
                  <span style={{ fontWeight: 500, opacity: 0.8 }}>{s.label}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right — actions */}
      {actions && (
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', position:'relative', zIndex:1 }}>
          {actions}
        </div>
      )}
    </div>
  );
}
