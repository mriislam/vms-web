import {
  AuditOutlined, CheckCircleOutlined, CloseCircleOutlined, DownloadOutlined,
  ReloadOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Button, Card, Col, DatePicker, Input, Row, Select, Spin, Table, Tag, Tooltip, Typography, message,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import ColumnPicker from '../components/ColumnPicker';
import PageHeader from '../components/PageHeader';
import { useColumnPicker } from '../hooks/useColumnPicker';
import { auditLogService } from '../services/auditLogService';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const MODULE_COLOR = {
  Auth:        '#1677ff',
  Vehicles:    '#52c41a',
  Drivers:     '#13c2c2',
  Dispatch:    '#fa8c16',
  Fuel:        '#ff4d4f',
  Maintenance: '#fa541c',
  Expenses:    '#13c2c2',
  Users:       '#722ed1',
  Roles:       '#eb2f96',
  Settings:    '#8c8c8c',
  Reports:     '#1677ff',
  Inventory:   '#a0d911',
  Leave:       '#eb2f96',
  Notices:     '#faad14',
};

const INITIAL_LOGS = [
  { key: 1,  timestamp: '2026-04-18 09:12:04', user: 'admin',     role: 'admin',    module: 'Auth',        action: 'Login',                  detail: 'Successful login from browser',             ip: '192.168.1.10',  status: 'success' },
  { key: 2,  timestamp: '2026-04-18 09:14:22', user: 'admin',     role: 'admin',    module: 'Vehicles',    action: 'Add Vehicle',            detail: 'Added vehicle DHK-9900 (Truck)',             ip: '192.168.1.10',  status: 'success' },
  { key: 3,  timestamp: '2026-04-18 09:18:55', user: 'fleet_mgr', role: 'manager',  module: 'Dispatch',    action: 'Approve Dispatch',       detail: 'Approved DSP-0106 — DHK-1234 to Sylhet',    ip: '192.168.1.15',  status: 'success' },
  { key: 4,  timestamp: '2026-04-18 09:22:10', user: 'ops_1',     role: 'operator', module: 'Fuel',        action: 'Add Fuel Record',        detail: 'Added 320L for CTG-0091 at ৳109/L',         ip: '192.168.1.21',  status: 'success' },
  { key: 5,  timestamp: '2026-04-18 09:30:44', user: 'fleet_mgr', role: 'manager',  module: 'Leave',       action: 'Approve Leave',          detail: 'Approved leave for Nasir Hossain (5 days)',  ip: '192.168.1.15',  status: 'success' },
  { key: 6,  timestamp: '2026-04-18 09:35:01', user: 'ops_2',     role: 'operator', module: 'Auth',        action: 'Login',                  detail: 'Failed login — invalid password',            ip: '10.0.0.42',     status: 'failed'  },
  { key: 7,  timestamp: '2026-04-18 09:36:12', user: 'ops_2',     role: 'operator', module: 'Auth',        action: 'Login',                  detail: 'Successful login after retry',              ip: '10.0.0.42',     status: 'success' },
  { key: 8,  timestamp: '2026-04-18 09:40:33', user: 'admin',     role: 'admin',    module: 'Users',       action: 'Create User',            detail: 'Created user ops_3 with role Operator',     ip: '192.168.1.10',  status: 'success' },
  { key: 9,  timestamp: '2026-04-18 09:45:17', user: 'admin',     role: 'admin',    module: 'Roles',       action: 'Edit Role Permissions',  detail: 'Updated permissions for Manager role',      ip: '192.168.1.10',  status: 'success' },
  { key: 10, timestamp: '2026-04-18 09:50:05', user: 'ops_1',     role: 'operator', module: 'Maintenance', action: 'Add Maintenance Record', detail: 'Scheduled oil change for SYL-3322',         ip: '192.168.1.21',  status: 'success' },
  { key: 11, timestamp: '2026-04-18 10:02:44', user: 'fleet_mgr', role: 'manager',  module: 'Reports',     action: 'Export Report',          detail: 'Exported Fuel Summary report as CSV',       ip: '192.168.1.15',  status: 'success' },
  { key: 12, timestamp: '2026-04-18 10:10:30', user: 'ops_1',     role: 'operator', module: 'Dispatch',    action: 'Create Dispatch',        detail: 'Created DSP-0107 — DHK-5678 to Rajshahi',   ip: '192.168.1.21',  status: 'success' },
  { key: 13, timestamp: '2026-04-18 10:18:09', user: 'admin',     role: 'admin',    module: 'Settings',    action: 'Update Settings',        detail: 'Changed Organisation Name and Timezone',    ip: '192.168.1.10',  status: 'success' },
  { key: 14, timestamp: '2026-04-18 10:25:55', user: 'viewer_1',  role: 'viewer',   module: 'Vehicles',    action: 'Delete Vehicle',         detail: 'Permission denied — insufficient role',     ip: '192.168.1.30',  status: 'failed'  },
  { key: 15, timestamp: '2026-04-18 10:30:22', user: 'fleet_mgr', role: 'manager',  module: 'Notices',     action: 'Post Notice',            detail: 'Posted "New Route Policy Effective May"',   ip: '192.168.1.15',  status: 'success' },
  { key: 16, timestamp: '2026-04-18 10:44:11', user: 'ops_1',     role: 'operator', module: 'Inventory',   action: 'Update Stock',           detail: 'Updated Engine Oil stock from 12 to 18',    ip: '192.168.1.21',  status: 'success' },
  { key: 17, timestamp: '2026-04-18 10:55:00', user: 'admin',     role: 'admin',    module: 'Users',       action: 'Disable User',           detail: 'Disabled user account ops_2',               ip: '192.168.1.10',  status: 'success' },
  { key: 18, timestamp: '2026-04-18 11:02:37', user: 'fleet_mgr', role: 'manager',  module: 'Expenses',    action: 'Add Expense',            detail: 'Added toll expense ৳12,800 (April)',         ip: '192.168.1.15',  status: 'success' },
  { key: 19, timestamp: '2026-04-18 11:14:48', user: 'ops_1',     role: 'operator', module: 'Fuel',        action: 'Edit Fuel Record',       detail: 'Corrected litres from 310 to 320 for CTG-0091', ip: '192.168.1.21', status: 'success' },
  { key: 20, timestamp: '2026-04-18 11:30:05', user: 'admin',     role: 'admin',    module: 'Auth',        action: 'Password Reset',         detail: 'Reset password for user ops_1',             ip: '192.168.1.10',  status: 'success' },
];

const roleColor = { admin: 'red', manager: 'orange', operator: 'blue', viewer: 'default' };

const COLUMNS_DEF = [
  {
    key: 'timestamp', columnTitle: 'Timestamp', title: 'Timestamp', dataIndex: 'timestamp', width: 160,
    render: (v) => <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>{v}</Text>,
  },
  {
    key: 'username', columnTitle: 'User', title: 'User', dataIndex: 'username', width: 120,
    render: (v) => <Text strong style={{ fontSize: 12 }}>{v}</Text>,
  },
  {
    key: 'module', columnTitle: 'Module', title: 'Module', dataIndex: 'module', width: 110,
    render: (v) => <Tag color={MODULE_COLOR[v] ?? 'default'} style={{ fontSize: 11 }}>{v}</Tag>,
  },
  {
    key: 'action', columnTitle: 'Action', title: 'Action', dataIndex: 'action', width: 170,
  },
  {
    key: 'detail', columnTitle: 'Detail', title: 'Detail', dataIndex: 'detail',
    render: (v) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>,
  },
  {
    key: 'ip', columnTitle: 'IP Address', title: 'IP Address', dataIndex: 'ip', width: 130,
    render: (v) => <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>{v}</Text>,
  },
  {
    key: 'role', columnTitle: 'Role', title: 'Role', dataIndex: 'role', width: 100,
    defaultVisible: false,
    render: (v) => <Tag color={roleColor[v]}>{v.toUpperCase()}</Tag>,
  },
  {
    key: 'status', columnTitle: 'Status', title: 'Status', dataIndex: 'status', width: 100,
    render: (s) => s === 'success'
      ? <Tag icon={<CheckCircleOutlined />} color="success">Success</Tag>
      : <Tag icon={<CloseCircleOutlined />} color="error">Failed</Tag>,
  },
];

function exportCSV(rows) {
  const cols = ['timestamp', 'user', 'role', 'module', 'action', 'detail', 'ip', 'status'];
  const header = cols.join(',');
  const body = rows.map((r) => cols.map((c) => `"${r[c] ?? ''}"`).join(',')).join('\n');
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AuditLog_${dayjs().format('YYYYMMDD_HHmm')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AuditLog() {
  const [search, setSearch]       = useState('');
  const [moduleFilter, setModule] = useState('all');
  const [statusFilter, setStatus] = useState('all');
  const [userFilter, setUser]     = useState('all');
  const [dateRange, setDateRange] = useState(null);

  const { data: rawData = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['audit-log'],
    queryFn: () => auditLogService.getAll().then((r) => r.data.data ?? []),
  });
  const data = rawData;

  const { visibleColumns, visibleKeys, setVisible, resetToDefault, allColumns } =
    useColumnPicker('audit-log', COLUMNS_DEF);

  function handleRefresh() {
    refetch().then(() => message.success('Audit log refreshed'));
  }

  const filtered = data.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q || r.action.toLowerCase().includes(q) || r.detail.toLowerCase().includes(q) || r.user.toLowerCase().includes(q)) &&
      (moduleFilter === 'all' || r.module === moduleFilter) &&
      (statusFilter === 'all' || r.status === statusFilter) &&
      (userFilter   === 'all' || r.user   === userFilter)
    );
  });

  const totalSuccess  = data.filter((r) => r.status === 'success').length;
  const totalFailed   = data.filter((r) => r.status === 'failed').length;
  const modules       = [...new Set(data.map((r) => r.module))].length;
  const uniqueModules = [...new Set(data.map((r) => r.module))];
  const uniqueUsers   = [...new Set(data.map((r) => r.user))];

  return (
    <div>
      <PageHeader
        icon={<AuditOutlined />}
        color="#722ed1"
        title="Audit Log"
        subtitle="System activity trail — all user actions and access events"
        stats={[
          { label: 'Total Events', value: data.length,    color: '#722ed1' },
          { label: 'Success',      value: totalSuccess,   color: '#52c41a' },
          { label: 'Failed',       value: totalFailed,    color: '#ff4d4f' },
          { label: 'Modules',      value: modules,        color: '#1677ff' },
        ]}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={isFetching}>
              Refresh
            </Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={() => { exportCSV(filtered); message.success('Audit log exported'); }}
              style={{ background: '#722ed1', borderColor: '#722ed1' }}>
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Card size="small" style={{ borderRadius: 12, marginBottom: 12 }}>
        <Row gutter={[12, 12]}>
          <Col flex="1">
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search action, detail or user…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col>
            <Select value={moduleFilter} onChange={setModule} style={{ width: 140 }}
              options={[{ value: 'all', label: 'All Modules' }, ...uniqueModules.map((m) => ({ value: m, label: m }))]} />
          </Col>
          <Col>
            <Select value={userFilter} onChange={setUser} style={{ width: 130 }}
              options={[{ value: 'all', label: 'All Users' }, ...uniqueUsers.map((u) => ({ value: u, label: u }))]} />
          </Col>
          <Col>
            <Select value={statusFilter} onChange={setStatus} style={{ width: 120 }}
              options={[
                { value: 'all',     label: 'All Status' },
                { value: 'success', label: 'Success' },
                { value: 'failed',  label: 'Failed' },
              ]} />
          </Col>
          <Col>
            <RangePicker size="default" value={dateRange} onChange={setDateRange} style={{ width: 220 }} />
          </Col>
        </Row>
      </Card>

      <Card size="small" style={{ borderRadius: 12 }}
        extra={<ColumnPicker allColumns={allColumns} visibleKeys={visibleKeys} onChange={setVisible} onReset={resetToDefault} />}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Showing {filtered.length} of {data.length} events</Text>
          <Tooltip title="Logs are retained for 90 days">
            <Text type="secondary" style={{ fontSize: 11, cursor: 'default' }}>Retention: 90 days</Text>
          </Tooltip>
        </div>
        <Spin spinning={isLoading}>
        <Table
          dataSource={filtered}
          columns={visibleColumns}
          size="small"
          rowKey="id"
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `${t} events` }}
          rowClassName={(r) => r.status === 'failed' ? 'audit-row-failed' : ''}
        />
        </Spin>
      </Card>

      <style>{`
        .audit-row-failed td { background: rgba(255, 77, 79, 0.04) !important; }
      `}</style>
    </div>
  );
}
