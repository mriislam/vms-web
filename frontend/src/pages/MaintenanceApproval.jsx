import {
  DeleteOutlined, EditOutlined, EyeOutlined,
  FileProtectOutlined, PlusOutlined, SearchOutlined,
} from '@ant-design/icons';
import {
  Button, Card, Col, Descriptions, Drawer, Form, Input,
  InputNumber, Popconfirm, Row, Select, Switch, Table, Tag, message,
} from 'antd';
import { useState } from 'react';
import FormModal, { FormSection } from '../components/FormModal';
import PageHeader from '../components/PageHeader';

const DEPTS = ['HQ', 'HR', 'Finance', 'Operations', 'IT', 'Admin', 'Logistics', 'Maintenance', 'All'];

const LEVEL_COLOR = { 1: 'blue', 2: 'purple', 3: 'red' };
const SCOPE_COLOR = { department: 'cyan', fleet: 'green', all: 'orange' };

const MAINT_TYPES = [
  'Oil Change', 'Tire Rotation', 'Brake Service', 'Engine Repair',
  'Electrical', 'Body Work', 'General Inspection', 'All Types',
];

const MOCK_DATA = [
  { id: 1, name: 'Md. Rafiqul Islam',  designation: 'Fleet Manager',       department: 'Operations', level: 1, scope: 'all',        costLimit: 500000, maintTypes: ['All Types'],          active: true,  email: 'rafiq@nexdecade.com',   phone: '01711-000001' },
  { id: 2, name: 'Karim Hossain',      designation: 'Workshop Supervisor',  department: 'Maintenance',level: 1, scope: 'department', costLimit: 100000, maintTypes: ['Oil Change', 'Tire Rotation', 'General Inspection'], active: true, email: 'karim@nexdecade.com',   phone: '01711-000003' },
  { id: 3, name: 'Abdul Matin',        designation: 'Finance Director',     department: 'Finance',    level: 2, scope: 'fleet',      costLimit: 300000, maintTypes: ['Engine Repair', 'Body Work', 'Electrical'],          active: true, email: 'matin@nexdecade.com',   phone: '01711-000005' },
  { id: 4, name: 'Nasrin Akter',       designation: 'Operations Manager',   department: 'Operations', level: 2, scope: 'department', costLimit: 200000, maintTypes: ['All Types'],          active: false, email: 'nasrin@nexdecade.com',  phone: '01711-000004' },
  { id: 5, name: 'Sultana Begum',      designation: 'Admin Head',           department: 'Admin',      level: 3, scope: 'all',        costLimit: 1000000,maintTypes: ['All Types'],          active: true,  email: 'sultana@nexdecade.com', phone: '01711-000002' },
];

export default function MaintenanceApproval() {
  const [data, setData]             = useState(MOCK_DATA);
  const [search, setSearch]         = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [form] = Form.useForm();

  const columns = [
    {
      title: 'Approver', dataIndex: 'name', key: 'name',
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div>
          <div style={{ fontSize: 11, color: '#8c8c8c' }}>{r.designation}</div>
        </div>
      ),
    },
    {
      title: 'Department', dataIndex: 'department', key: 'department',
      render: (v) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Approval Level', dataIndex: 'level', key: 'level',
      render: (v) => <Tag color={LEVEL_COLOR[v]}>Level {v}</Tag>,
    },
    {
      title: 'Scope', dataIndex: 'scope', key: 'scope',
      render: (v) => <Tag color={SCOPE_COLOR[v]}>{v?.toUpperCase()}</Tag>,
    },
    {
      title: 'Cost Limit (৳)', dataIndex: 'costLimit', key: 'costLimit',
      render: (v) => <span style={{ fontWeight: 500 }}>৳ {Number(v).toLocaleString()}</span>,
    },
    {
      title: 'Maintenance Types', dataIndex: 'maintTypes', key: 'maintTypes',
      render: (arr) => arr?.includes('All Types')
        ? <Tag color="orange">All Types</Tag>
        : arr?.map((t) => <Tag key={t} style={{ marginBottom: 2 }}>{t}</Tag>),
    },
    {
      title: 'Status', dataIndex: 'active', key: 'active',
      render: (v, r) => (
        <Switch size="small" checked={v}
          onChange={(checked) => {
            setData((prev) => prev.map((d) => d.id === r.id ? { ...d, active: checked } : d));
            message.success(`${r.name} ${checked ? 'activated' : 'deactivated'}`);
          }}
        />
      ),
    },
    {
      title: 'Actions', key: 'actions', width: 100, fixed: 'right',
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 2 }}>
          <Button type="link" size="small" icon={<EyeOutlined />}  onClick={() => setViewRecord(r)} />
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Remove this approver?" okText="Remove" okButtonProps={{ danger: true }}
            onConfirm={() => { setData((prev) => prev.filter((d) => d.id !== r.id)); message.success('Approver removed'); }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  const filtered = data.filter((d) => {
    const q = search.toLowerCase();
    return !q || d.name?.toLowerCase().includes(q) || d.department?.toLowerCase().includes(q) || d.designation?.toLowerCase().includes(q);
  });

  function openAdd() {
    setEditRecord(null);
    form.resetFields();
    form.setFieldsValue({ active: true, level: 1, scope: 'department', costLimit: 100000, maintTypes: ['All Types'] });
    setModalOpen(true);
  }
  function openEdit(r) { setEditRecord(r); form.setFieldsValue(r); setModalOpen(true); }

  function handleSubmit() {
    form.validateFields().then((v) => {
      if (editRecord) {
        setData((prev) => prev.map((d) => d.id === editRecord.id ? { ...d, ...v } : d));
        message.success('Approver updated');
      } else {
        setData((prev) => [...prev, { ...v, id: Date.now() }]);
        message.success('Approver added');
      }
      setModalOpen(false);
    });
  }

  const active = data.filter((d) => d.active).length;

  return (
    <div>
      <PageHeader
        icon={<FileProtectOutlined />} color="#7cb305" title="Maintenance Approver"
        subtitle="Configure who is authorised to approve maintenance requests and their approval limits"
        stats={[
          { label: 'Total Approvers', value: data.length,          color: '#7cb305' },
          { label: 'Active',          value: active,               color: '#52c41a' },
          { label: 'Inactive',        value: data.length - active, color: '#8c8c8c' },
        ]}
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add Approver</Button>}
      />

      <Card size="small" style={{ borderRadius: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
          <Input placeholder="Search by name, department…" prefix={<SearchOutlined />}
            value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 260 }} allowClear />
        </div>
        <Table dataSource={filtered} columns={columns} size="small" scroll={{ x: 'max-content' }} rowKey="id" pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}`, pageSizeOptions: ['10', '25', '50', '100'] }} />
      </Card>

      {/* ── Add / Edit Modal ── */}
      <FormModal
        open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSubmit}
        icon={<FileProtectOutlined />} color="#7cb305"
        title={editRecord ? `Edit — ${editRecord.name}` : 'Add Maintenance Approver'}
        subtitle={editRecord ? 'Update the approver details and permissions' : 'Define a new authorised maintenance approver'}
        okText={editRecord ? 'Update' : 'Add Approver'} width={720}
      >
        <Form form={form} layout="vertical" size="small">
          <FormSection title="Approver Details" color="#7cb305">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="designation" label="Designation" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="department" label="Department" rules={[{ required: true }]}>
                  <Select options={DEPTS.map((d) => ({ value: d, label: d }))} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="email" label="Email">
                  <Input type="email" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="phone" label="Phone">
                  <Input />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>

          <FormSection title="Approval Permissions" color="#1677ff">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="level" label="Approval Level" rules={[{ required: true }]}>
                  <Select options={[
                    { value: 1, label: 'Level 1 — Basic' },
                    { value: 2, label: 'Level 2 — Senior' },
                    { value: 3, label: 'Level 3 — Executive' },
                  ]} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="scope" label="Approval Scope" rules={[{ required: true }]}>
                  <Select options={[
                    { value: 'department', label: 'Department Only' },
                    { value: 'fleet',      label: 'Fleet-wide' },
                    { value: 'all',        label: 'All Departments' },
                  ]} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="costLimit" label="Max Cost Limit (৳)" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} min={0} step={10000}
                    formatter={(v) => `৳ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(v) => v.replace(/৳\s?|(,*)/g, '')} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="maintTypes" label="Authorised Maintenance Types" rules={[{ required: true }]}>
              <Select mode="multiple" options={MAINT_TYPES.map((t) => ({ value: t, label: t }))}
                placeholder="Select types this approver can authorise…" />
            </Form.Item>
            <Form.Item name="active" label="Status" valuePropName="checked">
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
          </FormSection>
        </Form>
      </FormModal>

      {/* ── View Drawer ── */}
      <Drawer open={!!viewRecord} onClose={() => setViewRecord(null)}
        title={viewRecord ? viewRecord.name : ''} width={440}>
        {viewRecord && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Name"        >{viewRecord.name}</Descriptions.Item>
            <Descriptions.Item label="Designation" >{viewRecord.designation}</Descriptions.Item>
            <Descriptions.Item label="Department"  ><Tag color="blue">{viewRecord.department}</Tag></Descriptions.Item>
            <Descriptions.Item label="Level"       ><Tag color={LEVEL_COLOR[viewRecord.level]}>Level {viewRecord.level}</Tag></Descriptions.Item>
            <Descriptions.Item label="Scope"       ><Tag color={SCOPE_COLOR[viewRecord.scope]}>{viewRecord.scope?.toUpperCase()}</Tag></Descriptions.Item>
            <Descriptions.Item label="Cost Limit"  >৳ {Number(viewRecord.costLimit).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="Types">
              {viewRecord.maintTypes?.includes('All Types')
                ? <Tag color="orange">All Types</Tag>
                : viewRecord.maintTypes?.map((t) => <Tag key={t}>{t}</Tag>)}
            </Descriptions.Item>
            <Descriptions.Item label="Email"       >{viewRecord.email ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Phone"       >{viewRecord.phone ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Status"      >
              <Tag color={viewRecord.active ? 'green' : 'default'}>{viewRecord.active ? 'Active' : 'Inactive'}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
