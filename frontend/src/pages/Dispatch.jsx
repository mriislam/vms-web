import {
  CheckCircleOutlined, ClockCircleOutlined, DeleteOutlined, EditOutlined,
  EyeOutlined, PlusOutlined, SearchOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button, Card, Col, DatePicker, Descriptions, Drawer, Form, Input, InputNumber,
  Popconfirm, Row, Select, Spin, Table, Tag, Tooltip, message,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import ColumnPicker from '../components/ColumnPicker';
import FormModal, { FormSection } from '../components/FormModal';
import PageHeader from '../components/PageHeader';
import { useApiCrud } from '../hooks/useApiCrud';
import { useColumnPicker } from '../hooks/useColumnPicker';
import { filterOption, useDriverOptions, useVehicleOptions } from '../hooks/useLookupOptions';
import { dispatchService } from '../services/dispatchService';
import { formatDate, formatDateTime, statusColor } from '../utils/helpers';

const COLUMNS_DEF = [
  { key: 'dispatchNo',  columnTitle: 'Dispatch No',  title: 'Dispatch No',  dataIndex: 'dispatchNo' },
  { key: 'vehicleReg',  columnTitle: 'Vehicle',      title: 'Vehicle',      dataIndex: 'vehicleReg' },
  { key: 'driverName',  columnTitle: 'Driver',       title: 'Driver',       dataIndex: 'driverName' },
  { key: 'origin',      columnTitle: 'Origin',       title: 'Origin',       dataIndex: 'origin' },
  { key: 'destination', columnTitle: 'Destination',  title: 'Destination',  dataIndex: 'destination' },
  { key: 'date',        columnTitle: 'Date',         title: 'Date',         dataIndex: 'date',        render: (d) => formatDate(d) },
  { key: 'status',      columnTitle: 'Status',       title: 'Status',       dataIndex: 'status',      render: (s) => <Tag color={statusColor(s)}>{s?.replace(/_/g,' ').toUpperCase()}</Tag> },
  { key: 'distance',    columnTitle: 'Distance',     title: 'Distance',     dataIndex: 'distance',    defaultVisible: false, render: (v) => v ? `${v} km` : '—' },
  { key: 'purpose',     columnTitle: 'Purpose',      title: 'Purpose',      dataIndex: 'purpose',     defaultVisible: false },
  { key: 'approvedBy',  columnTitle: 'Approved By',  title: 'Approved By',  dataIndex: 'approvedBy',  defaultVisible: false },
  { key: 'startTime',   columnTitle: 'Start Time',   title: 'Start Time',   dataIndex: 'startTime',   defaultVisible: false, render: (v) => v ? formatDateTime(v) : '—' },
  { key: 'endTime',     columnTitle: 'End Time',     title: 'End Time',     dataIndex: 'endTime',     defaultVisible: false, render: (v) => v ? formatDateTime(v) : '—' },
  { key: 'fuelUsed',    columnTitle: 'Fuel Used',    title: 'Fuel Used',    dataIndex: 'fuelUsed',    defaultVisible: false, render: (v) => v ? `${v} L` : '—' },
];

const STATUS_FLOW  = { pending: 'approved', approved: 'in_progress', in_progress: 'completed' };
const STATUS_LABEL = { pending: 'Approve', approved: 'Start Trip', in_progress: 'Mark Complete' };

export default function Dispatch() {
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('all');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [form] = Form.useForm();
  const qc = useQueryClient();

  const { data, isLoading, save, remove, isSaving } = useApiCrud('vehicle-requisition', dispatchService, {
    onSaveSuccess: () => setModalOpen(false),
  });
  const vehicleOptions = useVehicleOptions();
  const driverOptions  = useDriverOptions();

  const advanceMut = useMutation({
    mutationFn: (id) => dispatchService.advance(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicle-requisition'] }); message.success('Status advanced'); },
    onError: () => message.error('Failed to advance status'),
  });

  const { visibleColumns, visibleKeys, setVisible, resetToDefault, allColumns } =
    useColumnPicker('vehicle-requisition', COLUMNS_DEF);

  const columns = [
    ...visibleColumns,
    {
      title: 'Actions', key: 'actions', fixed: 'right', width: 150,
      render: (_, r) => {
        const ns = STATUS_FLOW[r.status];
        return (
          <div style={{ display: 'flex', gap: 2 }}>
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setViewRecord(r)} />
            {r.status !== 'completed' && <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />}
            {ns && (
              <Tooltip title={STATUS_LABEL[r.status]}>
                <Button type="link" size="small" style={{ color: '#52c41a' }}
                  icon={r.status === 'in_progress' ? <ClockCircleOutlined /> : <CheckCircleOutlined />}
                  onClick={() => advanceMut.mutate(r.id)}
                />
              </Tooltip>
            )}
            {r.status !== 'completed' && (
              <Popconfirm title="Cancel this dispatch?" okText="Cancel" okButtonProps={{ danger: true }} onConfirm={() => remove(r.id)}>
                <Button type="link" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            )}
          </div>
        );
      },
    },
  ];

  const filtered = data.filter((d) => {
    const q = search.toLowerCase();
    return (!q || d.dispatchNo?.toLowerCase().includes(q) || d.vehicleReg?.toLowerCase().includes(q) || d.driverName?.toLowerCase().includes(q) || d.destination?.toLowerCase().includes(q))
      && (statusFilter === 'all' || d.status === statusFilter);
  });

  function openAdd() { setEditRecord(null); form.resetFields(); setModalOpen(true); }

  function openEdit(record) {
    setEditRecord(record);
    form.setFieldsValue({ ...record, date: record.date ? dayjs(record.date) : null });
    setModalOpen(true);
  }

  function handleSubmit() {
    form.validateFields().then((values) => {
      const payload = { ...values, date: values.date?.format('YYYY-MM-DD') ?? null };
      save(editRecord?.id ?? null, payload);
    });
  }

  const inProgress = data.filter((d) => d.status === 'in_progress').length;
  const pending    = data.filter((d) => d.status === 'pending').length;
  const completed  = data.filter((d) => d.status === 'completed').length;

  return (
    <div>
      <PageHeader
        icon={<ThunderboltOutlined />} color="#fa8c16" title="Vehicle Booking"
        subtitle="Assign vehicles and drivers, track active trips"
        stats={[
          { label: 'In Progress', value: inProgress, color: '#1677ff' },
          { label: 'Pending',     value: pending,    color: '#fa8c16' },
          { label: 'Completed',   value: completed,  color: '#52c41a' },
        ]}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>New Dispatch</Button>
        }
      />

      <Card size="small" style={{ borderRadius: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
          <Input placeholder="Search dispatch no, vehicle, driver…" prefix={<SearchOutlined />} value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 300 }} allowClear />
          <Select value={statusFilter} onChange={setStatus} style={{ width: 150 }} options={[
            { value:'all',label:'All Status' },{ value:'pending',label:'Pending' },{ value:'approved',label:'Approved' },
            { value:'in_progress',label:'In Progress' },{ value:'completed',label:'Completed' },
          ]} />
          <div style={{ marginLeft: 'auto' }}><ColumnPicker allColumns={allColumns} visibleKeys={visibleKeys} onChange={setVisible} onReset={resetToDefault} /></div>
        </div>
        <Spin spinning={isLoading}>
          <Table dataSource={filtered} columns={columns} size="small" scroll={{ x: 'max-content' }} rowKey="id" pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}`, pageSizeOptions: ['10', '25', '50', '100'] }} />
        </Spin>
      </Card>

      {/* ── Create / Edit Modal ── */}
      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        confirmLoading={isSaving}
        icon={<ThunderboltOutlined />}
        color="#fa8c16"
        title={editRecord ? `Edit Dispatch — ${editRecord.dispatchNo}` : 'Create Dispatch'}
        subtitle={editRecord ? 'Update the dispatch details below' : 'Assign a vehicle and driver to a new trip'}
        okText={editRecord ? 'Update' : 'Create Dispatch'}
        width={660}
      >
        <Form form={form} layout="vertical" size="small">
          <FormSection title="Assignment" color="#fa8c16">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="vehicleReg" label="Vehicle Reg No" rules={[{ required: true }]}>
                  <Select showSearch placeholder="Search vehicle…" options={vehicleOptions} filterOption={filterOption} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="driverName" label="Driver Name" rules={[{ required: true }]}>
                  <Select showSearch placeholder="Search driver…" options={driverOptions} filterOption={filterOption} />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>

          <FormSection title="Trip Details" color="#1677ff">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="origin"      label="Origin"      rules={[{ required: true }]}><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="destination" label="Destination" rules={[{ required: true }]}><Input /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="distance"   label="Distance (km)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
              <Col span={8}><Form.Item name="date"       label="Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={8}><Form.Item name="approvedBy" label="Approved By"><Input /></Form.Item></Col>
            </Row>
            <Form.Item name="purpose" label="Purpose / Remarks"><Input.TextArea rows={2} /></Form.Item>
          </FormSection>
        </Form>
      </FormModal>

      {/* ── View Drawer ── */}
      <Drawer
        open={!!viewRecord} onClose={() => setViewRecord(null)}
        title={viewRecord ? `Dispatch — ${viewRecord.dispatchNo}` : ''} width={500}
        extra={
          viewRecord && viewRecord.status !== 'completed' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="small" icon={<EditOutlined />} onClick={() => { setViewRecord(null); openEdit(viewRecord); }}>Edit</Button>
              {STATUS_FLOW[viewRecord.status] && (
                <Button size="small" type="primary" onClick={() => { advanceMut.mutate(viewRecord.id); setViewRecord(null); }}>
                  {STATUS_LABEL[viewRecord.status]}
                </Button>
              )}
            </div>
          )
        }
      >
        {viewRecord && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="Dispatch No">{viewRecord.dispatchNo}</Descriptions.Item>
            <Descriptions.Item label="Status"       ><Tag color={statusColor(viewRecord.status)}>{viewRecord.status?.replace(/_/g,' ').toUpperCase()}</Tag></Descriptions.Item>
            <Descriptions.Item label="Vehicle"      >{viewRecord.vehicleReg}</Descriptions.Item>
            <Descriptions.Item label="Driver"       >{viewRecord.driverName}</Descriptions.Item>
            <Descriptions.Item label="Origin"       >{viewRecord.origin}</Descriptions.Item>
            <Descriptions.Item label="Destination"  >{viewRecord.destination}</Descriptions.Item>
            <Descriptions.Item label="Date"         >{formatDate(viewRecord.date)}</Descriptions.Item>
            <Descriptions.Item label="Distance"     >{viewRecord.distance ? `${viewRecord.distance} km` : '—'}</Descriptions.Item>
            <Descriptions.Item label="Purpose" span={2}>{viewRecord.purpose}</Descriptions.Item>
            <Descriptions.Item label="Approved By"  >{viewRecord.approvedBy}</Descriptions.Item>
            <Descriptions.Item label="Fuel Used"    >{viewRecord.fuelUsed ? `${viewRecord.fuelUsed} L` : '—'}</Descriptions.Item>
            <Descriptions.Item label="Start Time"   >{viewRecord.startTime ? formatDateTime(viewRecord.startTime) : '—'}</Descriptions.Item>
            <Descriptions.Item label="End Time"     >{viewRecord.endTime   ? formatDateTime(viewRecord.endTime)   : '—'}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
