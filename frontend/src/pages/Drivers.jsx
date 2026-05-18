import {
  DeleteOutlined, EditOutlined, EyeOutlined, IdcardOutlined, PlusOutlined, SearchOutlined,
} from '@ant-design/icons';
import {
  Button, Card, Col, DatePicker, Descriptions, Drawer, Form, Input, InputNumber,
  Popconfirm, Row, Select, Spin, Table, Tag, message,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import ColumnPicker from '../components/ColumnPicker';
import FormModal, { FormSection } from '../components/FormModal';
import PageHeader from '../components/PageHeader';
import { useApiCrud } from '../hooks/useApiCrud';
import { useColumnPicker } from '../hooks/useColumnPicker';
import { driverService } from '../services/driverService';
import { formatDate, statusColor } from '../utils/helpers';

const OWNERSHIP_COLOR = { Private: 'blue', Government: 'green', Special: 'purple' };

const COLUMNS_DEF = [
  { key: 'name',       columnTitle: 'Name',         title: 'Name',         dataIndex: 'name' },
  { key: 'licenseNo',  columnTitle: 'License No',   title: 'License No',   dataIndex: 'licenseNo' },
  { key: 'phone',      columnTitle: 'Phone',        title: 'Phone',        dataIndex: 'phone' },
  { key: 'experience', columnTitle: 'Experience',   title: 'Experience',   dataIndex: 'experience', render: (v) => v != null ? `${v} yrs` : '—' },
  { key: 'totalTrips', columnTitle: 'Total Trips',  title: 'Total Trips',  dataIndex: 'totalTrips' },
  { key: 'ownership',  columnTitle: 'Ownership',    title: 'Ownership',    dataIndex: 'ownership',  render: (v) => v ? <Tag color={OWNERSHIP_COLOR[v]}>{v}</Tag> : '—' },
  { key: 'status',     columnTitle: 'Status',       title: 'Status',       dataIndex: 'status',     render: (s) => <Tag color={statusColor(s)}>{s?.toUpperCase()}</Tag> },
  { key: 'nid',        columnTitle: 'NID',          title: 'NID',          dataIndex: 'nid',        defaultVisible: false },
  { key: 'dob',        columnTitle: 'Date of Birth',title: 'Date of Birth',dataIndex: 'dob',        defaultVisible: false, render: (d) => formatDate(d) },
  { key: 'joinDate',   columnTitle: 'Join Date',    title: 'Join Date',    dataIndex: 'joinDate',   defaultVisible: false, render: (d) => formatDate(d) },
  { key: 'address',    columnTitle: 'Address',      title: 'Address',      dataIndex: 'address',    defaultVisible: false },
  { key: 'bloodGroup', columnTitle: 'Blood Group',  title: 'Blood Group',  dataIndex: 'bloodGroup', defaultVisible: false },
  { key: 'lastTrip',   columnTitle: 'Last Trip',    title: 'Last Trip',    dataIndex: 'lastTrip',   defaultVisible: false, render: (d) => formatDate(d) },
];

export default function Drivers() {
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatus]       = useState('all');
  const [ownershipFilter, setOwnership] = useState('all');
  const [modalOpen, setModalOpen]       = useState(false);
  const [editRecord, setEditRecord]     = useState(null);
  const [viewRecord, setViewRecord]     = useState(null);
  const [form] = Form.useForm();

  const { data, isLoading, save, remove, isSaving } = useApiCrud('drivers', driverService, {
    onSaveSuccess: () => setModalOpen(false),
  });

  const { visibleColumns, visibleKeys, setVisible, resetToDefault, allColumns } =
    useColumnPicker('drivers', COLUMNS_DEF);

  const columns = [
    ...visibleColumns,
    {
      title: 'Actions', key: 'actions', fixed: 'right', width: 110,
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 2 }}>
          <Button type="link" size="small" icon={<EyeOutlined />}  onClick={() => setViewRecord(r)} />
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Remove this driver?" okText="Remove" okButtonProps={{ danger: true }} onConfirm={() => remove(r.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  const filtered = data.filter((d) => {
    const q = search.toLowerCase();
    return (!q || d.name?.toLowerCase().includes(q) || d.licenseNo?.toLowerCase().includes(q))
      && (statusFilter === 'all' || d.status === statusFilter)
      && (ownershipFilter === 'all' || d.ownership === ownershipFilter);
  });

  function openAdd() { setEditRecord(null); form.resetFields(); setModalOpen(true); }

  function openEdit(record) {
    setEditRecord(record);
    form.setFieldsValue({
      ...record,
      dob:      record.dob      ? dayjs(record.dob)      : null,
      joinDate: record.joinDate ? dayjs(record.joinDate) : null,
    });
    setModalOpen(true);
  }

  function handleSubmit() {
    form.validateFields().then((values) => {
      const payload = {
        ...values,
        dob:      values.dob?.format('YYYY-MM-DD')      ?? null,
        joinDate: values.joinDate?.format('YYYY-MM-DD') ?? null,
      };
      save(editRecord?.id ?? null, payload);
    });
  }

  const total   = data.length;
  const active  = data.filter((d) => d.status === 'active').length;
  const inactive = data.filter((d) => d.status === 'inactive').length;

  return (
    <div>
      <PageHeader
        icon={<IdcardOutlined />} color="#13c2c2" title="Drivers"
        subtitle="Driver roster, licence tracking and trip history"
        stats={[
          { label: 'Total',    value: total,    color: '#13c2c2' },
          { label: 'Active',   value: active,   color: '#52c41a' },
          { label: 'Inactive', value: inactive, color: '#ff4d4f' },
        ]}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add Driver</Button>
        }
      />

      <Card size="small" style={{ borderRadius: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
          <Input placeholder="Search name or licence…" prefix={<SearchOutlined />} value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 260 }} allowClear />
          <Select value={ownershipFilter} onChange={setOwnership} style={{ width: 150 }} options={[
            { value: 'all',        label: 'All Ownership' },
            { value: 'Private',    label: 'Private' },
            { value: 'Government', label: 'Government' },
            { value: 'Special',    label: 'Special' },
          ]} />
          <Select value={statusFilter} onChange={setStatus} style={{ width: 130 }} options={[{ value:'all',label:'All Status' },{ value:'active',label:'Active' },{ value:'inactive',label:'Inactive' }]} />
          <div style={{ marginLeft: 'auto' }}><ColumnPicker allColumns={allColumns} visibleKeys={visibleKeys} onChange={setVisible} onReset={resetToDefault} /></div>
        </div>
        <Spin spinning={isLoading}>
          <Table dataSource={filtered} columns={columns} size="small" scroll={{ x: 'max-content' }} rowKey="id" pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}`, pageSizeOptions: ['10', '25', '50', '100'] }} />
        </Spin>
      </Card>

      {/* ── Add / Edit Modal ── */}
      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        confirmLoading={isSaving}
        icon={<IdcardOutlined />}
        color="#13c2c2"
        title={editRecord ? `Edit Driver — ${editRecord.name}` : 'Add New Driver'}
        subtitle={editRecord ? 'Update the driver profile below' : 'Register a new driver to the fleet'}
        okText={editRecord ? 'Update Driver' : 'Add Driver'}
        width={680}
      >
        <Form form={form} layout="vertical" size="small">
          <FormSection title="Personal Information" color="#13c2c2">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="name"  label="Full Name"  rules={[{ required: true }]}><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="phone" label="Phone"      rules={[{ required: true }]}><Input /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="dob"        label="Date of Birth">   <DatePicker style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={8}><Form.Item name="bloodGroup" label="Blood Group">
                <Select options={['A+','A-','B+','B-','O+','O-','AB+','AB-'].map((b) => ({ value: b, label: b }))} />
              </Form.Item></Col>
              <Col span={8}><Form.Item name="nid" label="NID"><Input /></Form.Item></Col>
            </Row>
            <Form.Item name="address" label="Address"><Input.TextArea rows={2} /></Form.Item>
          </FormSection>

          <FormSection title="License & Employment" color="#722ed1">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="licenseNo"  label="License No"      rules={[{ required: true }]}><Input placeholder="DL-000-YYYY" /></Form.Item></Col>
              <Col span={12}><Form.Item name="experience" label="Experience (yrs)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="joinDate" label="Join Date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={8}>
                <Form.Item name="ownership" label="Ownership" rules={[{ required: true }]}>
                  <Select options={['Private','Government','Special'].map((o) => ({ value: o, label: o }))} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                  <Select options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>
        </Form>
      </FormModal>

      {/* ── View Drawer ── */}
      <Drawer
        open={!!viewRecord} onClose={() => setViewRecord(null)}
        title={viewRecord ? `Driver — ${viewRecord.name}` : ''} width={480}
        extra={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="small" icon={<EditOutlined />} onClick={() => { setViewRecord(null); openEdit(viewRecord); }}>Edit</Button>
            <Popconfirm title="Remove this driver?" okText="Remove" okButtonProps={{ danger: true }} onConfirm={() => { remove(viewRecord.id); setViewRecord(null); }}>
              <Button size="small" danger icon={<DeleteOutlined />}>Remove</Button>
            </Popconfirm>
          </div>
        }
      >
        {viewRecord && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="Name"       span={2}>{viewRecord.name}</Descriptions.Item>
            <Descriptions.Item label="Ownership"       ><Tag color={OWNERSHIP_COLOR[viewRecord.ownership]}>{viewRecord.ownership}</Tag></Descriptions.Item>
            <Descriptions.Item label="Status"          ><Tag color={statusColor(viewRecord.status)}>{viewRecord.status?.toUpperCase()}</Tag></Descriptions.Item>
            <Descriptions.Item label="Blood Group"     >{viewRecord.bloodGroup}</Descriptions.Item>
            <Descriptions.Item label="License No"      >{viewRecord.licenseNo}</Descriptions.Item>
            <Descriptions.Item label="NID"             >{viewRecord.nid}</Descriptions.Item>
            <Descriptions.Item label="Phone"           >{viewRecord.phone}</Descriptions.Item>
            <Descriptions.Item label="Date of Birth"   >{formatDate(viewRecord.dob)}</Descriptions.Item>
            <Descriptions.Item label="Experience"      >{viewRecord.experience} yrs</Descriptions.Item>
            <Descriptions.Item label="Join Date"       >{formatDate(viewRecord.joinDate)}</Descriptions.Item>
            <Descriptions.Item label="Total Trips"     >{viewRecord.totalTrips}</Descriptions.Item>
            <Descriptions.Item label="Last Trip"       >{formatDate(viewRecord.lastTrip)}</Descriptions.Item>
            <Descriptions.Item label="Address" span={2} >{viewRecord.address}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
