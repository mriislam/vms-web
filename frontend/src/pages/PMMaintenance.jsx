import {
  CheckCircleOutlined, DeleteOutlined, EditOutlined,
  EyeOutlined, PlusOutlined, SearchOutlined, SyncOutlined, ToolOutlined,
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
import { filterOption, useVehicleOptions, useVendorOptions } from '../hooks/useLookupOptions';
import { maintenanceService } from '../services/maintenanceService';
import { formatCurrency, formatDate, statusColor } from '../utils/helpers';

const PM_TYPES = [
  { value: 'oil_change',           label: 'Oil Change' },
  { value: 'tire_rotation',        label: 'Tire Rotation / Replacement' },
  { value: 'air_filter',           label: 'Air Filter Replacement' },
  { value: 'fuel_filter',          label: 'Fuel Filter Replacement' },
  { value: 'brake_inspection',     label: 'Brake Inspection & Service' },
  { value: 'battery_check',        label: 'Battery Check / Replacement' },
  { value: 'coolant_flush',        label: 'Coolant Flush' },
  { value: 'transmission_service', label: 'Transmission Service' },
  { value: 'spark_plug',           label: 'Spark Plug Replacement' },
  { value: 'timing_belt',          label: 'Timing Belt / Chain' },
  { value: 'ac_service',           label: 'A/C Service' },
  { value: 'general_inspection',   label: 'General Inspection' },
];

const PM_TYPE_LABEL = Object.fromEntries(PM_TYPES.map((t) => [t.value, t.label]));

const INTERVAL_UNITS = [
  { value: 'km',     label: 'km' },
  { value: 'days',   label: 'Days' },
  { value: 'months', label: 'Months' },
];

const COLS_DEF = [
  { key: 'vehicleReg',  columnTitle: 'Vehicle',      title: 'Vehicle',      dataIndex: 'vehicleReg' },
  { key: 'type',        columnTitle: 'PM Type',       title: 'PM Type',      dataIndex: 'type',
    render: (v) => PM_TYPE_LABEL[v] ?? v?.replace(/_/g, ' ') },
  { key: 'date',        columnTitle: 'Last Done',     title: 'Last Done',    dataIndex: 'date',     render: (d) => formatDate(d) },
  { key: 'nextDue',     columnTitle: 'Next Due',      title: 'Next Due',     dataIndex: 'nextDue',  render: (d) => {
    if (!d) return '—';
    const overdue = dayjs(d).isBefore(dayjs(), 'day');
    return <Tag color={overdue ? 'red' : 'blue'}>{formatDate(d)}{overdue ? ' ⚠ Overdue' : ''}</Tag>;
  }},
  { key: 'cost',        columnTitle: 'Cost',          title: 'Cost',         dataIndex: 'cost',     render: (v) => formatCurrency(v) },
  { key: 'status',      columnTitle: 'Status',        title: 'Status',       dataIndex: 'status',
    render: (s) => <Tag color={statusColor(s)}>{s?.replace(/_/g, ' ').toUpperCase()}</Tag> },
  { key: 'vendor',      columnTitle: 'Workshop',      title: 'Workshop',     dataIndex: 'vendor',      defaultVisible: false },
  { key: 'odometer',    columnTitle: 'Odometer (km)', title: 'Odometer',     dataIndex: 'odometer',    defaultVisible: false, render: (v) => v != null ? `${Number(v).toLocaleString()} km` : '—' },
  { key: 'description', columnTitle: 'Description',   title: 'Description',  dataIndex: 'description', defaultVisible: false },
  { key: 'completedBy', columnTitle: 'Completed By',  title: 'Completed By', dataIndex: 'completedBy', defaultVisible: false, render: (v) => v ?? '—' },
  { key: 'partsUsed',   columnTitle: 'Parts Used',    title: 'Parts Used',   dataIndex: 'partsUsed',   defaultVisible: false },
];

const STATUS_FLOW  = { pending: 'in_progress', in_progress: 'completed' };
const STATUS_LABEL = { pending: 'Start Work', in_progress: 'Mark Complete' };

export default function PMMaintenance() {
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [form] = Form.useForm();
  const qc = useQueryClient();

  const { data: allData, isLoading, save, remove, isSaving } = useApiCrud('maintenance', maintenanceService, {
    onSaveSuccess: () => setModalOpen(false),
  });
  const vehicleOptions = useVehicleOptions();
  const vendorOptions  = useVendorOptions();

  /* Only show PM-type records (type matches any PM_TYPE value) */
  const pmTypeValues = PM_TYPES.map((t) => t.value);
  const data = allData.filter((r) => pmTypeValues.includes(r.type));

  const advanceMut = useMutation({
    mutationFn: (id) => maintenanceService.advance(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance'] }); message.success('Status updated'); },
    onError:   () => message.error('Failed to update status'),
  });

  const { visibleColumns, visibleKeys, setVisible, resetToDefault, allColumns } =
    useColumnPicker('pm-maintenance', COLS_DEF);

  const columns = [
    ...visibleColumns,
    {
      title: 'Actions', key: 'actions', fixed: 'right', width: 130,
      render: (_, r) => {
        const ns = STATUS_FLOW[r.status];
        return (
          <div style={{ display: 'flex', gap: 2 }}>
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setViewRecord(r)} />
            {r.status !== 'completed' && (
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
            )}
            {ns && (
              <Tooltip title={STATUS_LABEL[r.status]}>
                <Button type="link" size="small" style={{ color: '#52c41a' }}
                  icon={<CheckCircleOutlined />}
                  onClick={() => advanceMut.mutate(r.id)} />
              </Tooltip>
            )}
            {r.status !== 'completed' && (
              <Popconfirm title="Delete this PM record?" okText="Delete" okButtonProps={{ danger: true }}
                onConfirm={() => remove(r.id)}>
                <Button type="link" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            )}
          </div>
        );
      },
    },
  ];

  const now = dayjs();
  const filtered = data.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q || r.vehicleReg?.toLowerCase().includes(q) || r.vendor?.toLowerCase().includes(q) || PM_TYPE_LABEL[r.type]?.toLowerCase().includes(q))
      && (statusFilter === 'all' || r.status === statusFilter)
      && (typeFilter   === 'all' || r.type   === typeFilter)
    );
  });

  function openAdd()   { setEditRecord(null); form.resetFields(); setModalOpen(true); }
  function openEdit(r) {
    setEditRecord(r);
    form.setFieldsValue({
      ...r,
      date:    r.date    ? dayjs(r.date)    : null,
      nextDue: r.nextDue ? dayjs(r.nextDue) : null,
    });
    setModalOpen(true);
  }

  function handleSubmit() {
    form.validateFields().then((v) => {
      save(editRecord?.id ?? null, {
        ...v,
        date:    v.date?.format('YYYY-MM-DD')    ?? null,
        nextDue: v.nextDue?.format('YYYY-MM-DD') ?? null,
      });
    });
  }

  const overdue  = data.filter((r) => r.nextDue && dayjs(r.nextDue).isBefore(now, 'day') && r.status !== 'completed').length;
  const pending  = data.filter((r) => r.status === 'pending').length;
  const completed = data.filter((r) => r.status === 'completed').length;

  return (
    <div>
      <PageHeader
        icon={<SyncOutlined />} color="#d46b08" title="PM Maintenance"
        subtitle="Schedule and track preventive maintenance jobs for all vehicles"
        stats={[
          { label: 'Overdue',   value: overdue,   color: '#ff4d4f' },
          { label: 'Pending',   value: pending,   color: '#fa8c16' },
          { label: 'Completed', value: completed, color: '#52c41a' },
        ]}
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Schedule PM</Button>}
      />

      <Card size="small" style={{ borderRadius: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <Input placeholder="Search vehicle, workshop, PM type…" prefix={<SearchOutlined />}
            value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 260 }} allowClear />
          <Select value={typeFilter} onChange={setTypeFilter} style={{ width: 200 }}
            options={[{ value: 'all', label: 'All PM Types' }, ...PM_TYPES]} />
          <Select value={statusFilter} onChange={setStatus} style={{ width: 140 }} options={[
            { value: 'all',         label: 'All Status' },
            { value: 'pending',     label: 'Pending' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed',   label: 'Completed' },
          ]} />
          <div style={{ marginLeft: 'auto' }}>
            <ColumnPicker allColumns={allColumns} visibleKeys={visibleKeys} onChange={setVisible} onReset={resetToDefault} />
          </div>
        </div>
        <Spin spinning={isLoading}>
          <Table dataSource={filtered} columns={columns} size="small" scroll={{ x: 'max-content' }} rowKey="id" pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}`, pageSizeOptions: ['10', '25', '50', '100'] }} />
        </Spin>
      </Card>

      {/* ── Schedule / Edit Modal ── */}
      <FormModal
        open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSubmit}
        confirmLoading={isSaving}
        icon={<SyncOutlined />} color="#d46b08"
        title={editRecord ? `Edit PM — ${PM_TYPE_LABEL[editRecord.type] ?? editRecord.type}` : 'Schedule PM Job'}
        subtitle={editRecord ? 'Update the preventive maintenance record' : 'Create a new scheduled PM job for a vehicle'}
        okText={editRecord ? 'Update' : 'Schedule'} width={740}
      >
        <Form form={form} layout="vertical" size="small">
          <FormSection title="Vehicle & PM Type" color="#d46b08">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="vehicleReg" label="Vehicle" rules={[{ required: true }]}>
                  <Select showSearch placeholder="Select vehicle…" options={vehicleOptions} filterOption={filterOption} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="type" label="PM Type" rules={[{ required: true }]}>
                  <Select options={PM_TYPES} placeholder="Select PM type…" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="description" label="Description / Notes">
              <Input.TextArea rows={2} placeholder="Describe the work to be done…" />
            </Form.Item>
          </FormSection>

          <FormSection title="Schedule & Cost" color="#1677ff">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="date" label="Last Done Date">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="nextDue" label="Next Due Date" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="cost" label="Estimated Cost (৳)">
                  <InputNumber style={{ width: '100%' }} min={0} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="odometer" label="Current Odometer (km)">
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="vendor" label="Workshop / Vendor">
                  <Select showSearch placeholder="Select workshop…" options={vendorOptions} filterOption={filterOption} allowClear />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="completedBy" label="Assigned To">
                  <Input placeholder="Technician name…" />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>

          <FormSection title="Parts" color="#52c41a">
            <Form.Item name="partsUsed" label="Parts / Materials Required" style={{ marginBottom: 4 }}>
              <Input.TextArea rows={2} placeholder="List parts needed, e.g. oil filter, engine oil 5W-30…" />
            </Form.Item>
          </FormSection>
        </Form>
      </FormModal>

      {/* ── View Drawer ── */}
      <Drawer open={!!viewRecord} onClose={() => setViewRecord(null)}
        title={viewRecord ? `PM Record — ${viewRecord.vehicleReg}` : ''} width={480}
        extra={
          viewRecord && viewRecord.status !== 'completed' && STATUS_FLOW[viewRecord.status] && (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="small" icon={<EditOutlined />} onClick={() => { setViewRecord(null); openEdit(viewRecord); }}>Edit</Button>
              <Button size="small" type="primary" onClick={() => { advanceMut.mutate(viewRecord.id); setViewRecord(null); }}>
                {STATUS_LABEL[viewRecord.status]}
              </Button>
            </div>
          )
        }
      >
        {viewRecord && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="Vehicle"      >{viewRecord.vehicleReg}</Descriptions.Item>
            <Descriptions.Item label="Status"       ><Tag color={statusColor(viewRecord.status)}>{viewRecord.status?.replace(/_/g, ' ').toUpperCase()}</Tag></Descriptions.Item>
            <Descriptions.Item label="PM Type" span={2}>{PM_TYPE_LABEL[viewRecord.type] ?? viewRecord.type}</Descriptions.Item>
            <Descriptions.Item label="Last Done"    >{formatDate(viewRecord.date)}</Descriptions.Item>
            <Descriptions.Item label="Next Due"     >{formatDate(viewRecord.nextDue)}</Descriptions.Item>
            <Descriptions.Item label="Cost"         >{formatCurrency(viewRecord.cost)}</Descriptions.Item>
            <Descriptions.Item label="Odometer"     >{viewRecord.odometer != null ? `${Number(viewRecord.odometer).toLocaleString()} km` : '—'}</Descriptions.Item>
            <Descriptions.Item label="Workshop"     >{viewRecord.vendor ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Assigned To"  >{viewRecord.completedBy ?? '—'}</Descriptions.Item>
            {viewRecord.description && <Descriptions.Item label="Description" span={2}>{viewRecord.description}</Descriptions.Item>}
            {viewRecord.partsUsed   && <Descriptions.Item label="Parts Used"  span={2}>{viewRecord.partsUsed}</Descriptions.Item>}
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
