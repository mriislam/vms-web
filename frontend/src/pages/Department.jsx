import {
  ApartmentOutlined, DeleteOutlined, EditOutlined,
  EyeOutlined, PlusOutlined, SearchOutlined, SyncOutlined,
} from '@ant-design/icons';
import {
  Button, Card, Col, Descriptions, Drawer, Form, Input,
  Popconfirm, Row, Select, Spin, Table, Tag, Tooltip, message,
} from 'antd';
import { useState } from 'react';
import FormModal, { FormSection } from '../components/FormModal';
import PageHeader from '../components/PageHeader';
import { useApiCrud } from '../hooks/useApiCrud';
import { departmentService } from '../services/departmentService';

const STATUS_COLOR = { active: 'success', inactive: 'error' };

const DEPT_COLORS = [
  '#6366f1','#10b981','#f59e0b','#ec4899','#06b6d4',
  '#f97316','#8b5cf6','#f43f5e','#14b8a6','#84cc16',
];
function deptColor(name = '') {
  return DEPT_COLORS[name.charCodeAt(0) % DEPT_COLORS.length];
}

export default function Department() {
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('all');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [seeding, setSeeding]       = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading, save, remove, isSaving, refetch } = useApiCrud('departments', departmentService, {
    onSaveSuccess: () => setModalOpen(false),
  });

  const columns = [
    {
      title: 'Department', key: 'dept',
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: `${deptColor(r.name)}18`,
            border: `1px solid ${deptColor(r.name)}30`,
            color: deptColor(r.name),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 13,
          }}>
            {r.code ?? r.name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{r.name}</div>
            {r.code && <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.code}</div>}
          </div>
        </div>
      ),
    },
    { title: 'Head of Dept', dataIndex: 'headOfDept', key: 'head', render: v => v ?? '—' },
    { title: 'Location',     dataIndex: 'location',   key: 'loc',  render: v => v ?? '—' },
    {
      title: 'Description', dataIndex: 'description', key: 'desc',
      render: v => v ? (
        <Tooltip title={v}>
          <span style={{ color: '#64748b', fontSize: 12 }}>
            {v.length > 50 ? v.slice(0, 50) + '…' : v}
          </span>
        </Tooltip>
      ) : '—',
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: s => <Tag color={STATUS_COLOR[s]} style={{ borderRadius: 20 }}>{s?.toUpperCase()}</Tag>,
    },
    {
      title: 'Actions', key: 'actions', fixed: 'right', width: 110,
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 2 }}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setViewRecord(r)} />
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Delete this department?" okText="Delete" okButtonProps={{ danger: true }}
            onConfirm={() => remove(r.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  const filtered = data.filter(r => {
    const q = search.toLowerCase();
    return (
      (!q || r.name?.toLowerCase().includes(q) || r.code?.toLowerCase().includes(q) || r.headOfDept?.toLowerCase().includes(q))
      && (statusFilter === 'all' || r.status === statusFilter)
    );
  });

  function openAdd()   { setEditRecord(null); form.resetFields(); form.setFieldValue('status', 'active'); setModalOpen(true); }
  function openEdit(r) { setEditRecord(r); form.setFieldsValue(r); setModalOpen(true); }

  function handleSubmit() {
    form.validateFields().then(v => save(editRecord?.id ?? null, v));
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      await departmentService.seed();
      refetch();
      message.success('Default departments seeded successfully');
    } catch {
      message.error('Seed failed');
    } finally {
      setSeeding(false);
    }
  }

  const active   = data.filter(d => d.status === 'active').length;
  const inactive = data.filter(d => d.status === 'inactive').length;

  return (
    <div>
      <PageHeader
        icon={<ApartmentOutlined />} color="#8b5cf6" title="Departments"
        subtitle="Manage organisational departments and their structure"
        stats={[
          { label: 'Total',    value: data.length, color: '#8b5cf6' },
          { label: 'Active',   value: active,      color: '#10b981' },
          { label: 'Inactive', value: inactive,    color: '#f43f5e' },
        ]}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            {data.length === 0 && (
              <Button icon={<SyncOutlined />} loading={seeding} onClick={handleSeed}>
                Seed Defaults
              </Button>
            )}
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
              Add Department
            </Button>
          </div>
        }
      />

      <Card size="small" style={{ borderRadius: 14 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
          <Input placeholder="Search by name, code, head…" prefix={<SearchOutlined />}
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: 300, borderRadius: 10 }} allowClear />
          <Select value={statusFilter} onChange={setStatus} style={{ width: 140 }}
            options={[
              { value: 'all',      label: 'All Status' },
              { value: 'active',   label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]} />
          {data.length > 0 && (
            <Tooltip title="Re-seed adds only missing default departments">
              <Button size="small" icon={<SyncOutlined />} loading={seeding} onClick={handleSeed}>
                Seed Defaults
              </Button>
            </Tooltip>
          )}
        </div>
        <Spin spinning={isLoading}>
          <Table
            dataSource={filtered} columns={columns} size="small"
            scroll={{ x: 'max-content' }} rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
          />
        </Spin>
      </Card>

      {/* Add / Edit Modal */}
      <FormModal
        open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSubmit}
        confirmLoading={isSaving} icon={<ApartmentOutlined />} color="#8b5cf6"
        title={editRecord ? `Edit — ${editRecord.name}` : 'Add Department'}
        subtitle={editRecord ? 'Update department details' : 'Create a new organisational department'}
        okText={editRecord ? 'Update' : 'Add Department'} width={620}
      >
        <Form form={form} layout="vertical" size="middle">
          <FormSection title="Basic Information" color="#8b5cf6">
            <Row gutter={14}>
              <Col span={16}>
                <Form.Item name="name" label="Department Name" rules={[{ required: true }]}>
                  <Input placeholder="e.g. Human Resources" style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="code" label="Short Code"
                  tooltip="2–6 letter code, e.g. HR, FIN, OPS">
                  <Input placeholder="HR" maxLength={10} style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={2} placeholder="What does this department do?" style={{ borderRadius: 10, resize: 'none' }} />
            </Form.Item>
          </FormSection>

          <FormSection title="Details" color="#06b6d4">
            <Row gutter={14}>
              <Col span={12}>
                <Form.Item name="headOfDept" label="Head of Department">
                  <Input placeholder="Full name" style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="location" label="Location / Office">
                  <Input placeholder="e.g. Head Office, Warehouse" style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="status" label="Status">
              <Select options={[
                { value: 'active',   label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]} />
            </Form.Item>
          </FormSection>
        </Form>
      </FormModal>

      {/* View Drawer */}
      <Drawer
        open={!!viewRecord} onClose={() => setViewRecord(null)}
        title={viewRecord?.name ?? ''} width={420}
        extra={
          <Button size="small" icon={<EditOutlined />}
            onClick={() => { setViewRecord(null); openEdit(viewRecord); }}>
            Edit
          </Button>
        }
      >
        {viewRecord && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '16px 0 20px',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              marginBottom: 16,
            }}>
              <span style={{
                width: 56, height: 56, borderRadius: 14,
                background: `${deptColor(viewRecord.name)}14`,
                border: `2px solid ${deptColor(viewRecord.name)}30`,
                color: deptColor(viewRecord.name),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 20,
              }}>
                {viewRecord.code ?? viewRecord.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{viewRecord.name}</div>
                <Tag color={STATUS_COLOR[viewRecord.status]} style={{ marginTop: 4, borderRadius: 20 }}>
                  {viewRecord.status?.toUpperCase()}
                </Tag>
              </div>
            </div>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Code">{viewRecord.code ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Head of Dept">{viewRecord.headOfDept ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Location">{viewRecord.location ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Description">{viewRecord.description ?? '—'}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Drawer>
    </div>
  );
}
