import {
  CheckCircleOutlined, ClockCircleOutlined, EditOutlined,
  EnvironmentOutlined, EyeOutlined, SearchOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button, Card, Descriptions, Drawer, Form, Input, InputNumber,
  Select, Spin, Table, Tag, Tooltip, message,
} from 'antd';
import { useState } from 'react';
import ColumnPicker from '../components/ColumnPicker';
import FormModal, { FormSection } from '../components/FormModal';
import PageHeader from '../components/PageHeader';
import { useApiCrud } from '../hooks/useApiCrud';
import { useColumnPicker } from '../hooks/useColumnPicker';
import { filterOption, useDriverOptions, useVehicleOptions } from '../hooks/useLookupOptions';
import { dispatchService } from '../services/dispatchService';
import { formatDate, formatDateTime, statusColor } from '../utils/helpers';

const STATUS_FLOW  = { pending: 'approved', approved: 'in_progress', in_progress: 'completed' };
const STATUS_LABEL = { pending: 'Approve', approved: 'Start Trip', in_progress: 'Mark Complete' };

const COLS_DEF = [
  { key: 'dispatchNo',  columnTitle: 'Dispatch No',  title: 'Dispatch No',  dataIndex: 'dispatchNo' },
  { key: 'vehicleReg',  columnTitle: 'Vehicle',      title: 'Vehicle',      dataIndex: 'vehicleReg' },
  { key: 'driverName',  columnTitle: 'Driver',       title: 'Driver',       dataIndex: 'driverName' },
  { key: 'origin',      columnTitle: 'Origin',       title: 'Origin',       dataIndex: 'origin' },
  { key: 'destination', columnTitle: 'Destination',  title: 'Destination',  dataIndex: 'destination' },
  { key: 'date',        columnTitle: 'Date',          title: 'Date',         dataIndex: 'date',       render: (d) => formatDate(d) },
  { key: 'status',      columnTitle: 'Status',        title: 'Status',       dataIndex: 'status',     render: (s) => <Tag color={statusColor(s)}>{s?.replace(/_/g, ' ').toUpperCase()}</Tag> },
  { key: 'distance',    columnTitle: 'Distance',      title: 'Distance',     dataIndex: 'distance',   defaultVisible: false, render: (v) => v ? `${v} km` : '—' },
  { key: 'fuelUsed',    columnTitle: 'Fuel Used',     title: 'Fuel Used',    dataIndex: 'fuelUsed',   defaultVisible: false, render: (v) => v ? `${v} L` : '—' },
  { key: 'startTime',   columnTitle: 'Start Time',    title: 'Start Time',   dataIndex: 'startTime',  defaultVisible: false, render: (v) => v ? formatDateTime(v) : '—' },
  { key: 'endTime',     columnTitle: 'End Time',      title: 'End Time',     dataIndex: 'endTime',    defaultVisible: false, render: (v) => v ? formatDateTime(v) : '—' },
  { key: 'approvedBy',  columnTitle: 'Approved By',   title: 'Approved By',  dataIndex: 'approvedBy', defaultVisible: false },
];

export default function ManageTrip() {
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('all');
  const [viewRecord, setViewRecord] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [modalOpen, setModalOpen]   = useState(false);
  const [form] = Form.useForm();
  const qc = useQueryClient();

  const { data, isLoading, save, isSaving } = useApiCrud('vehicle-requisition', dispatchService, {
    onSaveSuccess: () => setModalOpen(false),
  });
  const vehicleOptions = useVehicleOptions();
  const driverOptions  = useDriverOptions();

  const advanceMut = useMutation({
    mutationFn: (id) => dispatchService.advance(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicle-requisition'] }); message.success('Trip status updated'); },
    onError:   () => message.error('Failed to update status'),
  });

  const { visibleColumns, visibleKeys, setVisible, resetToDefault, allColumns } =
    useColumnPicker('manage-trip', COLS_DEF);

  const columns = [
    ...visibleColumns,
    {
      title: 'Actions', key: 'actions', fixed: 'right', width: 140,
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
                  icon={r.status === 'in_progress' ? <ClockCircleOutlined /> : <CheckCircleOutlined />}
                  onClick={() => advanceMut.mutate(r.id)}
                />
              </Tooltip>
            )}
          </div>
        );
      },
    },
  ];

  const filtered = data.filter((d) => {
    const q = search.toLowerCase();
    return (!q || d.dispatchNo?.toLowerCase().includes(q) || d.vehicleReg?.toLowerCase().includes(q) || d.driverName?.toLowerCase().includes(q))
      && (statusFilter === 'all' || d.status === statusFilter);
  });

  function openEdit(r) {
    setEditRecord(r);
    form.setFieldsValue(r);
    setModalOpen(true);
  }

  function handleSubmit() {
    form.validateFields().then((v) => save(editRecord?.id, v));
  }

  const inProgress = data.filter((d) => d.status === 'in_progress').length;
  const pending    = data.filter((d) => d.status === 'pending').length;
  const approved   = data.filter((d) => d.status === 'approved').length;

  return (
    <div>
      <PageHeader
        icon={<EnvironmentOutlined />} color="#08979c" title="Manage Trip"
        subtitle="Monitor and advance the status of active and upcoming trips"
        stats={[
          { label: 'In Progress', value: inProgress, color: '#1677ff' },
          { label: 'Approved',    value: approved,   color: '#52c41a' },
          { label: 'Pending',     value: pending,    color: '#fa8c16' },
        ]}
      />

      <Card size="small" style={{ borderRadius: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
          <Input placeholder="Search dispatch no, vehicle, driver…" prefix={<SearchOutlined />}
            value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 280 }} allowClear />
          <Select value={statusFilter} onChange={setStatus} style={{ width: 150 }} options={[
            { value: 'all', label: 'All Status' }, { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' }, { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
          ]} />
          <div style={{ marginLeft: 'auto' }}>
            <ColumnPicker allColumns={allColumns} visibleKeys={visibleKeys} onChange={setVisible} onReset={resetToDefault} />
          </div>
        </div>
        <Spin spinning={isLoading}>
          <Table dataSource={filtered} columns={columns} size="small" scroll={{ x: 'max-content' }} rowKey="id" pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}`, pageSizeOptions: ['10', '25', '50', '100'] }} />
        </Spin>
      </Card>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSubmit}
        confirmLoading={isSaving}
        icon={<ThunderboltOutlined />} color="#08979c"
        title={`Edit Trip — ${editRecord?.dispatchNo ?? ''}`}
        subtitle="Update trip details or log post-trip data"
        okText="Save Changes" width={680}
      >
        <Form form={form} layout="vertical" size="small">
          <FormSection title="Assignment" color="#08979c">
            <div style={{ display: 'flex', gap: 12 }}>
              <Form.Item name="vehicleReg" label="Vehicle" style={{ flex: 1 }} rules={[{ required: true }]}>
                <Select showSearch options={vehicleOptions} filterOption={filterOption} />
              </Form.Item>
              <Form.Item name="driverName" label="Driver" style={{ flex: 1 }} rules={[{ required: true }]}>
                <Select showSearch options={driverOptions} filterOption={filterOption} />
              </Form.Item>
            </div>
          </FormSection>
          <FormSection title="Post-Trip Data" color="#1677ff">
            <div style={{ display: 'flex', gap: 12 }}>
              <Form.Item name="distance"  label="Distance (km)" style={{ flex: 1 }}><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
              <Form.Item name="fuelUsed"  label="Fuel Used (L)" style={{ flex: 1 }}><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
              <Form.Item name="approvedBy" label="Approved By"  style={{ flex: 1 }}><Input /></Form.Item>
            </div>
            <Form.Item name="purpose" label="Purpose / Notes"><Input.TextArea rows={2} /></Form.Item>
          </FormSection>
        </Form>
      </FormModal>

      <Drawer open={!!viewRecord} onClose={() => setViewRecord(null)}
        title={viewRecord ? `Trip — ${viewRecord.dispatchNo}` : ''} width={480}
        extra={
          viewRecord && viewRecord.status !== 'completed' && STATUS_FLOW[viewRecord.status] && (
            <Button size="small" type="primary"
              onClick={() => { advanceMut.mutate(viewRecord.id); setViewRecord(null); }}>
              {STATUS_LABEL[viewRecord.status]}
            </Button>
          )
        }
      >
        {viewRecord && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="Dispatch No" >{viewRecord.dispatchNo}</Descriptions.Item>
            <Descriptions.Item label="Status"      ><Tag color={statusColor(viewRecord.status)}>{viewRecord.status?.replace(/_/g, ' ').toUpperCase()}</Tag></Descriptions.Item>
            <Descriptions.Item label="Vehicle"     >{viewRecord.vehicleReg}</Descriptions.Item>
            <Descriptions.Item label="Driver"      >{viewRecord.driverName}</Descriptions.Item>
            <Descriptions.Item label="Origin"      >{viewRecord.origin}</Descriptions.Item>
            <Descriptions.Item label="Destination" >{viewRecord.destination}</Descriptions.Item>
            <Descriptions.Item label="Date"        >{formatDate(viewRecord.date)}</Descriptions.Item>
            <Descriptions.Item label="Distance"    >{viewRecord.distance ? `${viewRecord.distance} km` : '—'}</Descriptions.Item>
            <Descriptions.Item label="Fuel Used"   >{viewRecord.fuelUsed ? `${viewRecord.fuelUsed} L` : '—'}</Descriptions.Item>
            <Descriptions.Item label="Start Time"  >{viewRecord.startTime ? formatDateTime(viewRecord.startTime) : '—'}</Descriptions.Item>
            <Descriptions.Item label="End Time"    >{viewRecord.endTime ? formatDateTime(viewRecord.endTime) : '—'}</Descriptions.Item>
            <Descriptions.Item label="Approved By" >{viewRecord.approvedBy ?? '—'}</Descriptions.Item>
            {viewRecord.purpose && <Descriptions.Item label="Purpose" span={2}>{viewRecord.purpose}</Descriptions.Item>}
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
