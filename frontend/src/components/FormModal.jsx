import { CloseOutlined, SendOutlined } from '@ant-design/icons';
import { Button, Modal } from 'antd';

// ── Section label — matches Single Booking style ─────────────────────────────
export function FormSection({ title, color = '#6366f1', icon, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{
          width: 4, height: 18, borderRadius: 3, flexShrink: 0,
          background: `linear-gradient(180deg, ${color}, ${color}66)`,
        }} />
        {icon && <span style={{ color, fontSize: 13 }}>{icon}</span>}
        <span style={{
          fontSize: 12, fontWeight: 800, textTransform: 'uppercase',
          letterSpacing: '0.07em', color,
        }}>
          {title}
        </span>
        <div style={{ flex: 1, height: 1, background: color + '18' }} />
      </div>
      <div style={{
        background: color + '04',
        border: `1px solid ${color}14`,
        borderRadius: 12,
        padding: '14px 16px 6px',
      }}>
        {children}
      </div>
    </div>
  );
}

// ── FormModal ─────────────────────────────────────────────────────────────────
export default function FormModal({
  open,
  onClose,
  onSubmit,
  title,
  subtitle,
  icon,
  color = '#6366f1',
  okText = 'Save Changes',
  width = 760,
  loading = false,
  confirmLoading,
  destroyOnClose = true,
  children,
  extra,          // extra elements in header right side
}) {
  // Build a rich 3-stop gradient matching Single Booking aesthetic
  const gradMap = {
    '#6366f1': 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 60%,#6366f1 100%)',
    '#52c41a': 'linear-gradient(135deg,#059669 0%,#16a34a 60%,#22c55e 100%)',
    '#ff4d4f': 'linear-gradient(135deg,#e11d48 0%,#f43f5e 60%,#fb7185 100%)',
    '#fa8c16': 'linear-gradient(135deg,#d97706 0%,#f59e0b 60%,#fbbf24 100%)',
    '#1677ff': 'linear-gradient(135deg,#1d4ed8 0%,#3b82f6 60%,#60a5fa 100%)',
    '#08979c': 'linear-gradient(135deg,#0891b2 0%,#06b6d4 60%,#22d3ee 100%)',
    '#722ed1': 'linear-gradient(135deg,#7c3aed 0%,#8b5cf6 60%,#a78bfa 100%)',
    '#eb2f96': 'linear-gradient(135deg,#db2777 0%,#ec4899 60%,#f472b6 100%)',
  };
  const gradient = gradMap[color] ?? `linear-gradient(135deg,${color}ee 0%,${color}aa 100%)`;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={null}
      footer={null}
      width={width}
      centered
      destroyOnClose={destroyOnClose}
      closeIcon={null}
      styles={{
        body: { padding: 0 },
        content: {
          overflow: 'hidden', padding: 0,
          maxWidth: '96vw', borderRadius: 20,
          boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        },
        mask: { backdropFilter: 'blur(6px)' },
      }}
    >
      {/* ── Gradient Header ─────────────────────────────────────────── */}
      <div style={{
        background: gradient,
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative orbs */}
        <div style={{ position:'absolute', right:-40, top:-40, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.07)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', left:'45%', bottom:-50, width:90, height:90, borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }} />

        {/* Icon + title */}
        <div style={{ display:'flex', alignItems:'center', gap:12, zIndex:1 }}>
          <div style={{
            width:40, height:40, borderRadius:11, flexShrink:0,
            background:'rgba(255,255,255,0.2)',
            backdropFilter:'blur(4px)',
            border:'1px solid rgba(255,255,255,0.3)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:18, color:'#fff',
            boxShadow:'0 4px 12px rgba(0,0,0,0.15)',
          }}>
            {icon}
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:900, color:'#fff', lineHeight:1.25, letterSpacing:'-0.02em' }}>{title}</div>
            {subtitle && (
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.72)', marginTop:2 }}>{subtitle}</div>
            )}
          </div>
        </div>

        {/* Right side */}
        <div style={{ display:'flex', alignItems:'center', gap:8, zIndex:1 }}>
          {extra}
          <Button
            type="text"
            icon={<CloseOutlined style={{ fontSize:13 }} />}
            onClick={onClose}
            style={{
              color:'rgba(255,255,255,0.9)',
              background:'rgba(255,255,255,0.15)',
              border:'1px solid rgba(255,255,255,0.25)',
              borderRadius:9, width:34, height:34,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}
          />
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────── */}
      <div style={{
        padding: '20px 22px 8px',
        maxHeight: 'calc(84vh - 130px)',
        overflowY: 'auto', overflowX: 'hidden',
        background: 'linear-gradient(180deg,#f8faff 0%,#ffffff 100%)',
      }}>
        {children}
      </div>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div style={{
        padding: '12px 22px 16px',
        display: 'flex', justifyContent: 'flex-end', gap: 10,
        borderTop: '1px solid rgba(99,102,241,0.1)',
        background: 'rgba(248,250,255,0.98)',
      }}>
        <Button
          onClick={onClose}
          style={{ minWidth:90, height:40, borderRadius:10, fontWeight:600 }}
        >
          Cancel
        </Button>
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={onSubmit}
          loading={loading || confirmLoading}
          style={{
            minWidth:130, height:40, borderRadius:10, fontWeight:700,
            background: gradient,
            border: 'none',
            boxShadow: `0 4px 14px ${color}44`,
            letterSpacing: '0.01em',
          }}
        >
          {okText}
        </Button>
      </div>
    </Modal>
  );
}
