import {
  BuildOutlined, CheckCircleOutlined, DeleteOutlined,
  EditOutlined, GlobalOutlined, PlusOutlined, TeamOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge, Button, Card, Col, Form, Input, Modal, Popconfirm,
  Row, Select, Space, Statistic, Table, Tag, Tooltip, message,
} from 'antd';
import { useState } from 'react';
import { tenantService } from '../services/tenantService';

const PLAN_COLOR   = { starter: 'blue', professional: 'purple', enterprise: 'gold' };
const STATUS_COLOR = { active: 'success', trial: 'processing', suspended: 'error', cancelled: 'default' };

export default function SuperAdmin() {
  const qc = useQueryClient();
  const [modalOpen,    setModalOpen]    = useState(false);
  const [provModal,    setProvModal]    = useState(false);
  const [editRecord,   setEditRecord]   = useState(null);
  const [provTenant,   setProvTenant]   = useState(null);
  const [form]  = Form.useForm();
  const [pform] = Form.useForm();

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['super-tenants'],
    queryFn: () => tenantService.getAll().then(r => r.data?.data ?? []),
  });

  const saveMut = useMutation({
    mutationFn: ({ id, data }) => id ? tenantService.update(id, data) : tenantService.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['super-tenants'] }); setModalOpen(false); message.success('Saved'); },
    onError:   () => message.error('Save failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => tenantService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['super-tenants'] }); message.success('Deleted'); },
  });

  const provMut = useMutation({
    mutationFn: ({ id, data }) => tenantService.provision(id, data),
    onSuccess: () => { setProvModal(false); message.success('Admin user created — password: Welcome@123'); },
    onError: (e) => message.error(e?.response?.data?.message ?? 'Provision failed'),
  });

  function openAdd()   { setEditRecord(null); form.resetFields(); setModalOpen(true); }
  function openEdit(r) {
    setEditRecord(r);
    form.setFieldsValue({ name: r.name, slug: r.slug, plan: r.plan, status: r.status,
      contactEmail: r.contactEmail, contactPhone: r.contactPhone, address: r.address,
      maxUsers: r.maxUsers, maxVehicles: r.maxVehicles });
    setModalOpen(true);
  }
  function openProv(r) { setProvTenant(r); pform.resetFields(); setProvModal(true); }

  const active    = tenants.filter(t => t.status === 'active').length;
  const trial     = tenants.filter(t => t.status === 'trial').length;

  const columns = [
    {
      title: 'Organization', dataIndex: 'name', key: 'name',
      render: (name, r) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>
          <code style={{ fontSize: 11, color: '#6366f1', background: '#eef2ff', padding: '1px 6px', borderRadius: 4 }}>
            /{r.slug}
          </code>
        </div>
      ),
    },
    {
      title: 'Plan', dataIndex: 'plan', key: 'plan', width: 120,
      render: p => <Tag color={PLAN_COLOR[p] ?? 'default'}>{p?.toUpperCase()}</Tag>,
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 110,
      render: s => <Badge status={STATUS_COLOR[s] ?? 'default'} text={s} />,
    },
    { title: 'Contact', dataIndex: 'contactEmail', key: 'email', render: v => v ?? '—' },
    {
      title: 'Limits', key: 'limits',
      render: (_, r) => <span style={{ fontSize: 12, color: '#64748b' }}>{r.maxUsers}u / {r.maxVehicles}v</span>,
    },
    {
      title: 'Actions', key: 'actions', fixed: 'right', width: 140,
      render: (_, r) => (
        <Space>
          <Tooltip title="Provision admin user">
            <Button size="small" icon={<TeamOutlined />} onClick={() => openProv(r)} />
          </Tooltip>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title={`Delete ${r.name}?`} okButtonProps={{ danger: true }} onConfirm={() => deleteMut.mutate(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GlobalOutlined style={{ color: '#fff', fontSize: 20 }} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#1e293b', letterSpacing: '-0.02em' }}>Super Admin Portal</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Manage all NEXVMS tenants</div>
          </div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}
          style={{ background: '#6366f1', borderColor: '#6366f1', borderRadius: 10, fontWeight: 700 }}>
          New Tenant
        </Button>
      </div>

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        {[
          { title: 'Total Tenants', value: tenants.length, color: '#6366f1', icon: <BuildOutlined /> },
          { title: 'Active',        value: active,          color: '#10b981', icon: <CheckCircleOutlined /> },
          { title: 'Trial',         value: trial,           color: '#f59e0b', icon: <GlobalOutlined /> },
        ].map(s => (
          <Col span={8} key={s.title}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Statistic title={s.title} value={s.value} valueStyle={{ color: s.color, fontWeight: 900 }}
                prefix={<span style={{ color: s.color, marginRight: 4 }}>{s.icon}</span>} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Table */}
      <Card style={{ borderRadius: 14 }}>
        <Table
          dataSource={tenants} columns={columns} rowKey="id" size="small"
          loading={isLoading} scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 15, showTotal: t => `${t} tenants` }}
        />
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen} onCancel={() => setModalOpen(false)}
        title={editRecord ? `Edit — ${editRecord.name}` : 'New Tenant'}
        onOk={() => form.validateFields().then(v => saveMut.mutate({ id: editRecord?.id, data: v }))}
        confirmLoading={saveMut.isPending} okText={editRecord ? 'Save' : 'Create'} width={620}
      >
        <Form form={form} layout="vertical" size="small" style={{ marginTop: 16 }}>
          <Row gutter={14}>
            <Col span={14}>
              <Form.Item name="name" label="Organization Name" rules={[{ required: true }]}>
                <Input placeholder="Acme Corporation" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="slug" label="Slug (URL identifier)" rules={[{ required: true, pattern: /^[a-z0-9-]+$/, message: 'Lowercase, digits, hyphens only' }]}>
                <Input placeholder="acme-corp" disabled={!!editRecord} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={14}>
            <Col span={8}>
              <Form.Item name="plan" label="Plan" initialValue="starter">
                <Select options={[{ value: 'starter', label: 'Starter' }, { value: 'professional', label: 'Professional' }, { value: 'enterprise', label: 'Enterprise' }]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="Status" initialValue="active">
                <Select options={[{ value: 'active', label: 'Active' }, { value: 'trial', label: 'Trial' }, { value: 'suspended', label: 'Suspended' }, { value: 'cancelled', label: 'Cancelled' }]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="contactEmail" label="Contact Email">
                <Input placeholder="admin@acme.com" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={14}>
            <Col span={12}>
              <Form.Item name="maxUsers" label="Max Users" initialValue={50}>
                <Input type="number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxVehicles" label="Max Vehicles" initialValue={100}>
                <Input type="number" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="Address">
            <Input placeholder="123 Main St, Dhaka" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Provision Admin Modal */}
      <Modal
        open={provModal} onCancel={() => setProvModal(false)}
        title={`Provision Admin — ${provTenant?.name}`}
        onOk={() => pform.validateFields().then(v => provMut.mutate({ id: provTenant.id, data: v }))}
        confirmLoading={provMut.isPending} okText="Create Admin User"
      >
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
          Creates an admin user for this tenant. Default password: <code>Welcome@123</code>
        </p>
        <Form form={pform} layout="vertical" size="small">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="username" label="Username" initialValue={provTenant ? `${provTenant.slug}_admin` : ''}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email">
                <Input placeholder={provTenant ? `admin@${provTenant.slug}.com` : ''} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="fullName" label="Full Name">
            <Input placeholder={provTenant ? `${provTenant.name} Admin` : ''} />
          </Form.Item>
          <Form.Item name="password" label="Password" initialValue="Welcome@123">
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
