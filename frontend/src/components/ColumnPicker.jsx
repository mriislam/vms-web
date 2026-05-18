import { ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import { Badge, Button, Checkbox, Divider, Popover, Space, Tooltip, Typography } from 'antd';
import { useState } from 'react';

const { Text } = Typography;

/**
 * ColumnPicker — button that opens a popover letting users show/hide columns.
 *
 * Props:
 *  allColumns   – full column list (each needs .key and .title)
 *  visibleKeys  – Set<string> of currently visible keys
 *  onChange     – (newSet: Set<string>) => void
 *  onReset      – () => void  — restore defaults
 */
export default function ColumnPicker({ allColumns, visibleKeys, onChange, onReset }) {
  const [open, setOpen] = useState(false);

  const toggle = (key) => {
    const next = new Set(visibleKeys);
    if (next.has(key)) {
      if (next.size === 1) return; // keep at least one
      next.delete(key);
    } else {
      next.add(key);
    }
    onChange(next);
  };

  const selectAll = () => onChange(new Set(allColumns.map((c) => c.key)));
  const hiddenCount = allColumns.length - visibleKeys.size;

  const content = (
    <div style={{ width: 240 }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text strong style={{ fontSize: 13 }}>
          Columns
          <Text type="secondary" style={{ fontWeight: 400, marginLeft: 6, fontSize: 12 }}>
            ({visibleKeys.size}/{allColumns.length} shown)
          </Text>
        </Text>
        <Space size={4}>
          <Tooltip title="Show all">
            <Button type="text" size="small" onClick={selectAll} style={{ fontSize: 12, padding: '0 6px' }}>All</Button>
          </Tooltip>
          <Tooltip title="Reset to default">
            <Button type="text" size="small" icon={<ReloadOutlined />} onClick={() => { onReset(); setOpen(false); }} />
          </Tooltip>
        </Space>
      </div>

      <Divider style={{ margin: '0 0 8px' }} />

      {/* column list */}
      <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {allColumns.map((col) => {
          const label = typeof col.title === 'string' ? col.title : col.columnTitle ?? col.key;
          return (
            <label
              key={col.key}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 6px', borderRadius: 6, cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(22,119,255,0.06)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Checkbox
                checked={visibleKeys.has(col.key)}
                onChange={() => toggle(col.key)}
              />
              <Text style={{ fontSize: 13, userSelect: 'none' }}>{label}</Text>
              {col.defaultVisible === false && (
                <Text type="secondary" style={{ fontSize: 10, marginLeft: 'auto' }}>extra</Text>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
      arrow={false}
      overlayStyle={{ padding: 0 }}
      overlayInnerStyle={{ padding: '14px 12px', borderRadius: 10 }}
    >
      <Badge count={hiddenCount} size="small" offset={[-2, 2]} color="#1677ff">
        <Tooltip title="Configure columns">
          <Button
            icon={<SettingOutlined />}
            style={{ borderRadius: 7, width: 32, padding: 0 }}
          />
        </Tooltip>
      </Badge>
    </Popover>
  );
}
