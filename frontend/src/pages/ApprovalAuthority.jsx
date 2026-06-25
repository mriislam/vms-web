import {
  DeleteOutlined, EditOutlined, PlusOutlined, SafetyOutlined, SearchOutlined,
} from '@ant-design/icons';
import {
  Button, Card, Col, Descriptions, Drawer, Form, Input,
  InputNumber, Popconfirm, Row, Select, Switch, Table, Tag, message,
} from 'antd';
import { useState } from 'react';
import FormModal, { FormSection } from '../components/FormModal';
import PageHeader from '../components/PageHeader';

const DEPTS         = ['HQ', 'HR', 'Finance', 'Operations', 'IT', 'Admin', 'Logistics', 'All'];
const LEVEL_COLOR   = { 1: 'blue', 2: 'purple', 3: 'red' };
const SCOPE_COLOR   = { department: 'cyan', zone: 'green', all: 'orange' };

const MOCK_DATA = [
  { id: 0, name: 'Administrator',        designation: 'System Admin',     department: 'All',         level: 3, scope: 'all',        maxVehicles: 50, active: true,  email: 'admin@nexdecade.com',    phone: '—' },
  { id: 1, name: 'Md. Rafiqul Islam',   designation: 'Fleet Manager',   department: 'Operations', level: 1, scope: 'all',        maxVehicles: 10, active: true,  email: 'rafiq@nexdecade.com',    phone: '01711-000001' },
  { id: 2, name: 'Sultana Begum',        designation: 'Admin Head',       department: 'Admin',       level: 2, scope: 'department', maxVehicles: 5,  active: true,  email: 'sultana@nexdecade.com',  phone: '01711-000002' },
  { id: 3, name: 'Karim Hossain',        designation: 'Operations Lead',  department: 'Operations', level: 1, scope: 'department', maxVehicles: 3,  active: true,  email: 'karim@nexdecade.com',    phone: '01711-000003' },
  { id: 4, name: 'Nasrin Akter',         designation: 'HR Manager',       department: 'HR',          level: 2, scope: 'department', maxVehicles: 2,  active: false, email: 'nasrin@nexdecade.com',   phone: '01711-000004' },
  { id: 5, name: 'Abdul Matin',          designation: 'Finance Director', department: 'Finance',     level: 3, scope: 'zone',       maxVehicles: 8,  active: true,  email: 'matin@nexdecade.com',    phone: '01711-000005' },
];

export default function ApprovalAuthority() {
  const [data, setData]                 = useState(MOCK_DATA);
  const [search, setSearch]             = useState('');
  const [modalOpen, setModalOpen]       = useState(false);
  const [editRecord, setEditRecord]     = useState(null);
  const [viewRecord, setViewRecord]     = useState(null);
  const [form] = Form.useForm();

  const columns = [
    {
      title: 'Name', dataIndex: 'name', key: 'name',
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div>
          <div style={{ fontSize: 11, color: '#8c8c8c' }}>{r.designation}</div>
        </div>
      ),
    },
    { title: 'Department', dataIndex: 'department', key: 'department', render: (v) => <Tag color="blue">{v}</Tag> },
    {
      title: 'Approval Level', dataIndex: 'level', key: 'level',
      render: (v) => <Tag color={LEVEL_COLOR[v]}>Level {v}</Tag>,
    },
    {
      title: 'Scope', dataIndex: 'scope', key: 'scope',
      render: (v) => <Tag color={SCOPE_COLOR[v]}>{v?.replace(/_/g, ' ').toUpperCase()}</Tag>,
    },
    {
      title: 'Max Vehicles', dataIndex: 'maxVehicles', key: 'maxVehicles',
      render: (v) => <Tag>{v} vehicle{v > 1 ? 's' : ''}</Tag>,
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
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Remove this authority?" okText="Remove" okButtonProps={{ danger: true }}
            onConfirm={() => { setData((prev) => prev.filter((d) => d.id !== r.id)); message.success('Authority removed'); }}>
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

  function openAdd()   { setEditRecord(null); form.resetFields(); form.setFieldsValue({ active: true, level: 1, scope: 'department', maxVehicles: 1 }); setModalOpen(true); }
  function openEdit(r) { setEditRecord(r); form.setFieldsValue(r); setModalOpen(true); }

  function handleSubmit() {
    form.validateFields().then((v) => {
      if (editRecord) {
        setData((prev) => prev.map((d) => d.id === editRecord.id ? { ...d, ...v } : d));
        message.success('Authority updated');
      } else {
        setData((prev) => [...prev, { ...v, id: Date.now() }]);
        message.success('Authority added');
      }
      setModalOpen(false);
    });
  }

  const active = data.filter((d) => d.active).length;

  return (
    <div>
      <PageHeader
        icon={<SafetyOutlined />} color="#cf1322" title="Approval Authority"
        subtitle="Configure who can approve vehicle booking requests and at what level"
        stats={[
          { label: 'Total Approvers', value: data.length, color: '#cf1322' },
          { label: 'Active',          value: active,       color: '#52c41a' },
          { label: 'Inactive',        value: data.length - active, color: '#8c8c8c' },
        ]}
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add Authority</Button>}
      />

      <Card size="small" style={{ borderRadius: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
          <Input placeholder="Search by name, department…" prefix={<SearchOutlined />}
            value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 260 }} allowClear />
        </div>
        <Table dataSource={filtered} columns={columns} size="small" scroll={{ x: 'max-content' }} rowKey="id" pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}`, pageSizeOptions: ['10', '25', '50', '100'] }} />
      </Card>

      <FormModal
        open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSubmit}
        icon={<SafetyOutlined />} color="#cf1322"
        title={editRecord ? `Edit — ${editRecord.name}` : 'Add Approval Authority'}
        subtitle={editRecord ? 'Update the approver details and permissions' : 'Define a new booking approval authority'}
        okText={editRecord ? 'Update' : 'Add Authority'} width={700}
      >
        <Form form={form} layout="vertical" size="small">
          <FormSection title="Approver Details" color="#cf1322">
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
                    { value: 'zone',       label: 'Zone-wide' },
                    { value: 'all',        label: 'All Departments' },
                  ]} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="maxVehicles" label="Max Vehicles / Booking" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} min={1} max={50} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="active" label="Status" valuePropName="checked">
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
          </FormSection>
        </Form>
      </FormModal>

      <Drawer open={!!viewRecord} onClose={() => setViewRecord(null)}
        title={viewRecord ? viewRecord.name : ''} width={420}>
        {viewRecord && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Name"        >{viewRecord.name}</Descriptions.Item>
            <Descriptions.Item label="Designation" >{viewRecord.designation}</Descriptions.Item>
            <Descriptions.Item label="Department"  ><Tag color="blue">{viewRecord.department}</Tag></Descriptions.Item>
            <Descriptions.Item label="Level"       ><Tag color={LEVEL_COLOR[viewRecord.level]}>Level {viewRecord.level}</Tag></Descriptions.Item>
            <Descriptions.Item label="Scope"       ><Tag color={SCOPE_COLOR[viewRecord.scope]}>{viewRecord.scope?.toUpperCase()}</Tag></Descriptions.Item>
            <Descriptions.Item label="Max Vehicles"><Tag>{viewRecord.maxVehicles}</Tag></Descriptions.Item>
            <Descriptions.Item label="Email"       >{viewRecord.email}</Descriptions.Item>
            <Descriptions.Item label="Phone"       >{viewRecord.phone}</Descriptions.Item>
            <Descriptions.Item label="Status"      ><Tag color={viewRecord.active ? 'green' : 'default'}>{viewRecord.active ? 'Active' : 'Inactive'}</Tag></Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
