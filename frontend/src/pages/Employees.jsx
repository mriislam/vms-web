import {
  DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined,
  TeamOutlined, UserOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Avatar, Badge, Button, Col, Form, Input, Popconfirm, Row,
  Select, Spin, Table, Tag, Typography, message,
} from 'antd';
import { useState } from 'react';
import ColumnPicker from '../components/ColumnPicker';
import FormModal, { FormSection } from '../components/FormModal';
import PageHeader from '../components/PageHeader';
import { useApiCrud } from '../hooks/useApiCrud';
import { useColumnPicker } from '../hooks/useColumnPicker';
import { departmentService } from '../services/departmentService';
import { userService } from '../services/userService';
import { statusColor } from '../utils/helpers';

const { Text } = Typography;

const ROLES = [
  { value: 'admin',    label: 'Admin'    },
  { value: 'manager',  label: 'Manager'  },
  { value: 'operator', label: 'Operator' },
  { value: 'driver',   label: 'Driver'   },
  { value: 'viewer',   label: 'Viewer'   },
];
const roleColor = {
  admin: 'red', manager: 'blue', operator: 'green',
  driver: 'cyan', viewer: 'default',
};

function initials(name = '') {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}
function avatarColor(name = '') {
  const colors = ['#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#13c2c2', '#eb2f96'];
  return colors[name.charCodeAt(0) % colors.length];
}

const COLS_DEF = [
  {
    key: 'fullName', columnTitle: 'Employee', title: 'Employee', dataIndex: 'fullName',
    render: (name, r) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar size={32} style={{ background: avatarColor(name), fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
          {initials(name)}
        </Avatar>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
          <div style={{ fontSize: 11, color: '#888' }}>{r.username}</div>
        </div>
      </div>
    ),
  },
  { key: 'email',      columnTitle: 'Email',      title: 'Email',      dataIndex: 'email' },
  { key: 'phone',      columnTitle: 'Phone',      title: 'Phone',      dataIndex: 'phone',      render: v => v ?? '—' },
  {
    key: 'department', columnTitle: 'Department', title: 'Department', dataIndex: 'department',
    render: d => d ? <Tag color="purple" style={{ borderRadius: 20 }}>{d}</Tag> : '—',
  },
  {
    key: 'role', columnTitle: 'Role', title: 'Role', dataIndex: 'role',
    render: r => <Tag color={roleColor[r] ?? 'default'} style={{ borderRadius: 20 }}>{r?.toUpperCase()}</Tag>,
  },
  {
    key: 'status', columnTitle: 'Status', title: 'Status', dataIndex: 'status',
    render: s => (
      <Badge
        status={s === 'active' ? 'success' : 'default'}
        text={<Text style={{ fontSize: 12 }}>{s?.charAt(0).toUpperCase() + s?.slice(1)}</Text>}
      />
    ),
  },
];

export default function Employees() {
  const [search,     setSearch]     = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [form] = Form.useForm();

  const { data, isLoading, save, remove, isSaving } = useApiCrud('employees', userService, {
    onSaveSuccess: () => setModalOpen(false),
  });

  // Load departments from API
  const { data: departments = [] } = useQuery({
    queryKey: ['departments-active'],
    queryFn:  () => departmentService.getActive().then(r => r.data?.data ?? []),
  });

  const deptOptions = departments.map(d => ({ value: d.name, label: d.name }));

  const { visibleColumns, visibleKeys, setVisible, resetToDefault, allColumns } =
    useColumnPicker('employees', COLS_DEF);

  const columns = [
    ...visibleColumns,
    {
      title: 'Actions', key: 'actions', fixed: 'right', width: 100,
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 2 }}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm
            title={`Remove ${r.fullName}?`}
            description="This will delete their account permanently."
            okText="Remove" okButtonProps={{ danger: true }}
            onConfirm={() => remove(r.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  const filtered = data.filter(u => {
    const q = search.toLowerCase();
    return (
      (!q || u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q))
      && (deptFilter === 'all' || u.department === deptFilter)
      && (roleFilter === 'all' || u.role === roleFilter)
    );
  });

  function openAdd()   { setEditRecord(null); form.resetFields(); setModalOpen(true); }
  function openEdit(r) {
    setEditRecord(r);
    form.setFieldsValue({ fullName: r.fullName, username: r.username, email: r.email, phone: r.phone, department: r.department, role: r.role, status: r.status });
    setModalOpen(true);
  }

  function handleSubmit() {
    form.validateFields().then(v => {
      const payload = editRecord ? { ...v } : { ...v, password: 'Welcome@123' };
      save(editRecord?.id ?? null, payload);
    });
  }

  const active   = data.filter(u => u.status === 'active').length;
  const managers = data.filter(u => u.role === 'manager').length;

  return (
    <div>
      <PageHeader
        icon={<TeamOutlined />} color="#9254de"
        title="Employees"
        subtitle="Manage employee accounts — active employees appear in the booking requester list"
        stats={[
          { label: 'Total',    value: data.length, color: '#9254de' },
          { label: 'Active',   value: active,       color: '#52c41a' },
          { label: 'Managers', value: managers,     color: '#1677ff' },
        ]}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}
            style={{ background: '#9254de', borderColor: '#9254de' }}>
            Add Employee
          </Button>
        }
      />

      <div style={{
        background: '#fff', borderRadius: 14,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 18px', borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex', gap: 10, alignItems: 'center',
          background: 'rgba(248,249,252,0.8)',
        }}>
          <Input
            placeholder="Search name, username, email…"
            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: 260, borderRadius: 8 }} allowClear
          />
          <Select value={deptFilter} onChange={setDeptFilter} style={{ width: 160 }}
            options={[{ value: 'all', label: 'All Depts' }, ...deptOptions]} />
          <Select value={roleFilter} onChange={setRoleFilter} style={{ width: 130 }}
            options={[{ value: 'all', label: 'All Roles' }, ...ROLES]} />
          <Badge count={filtered.length} showZero color="#9254de">
            <span style={{ fontSize: 12, color: '#999', paddingRight: 8 }}>found</span>
          </Badge>
          <div style={{ marginLeft: 'auto' }}>
            <ColumnPicker allColumns={allColumns} visibleKeys={visibleKeys} onChange={setVisible} onReset={resetToDefault} />
          </div>
        </div>

        <Spin spinning={isLoading}>
          <Table
            dataSource={filtered} columns={columns} size="small"
            scroll={{ x: 'max-content' }} rowKey="id"
            pagination={{
              pageSize: 15, showSizeChanger: true,
              showTotal: (t, r) => `${r[0]}–${r[1]} of ${t} employees`,
              pageSizeOptions: ['15', '30', '50'],
              style: { padding: '10px 18px' },
            }}
          />
        </Spin>
      </div>

      <FormModal
        open={modalOpen} onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit} confirmLoading={isSaving}
        icon={<UserOutlined />} color="#9254de"
        title={editRecord ? `Edit — ${editRecord.fullName}` : 'Add New Employee'}
        subtitle={editRecord ? 'Update employee profile' : 'New employee gets default password: Welcome@123'}
        okText={editRecord ? 'Save Changes' : 'Add Employee'} width={620}
      >
        <Form form={form} layout="vertical" size="small">
          <FormSection title="Personal Info" color="#9254de">
            <Row gutter={14}>
              <Col span={14}>
                <Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}>
                  <Input placeholder="e.g. Mohammad Rahim Uddin" style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
              <Col span={10}>
                <Form.Item name="username" label="Username" rules={[{ required: true }]}>
                  <Input placeholder="e.g. rahim.uddin" disabled={!!editRecord} style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={14}>
              <Col span={14}>
                <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                  <Input placeholder="name@company.com" style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
              <Col span={10}>
                <Form.Item name="phone" label="Phone">
                  <Input placeholder="01X-XXXXXXX" style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>

          <FormSection title="Role &amp; Access" color="#1677ff">
            <Row gutter={14}>
              <Col span={10}>
                <Form.Item name="department" label="Department" rules={[{ required: true }]}>
                  <Select showSearch placeholder="Select department"
                    filterOption={(input, opt) => opt?.label?.toLowerCase().includes(input.toLowerCase())}
                    options={deptOptions}
                    notFoundContent={
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>
                        No departments — add some under People → Departments
                      </span>
                    }
                  />
                </Form.Item>
              </Col>
              <Col span={7}>
                <Form.Item name="role" label="Role" rules={[{ required: true }]} initialValue="operator">
                  <Select options={ROLES} />
                </Form.Item>
              </Col>
              <Col span={7}>
                <Form.Item name="status" label="Status" initialValue="active">
                  <Select options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>
        </Form>
      </FormModal>
    </div>
  );
}
