import {
  DeleteOutlined,
  EditOutlined,
  InfoCircleOutlined,
  LockOutlined,
  PlusOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useState } from 'react';

const { Title, Text } = Typography;

// ── constants ────────────────────────────────────────────────────────────────
const ACTIONS = ['view', 'create', 'edit', 'delete'];

const MODULES = [
  { key: 'dashboard',    label: 'Dashboard',       group: 'Overview' },
  { key: 'vehicles',     label: 'Vehicles',        group: 'Fleet' },
  { key: 'drivers',      label: 'Drivers',         group: 'Fleet' },
  { key: 'dispatch',     label: 'Dispatch',        group: 'Fleet' },
  { key: 'routes',       label: 'Routes',          group: 'Fleet' },
  { key: 'vts_map',      label: 'VTS Map',         group: 'Fleet' },
  { key: 'requisitions', label: 'Requisitions',    group: 'Operations' },
  { key: 'fuel',         label: 'Fuel',            group: 'Operations' },
  { key: 'maintenance',  label: 'Maintenance',     group: 'Operations' },
  { key: 'inventory',    label: 'Inventory',       group: 'Operations' },
  { key: 'parking',      label: 'Parking',         group: 'Operations' },
  { key: 'expenses',     label: 'Expenses',        group: 'Finance' },
  { key: 'vendors',      label: 'Vendors',         group: 'Finance' },
  { key: 'driver_leave', label: 'Driver Leave',    group: 'People' },
  { key: 'coordinators', label: 'Coordinators',    group: 'People' },
  { key: 'notices',      label: 'Notices',         group: 'People' },
  { key: 'reports',      label: 'Reports',         group: 'Analytics' },
  { key: 'insights',     label: 'Insights',        group: 'Analytics' },
  { key: 'user_admin',   label: 'User Admin',      group: 'System' },
  { key: 'role_perms',   label: 'Role Permissions',group: 'System' },
  { key: 'settings',     label: 'Settings',        group: 'System' },
];

const GROUPS = [...new Set(MODULES.map((m) => m.group))];

const GROUP_COLORS = {
  Overview: '#1677ff', Fleet: '#52c41a', Operations: '#fa8c16',
  Finance: '#13c2c2',  People: '#9254de', Analytics: '#eb2f96', System: '#ff4d4f',
};

// Custom-role palette cycled through when creating new roles
const CUSTOM_PALETTE = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];

const blankPerms = (allTrue = false) =>
  Object.fromEntries(MODULES.map((m) => [m.key, Object.fromEntries(ACTIONS.map((a) => [a, allTrue]))]));

// ── built-in roles ────────────────────────────────────────────────────────────
const BUILTIN_ROLES = [
  {
    key: 'admin', label: 'Admin', color: '#ff4d4f', locked: true,
    desc: 'Full system access — all modules, all actions.',
    perms: blankPerms(true),
  },
  {
    key: 'manager', label: 'Manager', color: '#fa8c16', locked: false,
    desc: 'Fleet and operational oversight. Cannot manage users or system settings.',
    perms: Object.fromEntries(MODULES.map((m) => {
      const restricted   = ['user_admin', 'role_perms', 'settings'].includes(m.key);
      const financeRead  = ['expenses', 'vendors'].includes(m.key);
      return [m.key, { view: !restricted, create: !restricted && !financeRead, edit: !restricted && !financeRead, delete: false }];
    })),
  },
  {
    key: 'operator', label: 'Operator', color: '#1677ff', locked: false,
    desc: 'Day-to-day operations. Read-only on financial and admin modules.',
    perms: Object.fromEntries(MODULES.map((m) => {
      const noAccess = ['user_admin','role_perms','settings','expenses','vendors','reports','insights'].includes(m.key);
      const readOnly = ['vehicles','drivers','routes','vts_map','coordinators'].includes(m.key);
      return [m.key, { view: !noAccess, create: !noAccess && !readOnly, edit: !noAccess && !readOnly, delete: false }];
    })),
  },
  {
    key: 'viewer', label: 'Viewer', color: '#52c41a', locked: false,
    desc: 'Read-only access across all permitted modules.',
    perms: Object.fromEntries(MODULES.map((m) => {
      const noAccess = ['user_admin','role_perms','settings'].includes(m.key);
      return [m.key, { view: !noAccess, create: false, edit: false, delete: false }];
    })),
  },
];

// ── helpers ───────────────────────────────────────────────────────────────────
const countViewable = (perms) => Object.values(perms).filter((p) => p.view).length;

// ── component ─────────────────────────────────────────────────────────────────
export default function RolePermissions() {
  const [roles, setRoles] = useState(BUILTIN_ROLES);
  const [activeKey, setActiveKey] = useState('admin');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = create, string key = edit
  const [form] = Form.useForm();

  const activeRole = roles.find((r) => r.key === activeKey) ?? roles[0];

  // ── permission toggles ──
  const togglePerm = (moduleKey, action) => {
    setRoles((prev) => prev.map((r) =>
      r.key !== activeKey ? r : {
        ...r,
        perms: {
          ...r.perms,
          [moduleKey]: { ...r.perms[moduleKey], [action]: !r.perms[moduleKey][action] },
        },
      }
    ));
  };

  const toggleAllForModule = (moduleKey, checked) => {
    setRoles((prev) => prev.map((r) =>
      r.key !== activeKey ? r : {
        ...r,
        perms: {
          ...r.perms,
          [moduleKey]: Object.fromEntries(ACTIONS.map((a) => [a, checked])),
        },
      }
    ));
  };

  // ── create / edit modal ──
  const openCreate = () => {
    setEditTarget(null);
    form.resetFields();
    form.setFieldValue('perms', 'none'); // preset
    setModalOpen(true);
  };

  const openEdit = (role) => {
    setEditTarget(role.key);
    form.setFieldsValue({ label: role.label, desc: role.desc });
    setModalOpen(true);
  };

  const handleModalOk = () => {
    form.validateFields().then((vals) => {
      if (editTarget) {
        // update label / desc only
        setRoles((prev) => prev.map((r) =>
          r.key === editTarget ? { ...r, label: vals.label, desc: vals.desc } : r
        ));
        message.success('Role updated');
      } else {
        // create new custom role
        const usedColors = roles.filter((r) => r.custom).map((r) => r.color);
        const color = CUSTOM_PALETTE.find((c) => !usedColors.includes(c)) ?? CUSTOM_PALETTE[0];
        const key = `custom_${Date.now()}`;
        const basePerms =
          vals.preset === 'all'    ? blankPerms(true)  :
          vals.preset === 'viewer' ? (() => {
            const vr = roles.find((r) => r.key === 'viewer');
            return JSON.parse(JSON.stringify(vr.perms));
          })() : blankPerms(false);

        setRoles((prev) => [
          ...prev,
          { key, label: vals.label, desc: vals.desc ?? '', color, locked: false, custom: true, perms: basePerms },
        ]);
        setActiveKey(key);
        message.success(`Custom role "${vals.label}" created`);
      }
      setModalOpen(false);
    });
  };

  const deleteRole = (key) => {
    setRoles((prev) => prev.filter((r) => r.key !== key));
    if (activeKey === key) setActiveKey('admin');
    message.success('Custom role deleted');
  };

  const handleSave = () => message.success(`Permissions saved for "${activeRole.label}"`);

  // ── table columns ──
  const columns = [
    {
      title: 'Module', dataIndex: 'label', key: 'label', width: 175,
      render: (label, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: GROUP_COLORS[record.group], display: 'inline-block' }} />
          <Text style={{ fontSize: 13 }}>{label}</Text>
        </div>
      ),
    },
    {
      title: () => (
        <Tooltip title="Toggle all actions for this module">
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            All <InfoCircleOutlined style={{ fontSize: 11, color: '#8c9ab0' }} />
          </span>
        </Tooltip>
      ),
      key: 'all', width: 58, align: 'center',
      render: (_, record) => {
        const p = activeRole.perms[record.key];
        const allChecked  = ACTIONS.every((a) => p[a]);
        const someChecked = ACTIONS.some((a) => p[a]);
        return (
          <Checkbox
            checked={allChecked}
            indeterminate={!allChecked && someChecked}
            onChange={(e) => toggleAllForModule(record.key, e.target.checked)}
            disabled={activeRole.locked}
          />
        );
      },
    },
    ...ACTIONS.map((action) => ({
      title: <Text style={{ textTransform: 'capitalize', fontSize: 13 }}>{action}</Text>,
      key: action, align: 'center', width: 78,
      render: (_, record) => (
        <Checkbox
          checked={activeRole.perms[record.key][action]}
          onChange={() => togglePerm(record.key, action)}
          disabled={activeRole.locked}
        />
      ),
    })),
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Role Permissions</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Manage access levels for each role across all modules
          </Text>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<PlusOutlined />} onClick={openCreate}>
            Create Custom Role
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            disabled={activeRole.locked}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Role cards */}
      <Row gutter={[10, 10]} style={{ marginBottom: 20 }}>
        {roles.map((role) => (
          <Col key={role.key} xs={12} sm={8} md={6} lg={4}>
            <Card
              hoverable
              onClick={() => setActiveKey(role.key)}
              style={{
                borderRadius: 12, cursor: 'pointer',
                border: activeKey === role.key ? `2px solid ${role.color}` : '2px solid transparent',
                background: activeKey === role.key ? `${role.color}10` : undefined,
                transition: 'all 0.18s',
              }}
              styles={{ body: { padding: '12px 14px' } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                    background: `${role.color}20`, border: `1px solid ${role.color}50`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {role.locked
                      ? <LockOutlined style={{ fontSize: 15, color: role.color }} />
                      : <span style={{ fontWeight: 900, fontSize: 14, color: role.color }}>{role.label[0]}</span>
                    }
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: role.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {role.label}
                    </div>
                    <div style={{ fontSize: 11, color: '#8c9ab0' }}>
                      {countViewable(role.perms)} modules
                    </div>
                  </div>
                </div>

                {/* custom role actions */}
                {role.custom && (
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0, marginLeft: 4 }} onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="Edit name">
                      <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(role)}
                        style={{ padding: '0 4px', height: 22 }} />
                    </Tooltip>
                    <Popconfirm
                      title="Delete this custom role?"
                      onConfirm={() => deleteRole(role.key)}
                      okText="Delete" okButtonProps={{ danger: true }}
                    >
                      <Tooltip title="Delete role">
                        <Button type="text" size="small" danger icon={<DeleteOutlined />}
                          style={{ padding: '0 4px', height: 22 }} />
                      </Tooltip>
                    </Popconfirm>
                  </div>
                )}
              </div>

              {role.custom && (
                <Tag style={{ marginTop: 6, fontSize: 10 }} color="purple">Custom</Tag>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      {/* Active role info banner */}
      <div style={{
        padding: '10px 16px', borderRadius: 8, marginBottom: 16,
        background: `${activeRole.color}12`,
        border: `1px solid ${activeRole.color}30`,
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        <Tag color={activeRole.color} style={{ margin: 0, fontWeight: 700 }}>
          {activeRole.label.toUpperCase()}
        </Tag>
        <Text style={{ fontSize: 13, flex: 1 }}>{activeRole.desc || 'No description set.'}</Text>
        {activeRole.locked && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            <LockOutlined style={{ marginRight: 4 }} />
            Locked — Admin always has full access
          </Text>
        )}
      </div>

      {/* Permission tables per group */}
      {GROUPS.map((group, gi) => {
        const groupModules = MODULES.filter((m) => m.group === group);
        return (
          <Card
            key={group}
            size="small"
            style={{ borderRadius: 12, marginBottom: 10, borderLeft: `3px solid ${GROUP_COLORS[group]}` }}
            styles={{ body: { padding: 0 } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: GROUP_COLORS[group], display: 'inline-block' }} />
                <Text strong style={{ fontSize: 13 }}>{group}</Text>
                <Tag color={GROUP_COLORS[group]} style={{ margin: 0, fontSize: 11 }}>{groupModules.length}</Tag>
              </div>
            }
          >
            <Table
              dataSource={groupModules}
              columns={columns}
              pagination={false}
              size="small"
              rowKey="key"
              showHeader={gi === 0}
            />
          </Card>
        );
      })}

      {/* Create / Edit modal */}
      <Modal
        title={editTarget ? 'Edit Role' : 'Create Custom Role'}
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={() => setModalOpen(false)}
        okText={editTarget ? 'Update' : 'Create Role'}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="label"
            label="Role Name"
            rules={[
              { required: true, message: 'Please enter a role name' },
              { max: 32, message: 'Max 32 characters' },
            ]}
          >
            <Input placeholder="e.g. Auditor, Fleet Supervisor, Region Manager" />
          </Form.Item>

          <Form.Item name="desc" label="Description">
            <Input.TextArea
              rows={2}
              placeholder="Briefly describe what this role can do..."
            />
          </Form.Item>

          {!editTarget && (
            <Form.Item
              name="preset"
              label="Start permissions from"
              initialValue="none"
              rules={[{ required: true }]}
            >
              <Row gutter={[8, 8]}>
                {[
                  { value: 'none',   label: 'Blank',        desc: 'No access by default',       color: '#8c8c8c' },
                  { value: 'viewer', label: 'Copy Viewer',  desc: 'Read-only as starting point', color: '#52c41a' },
                  { value: 'all',    label: 'Full Access',  desc: 'All permissions enabled',     color: '#ff4d4f' },
                ].map((opt) => (
                  <Col span={8} key={opt.value}>
                    <Form.Item noStyle shouldUpdate>
                      {({ getFieldValue, setFieldValue }) => {
                        const selected = getFieldValue('preset') === opt.value;
                        return (
                          <div
                            onClick={() => setFieldValue('preset', opt.value)}
                            style={{
                              padding: '10px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                              border: selected ? `2px solid ${opt.color}` : '2px solid rgba(128,128,128,0.2)',
                              background: selected ? `${opt.color}12` : 'transparent',
                              transition: 'all 0.15s',
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: 13, color: opt.color }}>{opt.label}</div>
                            <div style={{ fontSize: 11, color: '#8c9ab0', marginTop: 2 }}>{opt.desc}</div>
                          </div>
                        );
                      }}
                    </Form.Item>
                  </Col>
                ))}
              </Row>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
