import {
  CarOutlined, CheckOutlined, CheckCircleOutlined, ClockCircleOutlined,
  CloseOutlined, EditOutlined, EyeOutlined,
  SafetyOutlined, SearchOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge, Button, Col, Descriptions, Drawer, Form, Input,
  InputNumber, Popconfirm, Row, Select, Spin, Table,
  Tabs, Tag, Tooltip, message,
} from 'antd';
import { useState } from 'react';
import ColumnPicker from '../components/ColumnPicker';
import FormModal, { FormSection } from '../components/FormModal';
import PageHeader from '../components/PageHeader';
import { useApiCrud } from '../hooks/useApiCrud';
import { useColumnPicker } from '../hooks/useColumnPicker';
import { filterOption, useDriverNameOptions, useDriverOptions, useVehicleOptions } from '../hooks/useLookupOptions';
import { dispatchService } from '../services/dispatchService';
import { requisitionService } from '../services/requisitionService';
import { useAuthStore } from '../stores/authStore';
import { formatDate, formatDateTime, statusColor } from '../utils/helpers';

/* ── Status flow for dispatches ───────────────────────────── */
const STATUS_FLOW   = { pending: 'approved', approved: 'in_progress', in_progress: 'completed' };
const STATUS_LABEL  = { pending: 'Approve', approved: 'Start Trip', in_progress: 'Mark Complete' };
const priorityColor = { normal: 'blue', high: 'orange', urgent: 'red' };

/* ── Pending approval column definitions ─────────────────── */
const APPROVAL_COLS_DEF = [
  {
    key: 'reqNo', columnTitle: 'Req No', title: 'Req No', dataIndex: 'reqNo', width: 95,
    render: (v) => <Tag color="blue" style={{ fontWeight: 600 }}>{v}</Tag>,
  },
  {
    key: 'requestedBy', columnTitle: 'Requested By', title: 'Requested By', dataIndex: 'requestedBy',
    width: 160,
    render: (v) => <span style={{ fontWeight: 600 }}>{v}</span>,
  },
  {
    key: 'department', columnTitle: 'Department', title: 'Dept', dataIndex: 'department', width: 100,
    render: (v) => v ? <Tag color="purple">{v}</Tag> : '—',
  },
  {
    key: 'purpose', columnTitle: 'Purpose', title: 'Purpose', dataIndex: 'purpose', ellipsis: true,
  },
  {
    key: 'fromLocation', columnTitle: 'From', title: 'From', dataIndex: 'fromLocation', ellipsis: true,
    render: (v) => <span style={{ color: '#1677ff', fontWeight: 500 }}>{v ?? '—'}</span>,
  },
  {
    key: 'toLocation', columnTitle: 'Destination', title: 'Destination', dataIndex: 'toLocation', ellipsis: true,
    render: (v) => <span style={{ color: '#52c41a', fontWeight: 500 }}>{v ?? '—'}</span>,
  },
  {
    key: 'date', columnTitle: 'Date', title: 'Date', dataIndex: 'date', width: 105,
    render: (d) => formatDate(d),
  },
  {
    key: 'passengers', columnTitle: 'Passengers', title: 'Pax', dataIndex: 'passengers', width: 55,
    render: (v) => v ?? 1,
  },
  {
    key: 'priority', columnTitle: 'Priority', title: 'Priority', dataIndex: 'priority', width: 85,
    render: (p) => <Tag color={priorityColor[p] ?? 'default'}>{p?.toUpperCase()}</Tag>,
  },
  {
    key: 'distanceKm', columnTitle: 'Distance', title: 'Distance', dataIndex: 'distanceKm',
    defaultVisible: false, width: 85,
    render: (v) => v ? `${v} km` : '—',
  },
  {
    key: 'remarks', columnTitle: 'Remarks', title: 'Remarks', dataIndex: 'remarks',
    defaultVisible: false, ellipsis: true,
    render: (v) => v ?? '—',
  },
];

/* ── Dispatch trip column definitions ────────────────────── */
const TRIP_COLS = [
  { key: 'dispatchNo',  columnTitle: 'Dispatch No',  title: 'Dispatch No',  dataIndex: 'dispatchNo' },
  { key: 'vehicleReg',  columnTitle: 'Vehicle',      title: 'Vehicle',      dataIndex: 'vehicleReg' },
  { key: 'driverName',  columnTitle: 'Driver',       title: 'Driver',       dataIndex: 'driverName' },
  { key: 'origin',      columnTitle: 'Origin',       title: 'Origin',       dataIndex: 'origin' },
  { key: 'destination', columnTitle: 'Destination',  title: 'Destination',  dataIndex: 'destination' },
  { key: 'date',        columnTitle: 'Date',         title: 'Date',         dataIndex: 'date',      render: (d) => formatDate(d) },
  { key: 'status',      columnTitle: 'Status',       title: 'Status',       dataIndex: 'status',    render: (s) => <Tag color={statusColor(s)}>{s?.replace(/_/g, ' ').toUpperCase()}</Tag> },
  { key: 'distance',    columnTitle: 'Distance',     title: 'Distance',     dataIndex: 'distance',  defaultVisible: false, render: (v) => v ? `${v} km` : '—' },
  { key: 'fuelUsed',    columnTitle: 'Fuel Used',    title: 'Fuel Used',    dataIndex: 'fuelUsed',  defaultVisible: false, render: (v) => v ? `${v} L` : '—' },
  { key: 'startTime',   columnTitle: 'Start Time',   title: 'Start Time',   dataIndex: 'startTime', defaultVisible: false, render: (v) => v ? formatDateTime(v) : '—' },
  { key: 'endTime',     columnTitle: 'End Time',     title: 'End Time',     dataIndex: 'endTime',   defaultVisible: false, render: (v) => v ? formatDateTime(v) : '—' },
  { key: 'approvedBy',  columnTitle: 'Approved By',  title: 'Approved By',  dataIndex: 'approvedBy', defaultVisible: false },
];

export default function ManageTrip() {
  const [tab, setTab]               = useState('approvals');
  const [reqSearch, setReqSearch]   = useState('');
  const [tripSearch, setTripSearch] = useState('');
  const [tripStatus, setTripStatus] = useState('all');

  /* modals / drawers */
  const [approveOpen,   setApproveOpen]   = useState(false);
  const [approvingReq,  setApprovingReq]  = useState(null);
  const [reviewReq,     setReviewReq]     = useState(null);   // review drawer
  const [viewTrip,      setViewTrip]      = useState(null);   // trip detail drawer
  const [editTrip,      setEditTrip]      = useState(null);
  const [editOpen,      setEditOpen]      = useState(false);

  const [approveForm] = Form.useForm();
  const [editForm]    = Form.useForm();

  const qc      = useQueryClient();
  const authUser = useAuthStore((s) => s.user);

  const vehicleOptions    = useVehicleOptions();
  const driverOptions     = useDriverOptions();
  const driverNameOptions = useDriverNameOptions();

  /* ── Column pickers (must be called before columns are built) */
  const {
    visibleColumns: approvalVisible,
    visibleKeys:    approvalKeys,
    setVisible:     setApprovalVisible,
    resetToDefault: resetApprovalCols,
    allColumns:     approvalAllCols,
  } = useColumnPicker('manage-trip-approvals', APPROVAL_COLS_DEF);

  const {
    visibleColumns: tripVisible,
    visibleKeys,
    setVisible,
    resetToDefault,
    allColumns,
  } = useColumnPicker('manage-trip', TRIP_COLS);

  /* ── Data ──────────────────────────────────────────────────── */
  const { data: reqData = [], isLoading: reqLoading } = useQuery({
    queryKey: ['requisitions'],
    queryFn: () => requisitionService.getAll().then((r) => r.data.data ?? r.data ?? []),
    staleTime: 30_000,
  });
  const pending = reqData.filter((r) => r.status === 'pending');

  const { data: tripData, isLoading: tripLoading, save: saveTrip, isSaving } =
    useApiCrud('vehicle-requisition', dispatchService, { onSaveSuccess: () => setEditOpen(false) });

  /* ── Mutations ─────────────────────────────────────────────── */
  const advanceMut = useMutation({
    mutationFn: (id) => dispatchService.advance(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicle-requisition'] }); message.success('Trip status updated'); },
    onError:   () => message.error('Failed to update status'),
  });

  const approveMut = useMutation({
    mutationFn: async ({ req, vehicle, driver, approvedBy }) => {
      await requisitionService.setStatus(req.id, { status: 'approved', approvedBy });
      await dispatchService.create({
        vehicleReg:  vehicle,
        driverName:  driver,
        origin:      (req.fromLocation ?? 'N/A').slice(0, 100),
        destination: (req.toLocation   ?? 'N/A').slice(0, 100),
        date:        req.date ?? req.fromDate ?? null,
        startTime:   req.fromDatetime ?? null,
        distance:    req.distanceKm ?? null,
        purpose:     req.purpose,
        approvedBy,
        status:      'approved',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requisitions'] });
      qc.invalidateQueries({ queryKey: ['vehicle-requisition'] });
      message.success('Booking approved — dispatch created');
      setApproveOpen(false);
      setApprovingReq(null);
      setReviewReq(null);
      setTab('trips');
    },
    onError: () => message.error('Failed to approve booking'),
  });

  const rejectMut = useMutation({
    mutationFn: (id) => requisitionService.setStatus(id, { status: 'rejected', approvedBy: authUser?.fullName ?? 'Admin' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requisitions'] }); message.success('Booking rejected'); },
    onError:   () => message.error('Failed to reject'),
  });

  function openApprove(req) {
    setApprovingReq(req);
    approveForm.resetFields();
    approveForm.setFieldValue('approvedBy', authUser?.fullName ?? 'Admin');
    setApproveOpen(true);
  }

  function handleApprove() {
    approveForm.validateFields().then(({ vehicle, driver, approvedBy }) => {
      approveMut.mutate({ req: approvingReq, vehicle, driver, approvedBy });
    });
  }

  /* ── Column definitions (built after hooks) ────────────────── */
  const approvalCols = [
    ...approvalVisible,
    {
      title: 'Actions', key: 'actions', fixed: 'right', width: 100,
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Tooltip title="Review">
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setReviewReq(r)} />
          </Tooltip>
          <Tooltip title="Approve">
            <Button type="link" size="small" icon={<CheckOutlined />}
              style={{ color: '#52c41a' }} onClick={() => openApprove(r)} />
          </Tooltip>
          <Tooltip title="Reject">
            <Popconfirm
              title="Reject this booking request?"
              okText="Reject" okButtonProps={{ danger: true }}
              onConfirm={() => rejectMut.mutate(r.id)}
            >
              <Button type="link" size="small" danger icon={<CloseOutlined />} />
            </Popconfirm>
          </Tooltip>
        </div>
      ),
    },
  ];

  const tripCols = [
    ...tripVisible,
    {
      title: 'Actions', key: 'actions', fixed: 'right', width: 100,
      render: (_, r) => {
        const ns = STATUS_FLOW[r.status];
        return (
          <div style={{ display: 'flex', gap: 2 }}>
            <Tooltip title="View">
              <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setViewTrip(r)} />
            </Tooltip>
            {r.status !== 'completed' && (
              <Tooltip title="Edit">
                <Button type="link" size="small" icon={<EditOutlined />}
                  onClick={() => { setEditTrip(r); editForm.setFieldsValue(r); setEditOpen(true); }} />
              </Tooltip>
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

  /* ── Filtered data ─────────────────────────────────────────── */
  const filteredReq = pending.filter((r) => {
    const q = reqSearch.toLowerCase();
    return !q || r.reqNo?.toLowerCase().includes(q)
      || r.requestedBy?.toLowerCase().includes(q)
      || r.purpose?.toLowerCase().includes(q)
      || r.department?.toLowerCase().includes(q);
  });

  const filteredTrips = tripData.filter((d) => {
    const q = tripSearch.toLowerCase();
    return (!q || d.dispatchNo?.toLowerCase().includes(q) || d.vehicleReg?.toLowerCase().includes(q) || d.driverName?.toLowerCase().includes(q))
      && (tripStatus === 'all' || d.status === tripStatus);
  });

  const inProgress = tripData.filter((d) => d.status === 'in_progress').length;
  const approved   = tripData.filter((d) => d.status === 'approved').length;

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div>
      <PageHeader
        icon={<ThunderboltOutlined />} color="#08979c" title="Manage Trip"
        subtitle="Review booking requests and manage active trips"
        stats={[
          { label: 'Pending Approval', value: pending.length, color: '#fa8c16' },
          { label: 'Approved',         value: approved,       color: '#52c41a' },
          { label: 'In Progress',      value: inProgress,     color: '#1677ff' },
        ]}
      />

      <Tabs
        activeKey={tab} onChange={setTab} type="card" size="small"
        style={{ background: '#fff', borderRadius: 14, padding: '12px 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}
        items={[
          /* ── Tab 1: Pending Approvals ──────────────────────── */
          {
            key: 'approvals',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <SafetyOutlined />
                Pending Approvals
                {pending.length > 0 && <Badge count={pending.length} size="small" color="#fa8c16" />}
              </span>
            ),
            children: (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
                  <Input
                    placeholder="Search req no, requester, dept, purpose…"
                    prefix={<SearchOutlined />}
                    value={reqSearch} onChange={(e) => setReqSearch(e.target.value)}
                    style={{ width: 320 }} allowClear
                  />
                  <div style={{ marginLeft: 'auto' }}>
                    <ColumnPicker allColumns={approvalAllCols} visibleKeys={approvalKeys}
                      onChange={setApprovalVisible} onReset={resetApprovalCols} />
                  </div>
                </div>
                <Spin spinning={reqLoading}>
                  {filteredReq.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 0', color: '#bbb' }}>
                      <SafetyOutlined style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
                      <div style={{ fontSize: 14 }}>No pending booking requests</div>
                    </div>
                  ) : (
                    <Table
                      dataSource={filteredReq} columns={approvalCols} rowKey="id"
                      size="small" scroll={{ x: 'max-content' }}
                      pagination={{ pageSize: 15, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
                    />
                  )}
                </Spin>
              </div>
            ),
          },

          /* ── Tab 2: Active Trips ────────────────────────────── */
          {
            key: 'trips',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CarOutlined />
                Active Trips
                {(approved + inProgress) > 0 && <Badge count={approved + inProgress} size="small" color="#1677ff" />}
              </span>
            ),
            children: (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
                  <Input
                    placeholder="Search dispatch no, vehicle, driver…"
                    prefix={<SearchOutlined />}
                    value={tripSearch} onChange={(e) => setTripSearch(e.target.value)}
                    style={{ width: 280 }} allowClear
                  />
                  <Select value={tripStatus} onChange={setTripStatus} style={{ width: 150 }} options={[
                    { value: 'all',         label: 'All Status'  },
                    { value: 'approved',    label: 'Approved'    },
                    { value: 'in_progress', label: 'In Progress' },
                    { value: 'completed',   label: 'Completed'   },
                  ]} />
                  <div style={{ marginLeft: 'auto' }}>
                    <ColumnPicker allColumns={allColumns} visibleKeys={visibleKeys}
                      onChange={setVisible} onReset={resetToDefault} />
                  </div>
                </div>
                <Spin spinning={tripLoading}>
                  <Table
                    dataSource={filteredTrips} columns={tripCols} rowKey="id"
                    size="small" scroll={{ x: 'max-content' }}
                    pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
                  />
                </Spin>
              </div>
            ),
          },
        ]}
      />

      {/* ── Review booking request drawer ──────────────────────── */}
      <Drawer
        open={!!reviewReq} onClose={() => setReviewReq(null)}
        title={reviewReq ? `Booking Request — ${reviewReq.reqNo}` : ''}
        width={480}
        extra={
          reviewReq && (
            <div style={{ display: 'flex', gap: 8 }}>
              <Popconfirm title="Reject this request?" okText="Reject" okButtonProps={{ danger: true }}
                onConfirm={() => { rejectMut.mutate(reviewReq.id); setReviewReq(null); }}>
                <Button size="small" danger icon={<CloseOutlined />}>Reject</Button>
              </Popconfirm>
              <Button size="small" type="primary" icon={<CheckOutlined />}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
                onClick={() => { setReviewReq(null); openApprove(reviewReq); }}>
                Approve
              </Button>
            </div>
          )
        }
      >
        {reviewReq && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="Req No"       ><Tag color="blue">{reviewReq.reqNo}</Tag></Descriptions.Item>
            <Descriptions.Item label="Status"       ><Tag color={statusColor(reviewReq.status)}>{reviewReq.status?.toUpperCase()}</Tag></Descriptions.Item>
            <Descriptions.Item label="Requested By" span={2}>{reviewReq.requestedBy}</Descriptions.Item>
            <Descriptions.Item label="Department"   >{reviewReq.department ? <Tag color="purple">{reviewReq.department}</Tag> : '—'}</Descriptions.Item>
            <Descriptions.Item label="Priority"     ><Tag color={priorityColor[reviewReq.priority] ?? 'default'}>{reviewReq.priority?.toUpperCase()}</Tag></Descriptions.Item>
            <Descriptions.Item label="Purpose"      span={2}>{reviewReq.purpose}</Descriptions.Item>
            <Descriptions.Item label="From"         span={2}><span style={{ color: '#1677ff' }}>{reviewReq.fromLocation ?? '—'}</span></Descriptions.Item>
            <Descriptions.Item label="Destination"  span={2}><span style={{ color: '#52c41a' }}>{reviewReq.toLocation ?? '—'}</span></Descriptions.Item>
            <Descriptions.Item label="Date"         >{formatDate(reviewReq.date)}</Descriptions.Item>
            <Descriptions.Item label="Passengers"   >{reviewReq.passengers ?? 1}</Descriptions.Item>
            {reviewReq.distanceKm && <Descriptions.Item label="Distance">{reviewReq.distanceKm} km</Descriptions.Item>}
            {reviewReq.remarks    && <Descriptions.Item label="Remarks" span={2}>{reviewReq.remarks}</Descriptions.Item>}
          </Descriptions>
        )}
      </Drawer>

      {/* ── Approve & Assign modal ─────────────────────────────── */}
      <FormModal
        open={approveOpen}
        onClose={() => { setApproveOpen(false); setApprovingReq(null); }}
        onSubmit={handleApprove}
        confirmLoading={approveMut.isPending}
        icon={<SafetyOutlined />} color="#52c41a"
        title={`Approve — ${approvingReq?.reqNo ?? ''}`}
        subtitle={`${approvingReq?.requestedBy ?? ''} · ${approvingReq?.purpose ?? ''}`}
        okText="Approve & Create Dispatch"
        width={560}
      >
        <Form form={approveForm} layout="vertical" size="small">
          {approvingReq && (
            <div style={{
              background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8,
              padding: '10px 14px', marginBottom: 16, fontSize: 12,
            }}>
              <div><b>From:</b> {approvingReq.fromLocation ?? '—'}</div>
              <div><b>To:</b>   {approvingReq.toLocation   ?? '—'}</div>
              <div style={{ marginTop: 4 }}>
                <b>Date:</b> {formatDate(approvingReq.date)} &nbsp;·&nbsp;
                <b>Pax:</b> {approvingReq.passengers ?? 1} &nbsp;·&nbsp;
                <b>Distance:</b> {approvingReq.distanceKm ? `${approvingReq.distanceKm} km` : '—'}
              </div>
            </div>
          )}
          <FormSection title="Assign Vehicle & Driver" color="#08979c">
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="vehicle" label="Vehicle" rules={[{ required: true, message: 'Select a vehicle' }]}>
                  <Select showSearch placeholder="Select vehicle" options={vehicleOptions} filterOption={filterOption} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="driver" label="Driver" rules={[{ required: true, message: 'Select a driver' }]}>
                  <Select showSearch placeholder="Select driver" options={driverNameOptions} filterOption={filterOption} />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>
          <FormSection title="Approval" color="#52c41a">
            <Form.Item name="approvedBy" label="Approved By" rules={[{ required: true }]}>
              <Input placeholder="Your name or title" />
            </Form.Item>
          </FormSection>
        </Form>
      </FormModal>

      {/* ── Edit trip modal ─────────────────────────────────────── */}
      <FormModal
        open={editOpen} onClose={() => setEditOpen(false)}
        onSubmit={() => editForm.validateFields().then((v) => saveTrip(editTrip?.id, v))}
        confirmLoading={isSaving}
        icon={<ThunderboltOutlined />} color="#08979c"
        title={`Edit Trip — ${editTrip?.dispatchNo ?? ''}`}
        subtitle="Update vehicle/driver assignment or post-trip data"
        okText="Save Changes" width={680}
      >
        <Form form={editForm} layout="vertical" size="small">
          <FormSection title="Assignment" color="#08979c">
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="vehicleReg" label="Vehicle" rules={[{ required: true }]}>
                  <Select showSearch options={vehicleOptions} filterOption={filterOption} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="driverName" label="Driver" rules={[{ required: true }]}>
                  <Select showSearch options={driverNameOptions} filterOption={filterOption} />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>
          <FormSection title="Post-Trip Data" color="#1677ff">
            <Row gutter={12}>
              <Col span={8}><Form.Item name="distance"   label="Distance (km)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
              <Col span={8}><Form.Item name="fuelUsed"   label="Fuel Used (L)" ><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
              <Col span={8}><Form.Item name="approvedBy" label="Approved By"   ><Input /></Form.Item></Col>
            </Row>
            <Form.Item name="purpose" label="Purpose / Notes"><Input.TextArea rows={2} /></Form.Item>
          </FormSection>
        </Form>
      </FormModal>

      {/* ── View trip detail drawer ─────────────────────────────── */}
      <Drawer
        open={!!viewTrip} onClose={() => setViewTrip(null)}
        title={viewTrip ? `Trip — ${viewTrip.dispatchNo}` : ''} width={480}
        extra={
          viewTrip && viewTrip.status !== 'completed' && STATUS_FLOW[viewTrip.status] && (
            <Button size="small" type="primary"
              onClick={() => { advanceMut.mutate(viewTrip.id); setViewTrip(null); }}>
              {STATUS_LABEL[viewTrip.status]}
            </Button>
          )
        }
      >
        {viewTrip && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="Dispatch No">{viewTrip.dispatchNo}</Descriptions.Item>
            <Descriptions.Item label="Status"><Tag color={statusColor(viewTrip.status)}>{viewTrip.status?.replace(/_/g, ' ').toUpperCase()}</Tag></Descriptions.Item>
            <Descriptions.Item label="Vehicle"    >{viewTrip.vehicleReg}</Descriptions.Item>
            <Descriptions.Item label="Driver"     >{viewTrip.driverName}</Descriptions.Item>
            <Descriptions.Item label="Origin"     >{viewTrip.origin}</Descriptions.Item>
            <Descriptions.Item label="Destination">{viewTrip.destination}</Descriptions.Item>
            <Descriptions.Item label="Date"       >{formatDate(viewTrip.date)}</Descriptions.Item>
            <Descriptions.Item label="Distance"   >{viewTrip.distance ? `${viewTrip.distance} km` : '—'}</Descriptions.Item>
            <Descriptions.Item label="Fuel Used"  >{viewTrip.fuelUsed ? `${viewTrip.fuelUsed} L` : '—'}</Descriptions.Item>
            <Descriptions.Item label="Start Time" >{viewTrip.startTime ? formatDateTime(viewTrip.startTime) : '—'}</Descriptions.Item>
            <Descriptions.Item label="End Time"   >{viewTrip.endTime ? formatDateTime(viewTrip.endTime) : '—'}</Descriptions.Item>
            <Descriptions.Item label="Approved By">{viewTrip.approvedBy ?? '—'}</Descriptions.Item>
            {viewTrip.purpose && <Descriptions.Item label="Purpose" span={2}>{viewTrip.purpose}</Descriptions.Item>}
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
