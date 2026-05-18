import { CloseOutlined } from '@ant-design/icons';
import { Button, Modal } from 'antd';

export function FormSection({ title, color = '#1677ff', children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 3, height: 13, borderRadius: 2,
          background: `linear-gradient(180deg, ${color}, ${color}88)`,
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.07em', color,
        }}>
          {title}
        </span>
        <div style={{ flex: 1, height: 1, background: color + '20' }} />
      </div>
      <div style={{
        background: color + '05',
        border: `1px solid ${color}16`,
        borderRadius: 8,
        padding: '10px 12px 2px',
      }}>
        {children}
      </div>
    </div>
  );
}

export default function FormModal({
  open,
  onClose,
  onSubmit,
  title,
  subtitle,
  icon,
  color = '#1677ff',
  okText = 'Save',
  width = 760,
  loading = false,
  confirmLoading,
  destroyOnClose = true,
  children,
}) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={null}
      footer={null}
      width={width}
      centered
      draggable
      destroyOnClose={destroyOnClose}
      closeIcon={null}
      styles={{
        body: { padding: 0 },
        content: { overflow: 'hidden', padding: 0, maxWidth: '95vw' },
      }}
    >
      {/* ── Header ── */}
      <div style={{
        background: `linear-gradient(135deg, ${color}ee 0%, ${color}99 100%)`,
        padding: '14px 18px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -24, top: -24, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 18, bottom: -32, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, zIndex: 1 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, color: '#fff',
            boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
          }}>
            {icon}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{title}</div>
            {subtitle && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 1 }}>{subtitle}</div>
            )}
          </div>
        </div>

        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={onClose}
          style={{
            color: 'rgba(255,255,255,0.85)', zIndex: 1,
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        />
      </div>

      {/* ── Body ── */}
      <div style={{
        padding: '14px 18px 4px',
        maxHeight: 'calc(82vh - 120px)',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {children}
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: '10px 18px 14px',
        display: 'flex', justifyContent: 'flex-end', gap: 8,
        borderTop: '1px solid rgba(128,128,128,0.12)',
      }}>
        <Button onClick={onClose} style={{ minWidth: 80 }}>Cancel</Button>
        <Button
          type="primary"
          onClick={onSubmit}
          loading={loading || confirmLoading}
          style={{
            minWidth: 110,
            background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
            border: 'none',
            boxShadow: `0 4px 12px ${color}50`,
            fontWeight: 600,
          }}
        >
          {okText}
        </Button>
      </div>
    </Modal>
  );
}
