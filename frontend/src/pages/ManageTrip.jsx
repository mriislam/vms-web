import {
  CarOutlined, CheckOutlined, CheckCircleOutlined, ClockCircleOutlined,
  CloseOutlined, EditOutlined, EnvironmentOutlined, EyeOutlined,
  InfoCircleOutlined, PlusOutlined, SafetyOutlined, SearchOutlined,
  SendOutlined, ThunderboltOutlined, UserOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge, Button, Col, DatePicker, Descriptions, Drawer, Form, Input,
  InputNumber, Modal, Popconfirm, Row, Select, Spin, Table,
  Tabs, Tag, Tooltip, Typography, message,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import ColumnPicker from '../components/ColumnPicker';
import FormModal, { FormSection } from '../components/FormModal';
import PageHeader from '../components/PageHeader';

const { Text } = Typography;
import { useApiCrud } from '../hooks/useApiCrud';
import { useColumnPicker } from '../hooks/useColumnPicker';
import { filterOption, useDriverNameOptions, useDriverOptions, useVehicleOptions, useVehicleWithDriverMap } from '../hooks/useLookupOptions';
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
  const { vehicles: allVehicles, drivers: allDrivers, driverByName } = useVehicleWithDriverMap();

  // selectedVehicleInfo is set when user picks a vehicle in approve form
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [driverAutoFilled, setDriverAutoFilled] = useState(false);

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

  // Build vehicleReg → last driver map from dispatch history (for auto-fill)
  const vehicleLastDriverMap = {};
  tripData.forEach((d) => {
    if (d.vehicleReg && d.driverName && !vehicleLastDriverMap[d.vehicleReg]) {
      vehicleLastDriverMap[d.vehicleReg] = d.driverName;
    }
  });

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
    setSelectedVehicle(null);
    setDriverAutoFilled(false);
    setApproveOpen(true);
  }

  function onVehicleSelect(vehicleReg) {
    const vInfo = allVehicles.find((v) => v.regNo === vehicleReg);
    setSelectedVehicle(vInfo ?? { regNo: vehicleReg });

    // Auto-fill driver from dispatch history
    const lastDriver = vehicleLastDriverMap[vehicleReg];
    if (lastDriver) {
      approveForm.setFieldValue('driver', lastDriver);
      setDriverAutoFilled(true);
    } else {
      setDriverAutoFilled(false);
    }
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
                  onClick={() => {
                    setEditTrip(r);
                    editForm.setFieldsValue({
                      ...r,
                      startTime: r.startTime ? dayjs(r.startTime) : null,
                      endTime:   r.endTime   ? dayjs(r.endTime)   : null,
                    });
                    setEditOpen(true);
                  }} />
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

      {/* ══ Approve & Assign Modal — beautifully redesigned ══════ */}
      <Modal
        open={approveOpen}
        onCancel={() => { setApproveOpen(false); setApprovingReq(null); setSelectedVehicle(null); }}
        footer={null}
        width={860}
        style={{ top: '4vh', padding: 0 }}
        destroyOnClose
        closeIcon={null}
        styles={{
          content: { padding: 0, borderRadius: 22, overflow: 'hidden' },
          mask:    { backdropFilter: 'blur(8px)' },
        }}
      >
        {/* ── Gradient header ────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg,#059669 0%,#0891b2 60%,#6366f1 100%)',
          padding: '16px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: '50%', bottom: -50, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, zIndex: 1 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 13, background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.35)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff',
            }}>
              <SafetyOutlined />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
                Approve — {approvingReq?.reqNo}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>
                {approvingReq?.requestedBy} · {approvingReq?.purpose}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, zIndex: 1 }}>
            <span style={{
              background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700, color: '#fff',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Tag color={({'normal':'blue','high':'orange','urgent':'red'})[approvingReq?.priority] ?? 'default'}
                style={{ margin: 0, fontSize: 11 }}>
                {approvingReq?.priority?.toUpperCase()}
              </Tag>
              · {approvingReq?.department}
            </span>
            <Button
              type="text" icon={<CloseOutlined />} onClick={() => { setApproveOpen(false); setApprovingReq(null); }}
              style={{ color: '#fff', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            />
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        <div style={{ background: 'linear-gradient(180deg,#f8fbff 0%,#ffffff 100%)', padding: '24px 28px 0' }}>
          <Form form={approveForm} layout="vertical" size="middle">

            {/* ── TRIP SUMMARY CARD ─────────────────────────── */}
            {approvingReq && (
              <div style={{
                background: '#fff', borderRadius: 16, border: '1px solid rgba(99,102,241,0.12)',
                padding: '18px 22px', marginBottom: 22,
                boxShadow: '0 4px 20px rgba(99,102,241,0.08)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <EnvironmentOutlined style={{ color: '#6366f1', fontSize: 15 }} />
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#6366f1', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Trip Details
                  </span>
                </div>

                {/* Two-column: route LEFT, stats RIGHT — no wrapping */}
                <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>

                  {/* LEFT — route connector */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4, flexShrink: 0 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 0 3px rgba(99,102,241,0.2)' }} />
                        <div style={{ width: 2, height: 34, background: 'linear-gradient(#6366f1,#10b981)', margin: '5px 0' }} />
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: '#10b981', boxShadow: '0 0 0 3px rgba(16,185,129,0.2)' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#6366f1', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {approvingReq.fromLocation ?? 'Not specified'}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>Pickup location</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {approvingReq.toLocation ?? 'Not specified'}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Drop-off destination</div>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ width: 1, background: 'rgba(99,102,241,0.12)', margin: '0 20px', flexShrink: 0 }} />

                  {/* RIGHT — 4 stat cells in a 2×2 grid */}
                  <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 0' }}>
                    {[
                      { label: 'Date',       value: formatDate(approvingReq.date),                                 color: '#6366f1' },
                      { label: 'Passengers', value: `${approvingReq.passengers ?? 1} pax`,                        color: '#8b5cf6' },
                      { label: 'Distance',   value: approvingReq.distanceKm ? `${approvingReq.distanceKm} km` : '—', color: '#06b6d4' },
                      { label: 'Priority',   value: approvingReq.priority?.toUpperCase(),
                        color: approvingReq.priority === 'urgent' ? '#f43f5e' : approvingReq.priority === 'high' ? '#f97316' : '#10b981' },
                    ].map((s, i) => (
                      <div key={s.label} style={{
                        textAlign: 'center', padding: '6px 20px',
                        borderLeft:   i % 2 === 1 ? '1px solid rgba(99,102,241,0.1)' : undefined,
                        borderBottom: i < 2       ? '1px solid rgba(99,102,241,0.1)' : undefined,
                      }}>
                        <div style={{ fontSize: 17, fontWeight: 900, color: s.color, lineHeight: 1.2, whiteSpace: 'nowrap' }}>{s.value}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── SECTION: Assign Vehicle & Driver ─────────────── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 4, height: 18, borderRadius: 3, background: 'linear-gradient(#06b6d4,#6366f1)' }} />
                <CarOutlined style={{ color: '#06b6d4', fontSize: 14 }} />
                <span style={{ fontWeight: 800, fontSize: 13, color: '#06b6d4', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Assign Vehicle &amp; Driver
                </span>
              </div>

              <Row gutter={16}>
                {/* Vehicle select */}
                <Col span={12}>
                  <Form.Item name="vehicle" label={<span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Vehicle</span>}
                    rules={[{ required: true, message: 'Select a vehicle' }]} style={{ marginBottom: 0 }}>
                    <Select
                      showSearch placeholder="Select vehicle (reg no, make, model)…"
                      options={vehicleOptions} filterOption={filterOption}
                      style={{ fontSize: 14 }}
                      onChange={onVehicleSelect}
                      optionRender={(opt) => (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 9, background: 'rgba(6,182,212,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <CarOutlined style={{ color: '#06b6d4', fontSize: 16 }} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{opt.data.value}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{opt.data.make} {opt.data.model}</div>
                          </div>
                          {vehicleLastDriverMap[opt.data.value] && (
                            <span style={{
                              marginLeft: 'auto', fontSize: 10, color: '#10b981', fontWeight: 600,
                              background: 'rgba(16,185,129,0.1)', borderRadius: 6, padding: '2px 6px',
                            }}>
                              Has driver
                            </span>
                          )}
                        </div>
                      )}
                    />
                  </Form.Item>

                  {/* Vehicle info card */}
                  {selectedVehicle && (
                    <div style={{
                      marginTop: 10, background: 'rgba(6,182,212,0.06)',
                      border: '1px solid rgba(6,182,212,0.2)', borderRadius: 12,
                      padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center',
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, background: 'rgba(6,182,212,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <CarOutlined style={{ color: '#06b6d4', fontSize: 18 }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#06b6d4' }}>{selectedVehicle.regNo}</div>
                        <div style={{ fontSize: 12, color: '#475569', marginTop: 1 }}>
                          {selectedVehicle.make} {selectedVehicle.model} · {selectedVehicle.type} · {selectedVehicle.fuelType}
                        </div>
                        <div style={{ fontSize: 11, marginTop: 3 }}>
                          <span style={{
                            color: selectedVehicle.status === 'active' ? '#10b981' : '#f59e0b',
                            fontWeight: 600, background: selectedVehicle.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                            padding: '1px 8px', borderRadius: 6,
                          }}>
                            ● {selectedVehicle.status?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </Col>

                {/* Driver select */}
                <Col span={12}>
                  <Form.Item
                    name="driver"
                    label={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Driver</span>
                        {driverAutoFilled && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: 'rgba(16,185,129,0.12)', color: '#10b981',
                            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                            border: '1px solid rgba(16,185,129,0.25)',
                          }}>
                            <CheckCircleOutlined style={{ fontSize: 10 }} />
                            Auto-filled from history
                          </span>
                        )}
                      </div>
                    }
                    rules={[{ required: true, message: 'Select a driver' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      showSearch placeholder="Select driver or auto-fills when vehicle chosen…"
                      options={driverNameOptions} filterOption={filterOption}
                      style={{ fontSize: 14 }}
                      onChange={() => setDriverAutoFilled(false)}
                      optionRender={(opt) => {
                        const d = driverByName[opt.value];
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontWeight: 800, fontSize: 13,
                            }}>
                              {(opt.value ?? '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{opt.value}</div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>
                                {d ? `Lic: ${d.licenseNo} · ${d.phone}` : opt.label}
                              </div>
                            </div>
                            {d && (
                              <span style={{
                                marginLeft: 'auto', fontSize: 10, padding: '2px 6px', borderRadius: 6,
                                background: d.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                color: d.status === 'active' ? '#10b981' : '#ef4444', fontWeight: 600,
                              }}>
                                {d.status}
                              </span>
                            )}
                          </div>
                        );
                      }}
                    />
                  </Form.Item>

                  {!selectedVehicle && (
                    <div style={{
                      marginTop: 10, background: 'rgba(99,102,241,0.04)',
                      border: '1px dashed rgba(99,102,241,0.25)', borderRadius: 12,
                      padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center',
                    }}>
                      <InfoCircleOutlined style={{ color: '#6366f1', fontSize: 16, flexShrink: 0 }} />
                      <Text style={{ fontSize: 12, color: '#6366f1' }}>
                        Select a vehicle first — driver will auto-fill based on last assignment history.
                      </Text>
                    </div>
                  )}
                </Col>
              </Row>
            </div>

            {/* ── SECTION: Approval Authority ───────────────────── */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 4, height: 18, borderRadius: 3, background: 'linear-gradient(#10b981,#059669)' }} />
                <UserOutlined style={{ color: '#10b981', fontSize: 14 }} />
                <span style={{ fontWeight: 800, fontSize: 13, color: '#10b981', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Approval Authority
                </span>
              </div>
              <Form.Item name="approvedBy"
                label={<span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Approved By</span>}
                rules={[{ required: true, message: 'Required' }]}
                style={{ marginBottom: 0 }}>
                <Input placeholder="Full name or designation of approving authority…"
                  style={{ height: 42, fontSize: 14, borderRadius: 10 }}
                  prefix={<UserOutlined style={{ color: '#94a3b8' }} />} />
              </Form.Item>
            </div>

          </Form>
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid rgba(99,102,241,0.1)',
          background: 'rgba(248,251,255,0.98)',
          display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center',
        }}>
          <div style={{ flex: 1, fontSize: 13, color: '#94a3b8' }}>
            {selectedVehicle
              ? <span style={{ color: '#06b6d4', fontWeight: 600 }}>Vehicle: {selectedVehicle.regNo} — {selectedVehicle.make} {selectedVehicle.model}</span>
              : 'Select vehicle and driver to create dispatch'}
          </div>
          <Button
            onClick={() => { setApproveOpen(false); setApprovingReq(null); }}
            style={{ borderRadius: 10, height: 42, minWidth: 90, fontSize: 14, fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            type="primary" icon={<CheckCircleOutlined />}
            loading={approveMut.isPending}
            onClick={handleApprove}
            style={{
              borderRadius: 10, height: 42, minWidth: 220, fontWeight: 700, fontSize: 14,
              background: 'linear-gradient(135deg,#059669,#0891b2)',
              border: 'none', boxShadow: '0 4px 16px rgba(5,150,105,0.4)',
            }}
          >
            Approve &amp; Create Dispatch
          </Button>
        </div>
      </Modal>

      {/* ══ Edit Trip Modal — redesigned ══════════════════════════ */}
      <Modal
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        footer={null}
        width={900}
        style={{ top: '3vh', padding: 0 }}
        destroyOnClose
        closeIcon={null}
        styles={{
          content: { padding: 0, borderRadius: 22, overflow: 'hidden' },
          mask:    { backdropFilter: 'blur(8px)' },
        }}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div style={{
          background: editTrip?.status === 'in_progress'
            ? 'linear-gradient(135deg,#0891b2 0%,#6366f1 60%,#8b5cf6 100%)'
            : editTrip?.status === 'approved'
            ? 'linear-gradient(135deg,#059669 0%,#06b6d4 100%)'
            : 'linear-gradient(135deg,#374151 0%,#1e293b 100%)',
          padding: '16px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, zIndex: 1 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 13, background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.35)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff',
            }}>
              <ThunderboltOutlined />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
                Edit Trip — {editTrip?.dispatchNo}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 1 }}>
                {editTrip?.origin} → {editTrip?.destination}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, zIndex: 1, alignItems: 'center' }}>
            <Tag style={{
              background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff', fontWeight: 800, fontSize: 12, borderRadius: 20, padding: '4px 14px',
            }}>
              {editTrip?.status?.replace(/_/g,' ').toUpperCase()}
            </Tag>
            <Button
              type="text" icon={<CloseOutlined />} onClick={() => setEditOpen(false)}
              style={{ color: '#fff', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            />
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div style={{ background: '#f8faff', padding: '14px 20px 0', maxHeight: '80vh', overflowY: 'auto' }}>
          <Form form={editForm} layout="vertical" size="small">

            {/* ── Compact trip summary strip ─────────────────────── */}
            {editTrip && (
              <div style={{
                background: '#fff', borderRadius: 12, border: '1px solid rgba(99,102,241,0.1)',
                padding: '10px 16px', marginBottom: 12,
                boxShadow: '0 2px 10px rgba(99,102,241,0.06)',
                display: 'flex', alignItems: 'center', gap: 0,
              }}>
                {/* Route */}
                <div style={{ flex: 1, display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 0 2px rgba(99,102,241,0.2)' }} />
                    <div style={{ width: 1.5, height: 20, background: 'linear-gradient(#6366f1,#10b981)', margin: '3px 0' }} />
                    <div style={{ width: 9, height: 9, borderRadius: 2, background: '#10b981', boxShadow: '0 0 0 2px rgba(16,185,129,0.2)' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#6366f1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{editTrip.origin}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{editTrip.destination}</div>
                  </div>
                </div>
                <div style={{ width: 1, background: 'rgba(99,102,241,0.1)', alignSelf: 'stretch', margin: '0 14px', flexShrink: 0 }} />
                {/* Inline stats */}
                <div style={{ display: 'flex', gap: 0, flexShrink: 0 }}>
                  {[
                    { label: 'Vehicle',  value: editTrip.vehicleReg,  color: '#06b6d4' },
                    { label: 'Driver',   value: editTrip.driverName,  color: '#8b5cf6' },
                    { label: 'Date',     value: formatDate(editTrip.date), color: '#6366f1' },
                    { label: 'Distance', value: editTrip.distance ? `${editTrip.distance} km` : '—', color: '#10b981' },
                    { label: 'Fuel',     value: editTrip.fuelUsed ? `${editTrip.fuelUsed} L` : '—', color: '#f59e0b' },
                  ].map((s, i) => (
                    <div key={s.label} style={{
                      textAlign: 'center', padding: '0 12px',
                      borderLeft: i > 0 ? '1px solid rgba(99,102,241,0.08)' : undefined,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: s.color, whiteSpace: 'nowrap' }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══ IN PROGRESS — Live Trip Controls ═════════════════ */}
            {editTrip?.status === 'in_progress' && (
              <div style={{
                background: 'rgba(6,182,212,0.04)', border: '1.5px solid rgba(6,182,212,0.22)',
                borderRadius: 12, padding: '12px 16px', marginBottom: 12,
              }}>
                {/* Section label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                  <div style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(#06b6d4,#6366f1)' }} />
                  <div className="live-dot" />
                  <span style={{ fontWeight: 800, fontSize: 11, color: '#06b6d4', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Live Trip Controls</span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>· Trip is currently in progress</span>
                </div>

                {/* Both controls in one row */}
                <Row gutter={12}>
                  <Col span={12}>
                    <div style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(6,182,212,0.18)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <ClockCircleOutlined style={{ color: '#06b6d4', fontSize: 13 }} />
                        <span style={{ fontWeight: 700, fontSize: 12, color: '#06b6d4' }}>Extend Return Time</span>
                        {editTrip?.endTime && (
                          <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>
                            Now: {formatDateTime(editTrip.endTime)}
                          </span>
                        )}
                      </div>
                      <Form.Item name="endTime" style={{ marginBottom: 0 }}>
                        <DatePicker showTime={{ format: 'HH:mm' }} format="DD MMM YY HH:mm"
                          placeholder="Set new return time…" style={{ width: '100%' }}
                          disabledDate={(d) => d && d.isBefore(dayjs().startOf('day'))}
                          getPopupContainer={() => document.body} popupStyle={{ zIndex: 1100 }} />
                      </Form.Item>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(99,102,241,0.18)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <PlusOutlined style={{ color: '#6366f1', fontSize: 12 }} />
                        <span style={{ fontWeight: 700, fontSize: 12, color: '#6366f1' }}>Add Next Stop</span>
                        <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>
                          Current: <strong style={{ color: '#10b981' }}>{editTrip?.destination?.split(',')[0]}</strong>
                        </span>
                      </div>
                      <Form.Item name="nextStop" style={{ marginBottom: 0 }}>
                        <Input prefix={<EnvironmentOutlined style={{ color: '#6366f1', fontSize: 12 }} />}
                          placeholder="Enter next stop or waypoint…" style={{ borderRadius: 8 }} />
                      </Form.Item>
                    </div>
                  </Col>
                </Row>

                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <InfoCircleOutlined style={{ color: '#94a3b8', fontSize: 11 }} />
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    Save changes, then use <strong style={{ color: '#10b981' }}>Mark Complete</strong> from the table to close the trip.
                  </span>
                </div>
              </div>
            )}

            {/* ══ Assignment + Trip Data in ONE compact block ═══════ */}
            <div style={{
              background: '#fff', borderRadius: 12, border: '1px solid rgba(99,102,241,0.1)',
              padding: '14px 16px', marginBottom: 12,
              boxShadow: '0 2px 10px rgba(99,102,241,0.04)',
            }}>
              {/* Vehicle & Driver */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <div style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(#06b6d4,#6366f1)' }} />
                <CarOutlined style={{ color: '#06b6d4', fontSize: 13 }} />
                <span style={{ fontWeight: 800, fontSize: 11, color: '#06b6d4', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Vehicle &amp; Driver</span>
              </div>
              <Row gutter={12} style={{ marginBottom: 14 }}>
                <Col span={12}>
                  <Form.Item name="vehicleReg" label={<span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Vehicle</span>}
                    rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                    <Select showSearch options={vehicleOptions} filterOption={filterOption} placeholder="Select vehicle…" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="driverName" label={<span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Driver</span>}
                    rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                    <Select showSearch options={driverNameOptions} filterOption={filterOption} placeholder="Select driver…" />
                  </Form.Item>
                </Col>
              </Row>

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(99,102,241,0.08)', margin: '0 -16px 14px', padding: '0 16px' }} />

              {/* Trip Data */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <div style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(#6366f1,#8b5cf6)' }} />
                <ThunderboltOutlined style={{ color: '#6366f1', fontSize: 13 }} />
                <span style={{ fontWeight: 800, fontSize: 11, color: '#6366f1', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Trip Data</span>
              </div>
              <Row gutter={12} style={{ marginBottom: 10 }}>
                <Col span={5}>
                  <Form.Item name="distance" label={<span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Distance (km)</span>} style={{ marginBottom: 0 }}>
                    <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                  </Form.Item>
                </Col>
                <Col span={5}>
                  <Form.Item name="fuelUsed" label={<span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Fuel Used (L)</span>} style={{ marginBottom: 0 }}>
                    <InputNumber style={{ width: '100%' }} min={0} step={0.5} placeholder="0.0" />
                  </Form.Item>
                </Col>
                <Col span={7}>
                  <Form.Item name="startTime" label={<span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Start Time</span>} style={{ marginBottom: 0 }}>
                    <DatePicker showTime={{ format: 'HH:mm' }} format="DD MMM YY HH:mm"
                      placeholder="Start…" style={{ width: '100%' }}
                      getPopupContainer={() => document.body} popupStyle={{ zIndex: 1100 }} />
                  </Form.Item>
                </Col>
                <Col span={7}>
                  <Form.Item name="approvedBy" label={<span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Approved By</span>} style={{ marginBottom: 0 }}>
                    <Input placeholder="Name…" style={{ borderRadius: 8 }} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="purpose" label={<span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Purpose / Notes</span>} style={{ marginBottom: 0 }}>
                <Input.TextArea rows={2} placeholder="Trip purpose, special instructions, or updates…" style={{ resize: 'none', borderRadius: 8 }} />
              </Form.Item>
            </div>

          </Form>
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div style={{
          padding: '10px 20px',
          borderTop: '1px solid rgba(99,102,241,0.1)',
          background: 'rgba(248,251,255,0.98)',
          display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center',
        }}>
          <div style={{ flex: 1, fontSize: 12, color: '#94a3b8' }}>
            {editTrip?.status === 'in_progress' && (
              <span style={{ color: '#06b6d4', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="live-dot" />
                Trip in progress — changes saved immediately
              </span>
            )}
          </div>
          <Button onClick={() => setEditOpen(false)} style={{ borderRadius: 9, height: 36, minWidth: 80, fontSize: 13, fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            type="primary" icon={<SendOutlined />} loading={isSaving}
            onClick={() => {
              editForm.validateFields().then((v) => {
                // Handle nextStop — append to purpose if provided
                const vals = { ...v };
                if (vals.nextStop) {
                  vals.purpose = (vals.purpose ? vals.purpose + '\n\n' : '') + '📍 Next Stop: ' + vals.nextStop;
                  vals.destination = vals.nextStop;
                  delete vals.nextStop;
                }
                // Format datetime fields
                if (vals.endTime)   vals.endTime   = dayjs(vals.endTime).format('YYYY-MM-DDTHH:mm:ss');
                if (vals.startTime) vals.startTime = dayjs(vals.startTime).format('YYYY-MM-DDTHH:mm:ss');
                saveTrip(editTrip?.id, vals);
              });
            }}
            style={{
              borderRadius: 9, height: 36, minWidth: 140, fontWeight: 700, fontSize: 13,
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              border: 'none', boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
            }}
          >
            Save Changes
          </Button>
        </div>
      </Modal>

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
