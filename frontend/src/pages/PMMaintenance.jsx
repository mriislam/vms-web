import {
  DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined, SyncOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button, Card, Col, DatePicker, Descriptions, Drawer, Form, Input, InputNumber,
  Popconfirm, Row, Select, Spin, Table, Tabs, Tag, message,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import ColumnPicker from '../components/ColumnPicker';
import FormModal, { FormSection } from '../components/FormModal';
import MaintenanceWorkflow from '../components/MaintenanceWorkflow';
import PageHeader from '../components/PageHeader';
import { useApiCrud } from '../hooks/useApiCrud';
import { useColumnPicker } from '../hooks/useColumnPicker';
import { filterOption, useVehicleOptions, useVendorOptions } from '../hooks/useLookupOptions';
import { inventoryService } from '../services/inventoryService';
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

const PM_TYPE_LABEL = Object.fromEntries(PM_TYPES.map(t => [t.value, t.label]));

const WF_COLOR = {
  draft:            '#94a3b8',
  pending_estimate: '#f59e0b',
  pending_approval: '#6366f1',
  approved:         '#10b981',
  rejected:         '#f43f5e',
  in_progress:      '#06b6d4',
  completed:        '#10b981',
};

const COLS_DEF = [
  { key: 'vehicleReg',  columnTitle: 'Vehicle',      title: 'Vehicle',   dataIndex: 'vehicleReg' },
  { key: 'type',        columnTitle: 'PM Type',       title: 'PM Type',   dataIndex: 'type',
    render: v => PM_TYPE_LABEL[v] ?? v?.replace(/_/g, ' ') },
  { key: 'date',        columnTitle: 'Last Done',     title: 'Last Done', dataIndex: 'date',    render: d => formatDate(d) },
  { key: 'nextDue',     columnTitle: 'Next Due',      title: 'Next Due',  dataIndex: 'nextDue', render: d => {
    if (!d) return '—';
    const overdue = dayjs(d).isBefore(dayjs(), 'day');
    return <Tag color={overdue ? 'red' : 'blue'}>{formatDate(d)}{overdue ? ' ⚠ Overdue' : ''}</Tag>;
  }},
  { key: 'cost',        columnTitle: 'Cost',          title: 'Cost',      dataIndex: 'cost',    render: v => formatCurrency(v) },
  { key: 'workflowStatus', columnTitle: 'Workflow',   title: 'Workflow',  dataIndex: 'workflowStatus',
    render: ws => ws ? (
      <Tag style={{ background: `${WF_COLOR[ws]}18`, color: WF_COLOR[ws], borderColor: `${WF_COLOR[ws]}40`,
        borderRadius: 20, fontWeight: 700, fontSize: 11 }}>
        {ws.replace(/_/g, ' ').toUpperCase()}
      </Tag>
    ) : <Tag color="default" style={{ borderRadius: 20, fontSize: 11 }}>DRAFT</Tag> },
  { key: 'status',      columnTitle: 'Status',        title: 'Status',    dataIndex: 'status',
    render: s => <Tag color={statusColor(s)}>{s?.replace(/_/g, ' ').toUpperCase()}</Tag> },
  { key: 'vendor',      columnTitle: 'Workshop',      title: 'Workshop',  dataIndex: 'vendor',      defaultVisible: false },
  { key: 'odometer',    columnTitle: 'Odometer (km)', title: 'Odometer',  dataIndex: 'odometer',    defaultVisible: false, render: v => v != null ? `${Number(v).toLocaleString()} km` : '—' },
  { key: 'description', columnTitle: 'Description',   title: 'Description',dataIndex:'description',  defaultVisible: false },
  { key: 'completedBy', columnTitle: 'Completed By',  title: 'Completed By',dataIndex:'completedBy', defaultVisible: false, render: v => v ?? '—' },
];

export default function PMMaintenance() {
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [wfFilter, setWfFilter]     = useState('all');
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

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventory-all'],
    queryFn:  () => inventoryService.getAll().then(r => r.data?.data ?? []),
  });

  const pmTypeValues = PM_TYPES.map(t => t.value);
  const data = allData.filter(r => pmTypeValues.includes(r.type));

  const { visibleColumns, visibleKeys, setVisible, resetToDefault, allColumns } = useColumnPicker('pm-maintenance', COLS_DEF);

  const columns = [
    ...visibleColumns,
    {
      title: 'Actions', key: 'actions', fixed: 'right', width: 90,
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 2 }}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setViewRecord(r)} />
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Delete this PM record?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => remove(r.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  const now = dayjs();
  const filtered = data.filter(r => {
    const q = search.toLowerCase();
    return (
      (!q || r.vehicleReg?.toLowerCase().includes(q) || r.vendor?.toLowerCase().includes(q) || PM_TYPE_LABEL[r.type]?.toLowerCase().includes(q))
      && (statusFilter === 'all' || r.status === statusFilter)
      && (typeFilter   === 'all' || r.type   === typeFilter)
      && (wfFilter     === 'all' || (r.workflowStatus ?? 'draft') === wfFilter)
    );
  });

  function openAdd()   { setEditRecord(null); form.resetFields(); setModalOpen(true); }
  function openEdit(r) {
    setEditRecord(r);
    form.setFieldsValue({ ...r, date: r.date ? dayjs(r.date) : null, nextDue: r.nextDue ? dayjs(r.nextDue) : null });
    setModalOpen(true);
  }

  function handleSubmit() {
    form.validateFields().then(v => {
      save(editRecord?.id ?? null, {
        ...v,
        date:    v.date?.format('YYYY-MM-DD')    ?? null,
        nextDue: v.nextDue?.format('YYYY-MM-DD') ?? null,
        isPmMaintenance: true,
      });
    });
  }

  const overdue   = data.filter(r => r.nextDue && dayjs(r.nextDue).isBefore(now, 'day') && r.status !== 'completed').length;
  const pending   = data.filter(r => r.status === 'pending').length;
  const completed = data.filter(r => r.status === 'completed').length;

  return (
    <div>
      <PageHeader
        icon={<SyncOutlined />} color="#d46b08" title="PM Maintenance"
        subtitle="Preventive maintenance jobs with service center workflow and inventory integration"
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
            value={search} onChange={e => setSearch(e.target.value)} style={{ width: 240 }} allowClear />
          <Select value={typeFilter} onChange={setTypeFilter} style={{ width: 190 }}
            options={[{ value: 'all', label: 'All PM Types' }, ...PM_TYPES]} />
          <Select value={statusFilter} onChange={setStatus} style={{ width: 140 }}
            options={[
              { value: 'all',         label: 'All Status' },
              { value: 'pending',     label: 'Pending' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed',   label: 'Completed' },
            ]} />
          <Select value={wfFilter} onChange={setWfFilter} style={{ width: 175 }}
            options={[
              { value: 'all',             label: 'All Workflow' },
              { value: 'draft',           label: 'Draft' },
              { value: 'pending_estimate','label': 'Sent to SC' },
              { value: 'pending_approval','label': 'Pending Approval' },
              { value: 'approved',        label: 'Approved' },
              { value: 'rejected',        label: 'Rejected' },
              { value: 'completed',       label: 'Completed' },
            ]} />
          <div style={{ marginLeft: 'auto' }}>
            <ColumnPicker allColumns={allColumns} visibleKeys={visibleKeys} onChange={setVisible} onReset={resetToDefault} />
          </div>
        </div>
        <Spin spinning={isLoading}>
          <Table dataSource={filtered} columns={columns} size="small" scroll={{ x: 'max-content' }} rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}`, pageSizeOptions: ['10', '25', '50', '100'] }} />
        </Spin>
      </Card>

      {/* Schedule / Edit Modal */}
      <FormModal
        open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSubmit}
        confirmLoading={isSaving} icon={<SyncOutlined />} color="#d46b08"
        title={editRecord ? `Edit PM — ${PM_TYPE_LABEL[editRecord.type] ?? editRecord.type}` : 'Schedule PM Job'}
        subtitle={editRecord ? 'Update the preventive maintenance record' : 'Create a new scheduled PM job for a vehicle'}
        okText={editRecord ? 'Update' : 'Schedule'} width={740}
      >
        <Form form={form} layout="vertical" size="small">
          <FormSection title="Vehicle &amp; PM Type" color="#d46b08">
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
              <Input.TextArea rows={2} placeholder="Describe the work to be done…" style={{ borderRadius: 10, resize: 'none' }} />
            </Form.Item>
          </FormSection>

          <FormSection title="Schedule &amp; Cost" color="#1677ff">
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
                  <InputNumber style={{ width: '100%' }} min={0} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
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
                  <Input placeholder="Technician name…" style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>

          <FormSection title="Parts from Inventory" color="#52c41a">
            <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>
              After saving, open the record and use the <strong>Workflow</strong> tab to add specific inventory parts and submit to service center.
            </div>
            <Form.Item name="partsUsed" label="Initial Parts / Materials Note">
              <Input.TextArea rows={2} placeholder="e.g. oil filter, engine oil 5W-30 — full parts list managed in Workflow tab" style={{ borderRadius: 10, resize: 'none' }} />
            </Form.Item>
          </FormSection>
        </Form>
      </FormModal>

      {/* View / Workflow Drawer */}
      <Drawer
        open={!!viewRecord}
        onClose={() => setViewRecord(null)}
        title={viewRecord ? `PM Record — ${viewRecord.vehicleReg}` : ''}
        width={700}
        extra={
          <Button size="small" icon={<EditOutlined />} onClick={() => { setViewRecord(null); openEdit(viewRecord); }}>
            Edit Record
          </Button>
        }
      >
        {viewRecord && (
          <Tabs defaultActiveKey="details" items={[
            {
              key: 'details',
              label: '📋 PM Details',
              children: (
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="Vehicle">{viewRecord.vehicleReg}</Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Tag color={statusColor(viewRecord.status)}>{viewRecord.status?.replace(/_/g, ' ').toUpperCase()}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="PM Type" span={2}>{PM_TYPE_LABEL[viewRecord.type] ?? viewRecord.type}</Descriptions.Item>
                  <Descriptions.Item label="Last Done">{formatDate(viewRecord.date)}</Descriptions.Item>
                  <Descriptions.Item label="Next Due">{formatDate(viewRecord.nextDue)}</Descriptions.Item>
                  <Descriptions.Item label="Estimated Cost">{formatCurrency(viewRecord.cost)}</Descriptions.Item>
                  <Descriptions.Item label="Odometer">{viewRecord.odometer != null ? `${Number(viewRecord.odometer).toLocaleString()} km` : '—'}</Descriptions.Item>
                  <Descriptions.Item label="Workshop">{viewRecord.vendor ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Assigned To">{viewRecord.completedBy ?? '—'}</Descriptions.Item>
                  {viewRecord.description && <Descriptions.Item label="Description" span={2}>{viewRecord.description}</Descriptions.Item>}
                  {viewRecord.partsUsed   && <Descriptions.Item label="Parts Note"  span={2}>{viewRecord.partsUsed}</Descriptions.Item>}
                </Descriptions>
              ),
            },
            {
              key: 'workflow',
              label: '🔄 SC Workflow & Parts',
              children: (
                <MaintenanceWorkflow
                  record={viewRecord}
                  inventoryItems={inventoryItems}
                  onRefresh={() => {
                    qc.invalidateQueries({ queryKey: ['maintenance'] });
                    message.success('Refreshed');
                  }}
                />
              ),
            },
          ]} />
        )}
      </Drawer>
    </div>
  );
}
