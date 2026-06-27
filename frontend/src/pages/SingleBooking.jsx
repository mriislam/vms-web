import {
  CheckCircleOutlined, ClockCircleOutlined, CloseOutlined,
  DeleteOutlined, EditOutlined, EnvironmentOutlined, EyeOutlined,
  PlusOutlined, SearchOutlined, SendOutlined, ThunderboltOutlined, UserOutlined,
} from '@ant-design/icons';
import {
  Badge, Button, Col, DatePicker, Descriptions, Drawer, Form, Input,
  InputNumber, Modal, Popconfirm, Row, Select, Spin, Table, Tag,
  Tooltip, Typography, message,
} from 'antd';
import dayjs from 'dayjs';
import { useCallback, useState } from 'react';
import BookingMapPanel from '../components/BookingMapPanel';
import ColumnPicker from '../components/ColumnPicker';
import LocationPicker from '../components/LocationPicker';
import PageHeader from '../components/PageHeader';
import { useApiCrud } from '../hooks/useApiCrud';
import { useColumnPicker } from '../hooks/useColumnPicker';
import { filterOption, useEmployeeOptions } from '../hooks/useLookupOptions';
import { requisitionService } from '../services/requisitionService';
import { formatDate, statusColor } from '../utils/helpers';

const { Text } = Typography;

const DEPTS         = ['HQ', 'HR', 'Finance', 'Operations', 'IT', 'Admin', 'Logistics'];
const priorityColor = { normal: 'blue', high: 'orange', urgent: 'red' };

const COLS_DEF = [
  { key: 'reqNo',        columnTitle: 'Booking No',   title: 'Booking No',   dataIndex: 'reqNo' },
  { key: 'requestedBy',  columnTitle: 'Requested By', title: 'Requested By', dataIndex: 'requestedBy' },
  { key: 'vehicleReg',   columnTitle: 'Vehicle',      title: 'Vehicle',      dataIndex: 'vehicleReg',  render: (v) => v ?? '—' },
  { key: 'purpose',      columnTitle: 'Purpose',      title: 'Purpose',      dataIndex: 'purpose' },
  { key: 'date',         columnTitle: 'Date',         title: 'Date',         dataIndex: 'date',         render: (d) => formatDate(d) },
  { key: 'priority',     columnTitle: 'Priority',     title: 'Priority',     dataIndex: 'priority',     render: (p) => <Tag color={priorityColor[p]}>{p?.toUpperCase()}</Tag> },
  { key: 'status',       columnTitle: 'Status',       title: 'Status',       dataIndex: 'status',       render: (s) => <Tag color={statusColor(s)}>{s?.toUpperCase()}</Tag> },
  { key: 'department',   columnTitle: 'Department',   title: 'Dept',         dataIndex: 'department',   defaultVisible: false },
  { key: 'fromLocation', columnTitle: 'From',         title: 'From',         dataIndex: 'fromLocation', defaultVisible: false },
  { key: 'toLocation',   columnTitle: 'Destination',  title: 'Destination',  dataIndex: 'toLocation',   defaultVisible: false },
  { key: 'distanceKm',   columnTitle: 'Distance',     title: 'km',           dataIndex: 'distanceKm',   defaultVisible: false, render: (v) => v ? `${v} km` : '—' },
  { key: 'fromDatetime', columnTitle: 'Depart',       title: 'Depart',       dataIndex: 'fromDatetime', defaultVisible: false, render: (d) => d ? dayjs(d).format('DD MMM YYYY HH:mm') : '—' },
  { key: 'toDatetime',   columnTitle: 'Return',       title: 'Return',       dataIndex: 'toDatetime',   defaultVisible: false, render: (d) => d ? dayjs(d).format('DD MMM YYYY HH:mm') : '—' },
  { key: 'passengers',   columnTitle: 'Passengers',   title: 'Pax',          dataIndex: 'passengers',   defaultVisible: false },
  { key: 'approvedBy',   columnTitle: 'Approved By',  title: 'Approved By',  dataIndex: 'approvedBy',   defaultVisible: false, render: (v) => v ?? '—' },
];

async function calcDistanceKm(from, to) {
  if (!window.google?.maps) return null;
  return new Promise((resolve) => {
    new window.google.maps.DistanceMatrixService().getDistanceMatrix(
      {
        origins:      [{ lat: from.lat, lng: from.lng }],
        destinations: [{ lat: to.lat,   lng: to.lng   }],
        travelMode:   window.google.maps.TravelMode.DRIVING,
      },
      (resp, status) => {
        if (status !== 'OK') { resolve(null); return; }
        const el = resp.rows?.[0]?.elements?.[0];
        resolve(el?.status === 'OK' ? Math.round(el.distance.value / 1000) : null);
      }
    );
  });
}

/* ─── Section label for form ────────────────────────────────────── */
function SLabel({ title, color = '#1677ff', icon }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      margin: '18px 0 10px',
      paddingBottom: 8,
      borderBottom: `1px solid ${color}22`,
    }}>
      <div style={{ width: 3, height: 14, borderRadius: 2, background: color, flexShrink: 0 }} />
      {icon && <span style={{ color, fontSize: 12 }}>{icon}</span>}
      <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: 0.8, color, textTransform: 'uppercase' }}>
        {title}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function SingleBooking() {
  const [search,      setSearch]      = useState('');
  const [statusFilter,setStatus]      = useState('all');
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editRecord,  setEditRecord]  = useState(null);
  const [viewRecord,  setViewRecord]  = useState(null);
  const [fromLoc,     setFromLoc]     = useState(null);
  const [toLoc,       setToLoc]       = useState(null);
  const [distKm,      setDistKm]      = useState(null);
  const [routeInfo,   setRouteInfo]   = useState(null);
  const [calcingDist, setCalcingDist] = useState(false);
  const [form] = Form.useForm();
  const watchDepart = Form.useWatch('fromDatetime', form);

  const { data, isLoading, save, remove, isSaving } = useApiCrud('requisitions', requisitionService, {
    onSaveSuccess: () => { setModalOpen(false); message.success('Booking submitted successfully'); },
  });

  const employeeOptions = useEmployeeOptions();

  const { visibleColumns, visibleKeys, setVisible, resetToDefault, allColumns } =
    useColumnPicker('single-booking', COLS_DEF);

  const columns = [
    ...visibleColumns,
    {
      title: 'Actions', key: 'actions', fixed: 'right', width: 110,
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 2 }}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setViewRecord(r)} />
          {r.status === 'pending' && (
            <>
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
              <Popconfirm title="Delete this booking?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => remove(r.id)}>
                <Button type="link" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </>
          )}
        </div>
      ),
    },
  ];

  const filtered = data.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q || r.reqNo?.toLowerCase().includes(q) || r.requestedBy?.toLowerCase().includes(q) || r.purpose?.toLowerCase().includes(q))
      && (statusFilter === 'all' || r.status === statusFilter)
    );
  });

  function resetLocState() {
    setFromLoc(null); setToLoc(null); setDistKm(null); setRouteInfo(null);
  }

  function openAdd() {
    setEditRecord(null);
    form.resetFields();
    form.setFieldValue('date', dayjs());   // auto-stamp today
    resetLocState();
    setModalOpen(true);
  }

  function openEdit(r) {
    setEditRecord(r);
    const fl = r.fromLat ? { address: r.fromLocation, lat: r.fromLat, lng: r.fromLng } : null;
    const tl = r.toLat   ? { address: r.toLocation,   lat: r.toLat,   lng: r.toLng   } : null;
    setFromLoc(fl); setToLoc(tl);
    setDistKm(r.distanceKm ?? null);
    setRouteInfo(null);
    form.setFieldsValue({
      ...r,
      date:         r.date         ? dayjs(r.date)         : dayjs(),
      fromDatetime: r.fromDatetime ? dayjs(r.fromDatetime) : null,
      toDatetime:   r.toDatetime   ? dayjs(r.toDatetime)   : null,
    });
    setModalOpen(true);
  }

  const handleLocationChange = useCallback(async (which, loc) => {
    const newFrom = which === 'from' ? loc : fromLoc;
    const newTo   = which === 'to'   ? loc : toLoc;
    if (which === 'from') setFromLoc(loc);
    else setToLoc(loc);

    if (newFrom?.lat && newTo?.lat) {
      setCalcingDist(true);
      const km = await calcDistanceKm(newFrom, newTo);
      setDistKm(km);
      if (km) form.setFieldValue('distanceKm', km);
      setCalcingDist(false);
    }
  }, [fromLoc, toLoc, form]);

  function handleSubmit() {
    form.validateFields().then((v) => {
      const requestDate = (v.date ?? dayjs()).format('YYYY-MM-DD');
      save(editRecord?.id ?? null, {
        requestedBy:  v.requestedBy,
        department:   v.department,
        purpose:      v.purpose,
        priority:     v.priority,
        remarks:      v.remarks ?? null,
        passengers:   v.passengers ?? 1,
        date:         requestDate,
        fromDate:     v.fromDatetime ? dayjs(v.fromDatetime).format('YYYY-MM-DD') : requestDate,
        toDate:       v.toDatetime   ? dayjs(v.toDatetime).format('YYYY-MM-DD')   : requestDate,
        fromDatetime: v.fromDatetime ? dayjs(v.fromDatetime).format('YYYY-MM-DDTHH:mm:ss') : null,
        toDatetime:   v.toDatetime   ? dayjs(v.toDatetime).format('YYYY-MM-DDTHH:mm:ss')   : null,
        fromLocation: fromLoc?.address ?? null,
        toLocation:   toLoc?.address   ?? null,
        fromLat:      fromLoc?.lat ?? null,
        fromLng:      fromLoc?.lng ?? null,
        toLat:        toLoc?.lat   ?? null,
        toLng:        toLoc?.lng   ?? null,
        distanceKm:   distKm ?? null,
      });
    });
  }

  const pending  = data.filter((r) => r.status === 'pending').length;
  const approved = data.filter((r) => r.status === 'approved').length;
  const active   = data.filter((r) => r.status === 'active').length;

  /* ── Popup container: render to body to avoid clipping ──────── */
  const popupToBody = () => document.body;

  return (
    <div style={{ padding: '0 2px' }}>

      {/* ══ Page Header ══════════════════════════════════════════ */}
      <PageHeader
        icon={<UserOutlined />} color="#0958d9"
        title="Single Booking"
        subtitle="Book a vehicle for a single trip — route shown live on map"
        stats={[
          { label: 'Pending',  value: pending,     color: '#fa8c16' },
          { label: 'Approved', value: approved,    color: '#52c41a' },
          { label: 'Active',   value: active,      color: '#1677ff' },
          { label: 'Total',    value: data.length, color: '#9254de' },
        ]}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}
            style={{ background: '#0958d9', borderColor: '#0958d9' }}>
            New Booking
          </Button>
        }
      />

      {/* ══ Table ════════════════════════════════════════════════ */}
      <div style={{
        background: '#fff', borderRadius: 14,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 18px', borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex', gap: 10, alignItems: 'center',
          background: 'rgba(248,249,252,0.8)',
        }}>
          <Input
            placeholder="Search booking no, requester, purpose…"
            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
            value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ width: 290, borderRadius: 8 }} allowClear
          />
          <Select
            value={statusFilter} onChange={setStatus} style={{ width: 140 }}
            options={[
              { value: 'all',       label: 'All Status'  },
              { value: 'pending',   label: 'Pending'     },
              { value: 'approved',  label: 'Approved'    },
              { value: 'active',    label: 'Active'      },
              { value: 'rejected',  label: 'Rejected'    },
              { value: 'completed', label: 'Completed'   },
            ]}
          />
          <Badge count={filtered.length} showZero color="#1677ff">
            <span style={{ fontSize: 12, color: '#999', paddingRight: 8 }}>results</span>
          </Badge>
          <div style={{ marginLeft: 'auto' }}>
            <ColumnPicker allColumns={allColumns} visibleKeys={visibleKeys} onChange={setVisible} onReset={resetToDefault} />
          </div>
        </div>
        <Spin spinning={isLoading}>
          <Table
            dataSource={filtered} columns={columns} size="small"
            scroll={{ x: 'max-content' }} rowKey="id"
            onRow={(r) => ({
              style: {
                borderLeft: `3px solid ${
                  r.status === 'approved'  ? '#52c41a' :
                  r.status === 'active'    ? '#1677ff' :
                  r.status === 'rejected'  ? '#ff4d4f' :
                  r.status === 'completed' ? '#722ed1' : '#faad14'
                }`,
              },
            })}
            pagination={{
              pageSize: 10, showSizeChanger: true,
              showTotal: (t, r) => `${r[0]}–${r[1]} of ${t}`,
              pageSizeOptions: ['10', '25', '50'],
              style: { padding: '10px 18px' },
            }}
          />
        </Spin>
      </div>

      {/* ══════════════════════════════════════════════════════════
          BOOKING MODAL — wider form, Google Maps, beautiful inputs
      ══════════════════════════════════════════════════════════ */}
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width="min(1440px, 97vw)"
        style={{ top: '1vh', padding: 0 }}
        centered={false}
        destroyOnClose
        closeIcon={null}
        styles={{
          content: { padding: 0, borderRadius: 22, overflow: 'hidden' },
          mask:    { backdropFilter: 'blur(8px)' },
        }}
      >
        {/* ── Gradient header ──────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#0891b2 100%)',
          padding: '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -30, top: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: '45%', bottom: -40, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, zIndex: 1 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.35)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff',
            }}>
              <UserOutlined />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
                {editRecord ? `Edit Booking — ${editRecord.reqNo}` : 'New Single Booking'}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 1 }}>
                Fill in trip details on the left · live route shown on Google Maps
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, zIndex: 1 }}>
            {routeInfo && (
              <div style={{
                background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 24, padding: '6px 18px', fontSize: 14, fontWeight: 800, color: '#fff',
                display: 'flex', alignItems: 'center', gap: 8, backdropFilter: 'blur(4px)',
              }}>
                <EnvironmentOutlined style={{ fontSize: 14 }} />
                {routeInfo.distanceText}
                {routeInfo.duration && <span style={{ fontWeight: 500, fontSize: 12, opacity: 0.85 }}>· {routeInfo.duration}</span>}
              </div>
            )}
            <Button
              type="text" icon={<CloseOutlined style={{ fontSize: 14 }} />} onClick={() => setModalOpen(false)}
              style={{ color: '#fff', background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10,
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            />
          </div>
        </div>

        {/* ── Body: wider form + narrower map ───────────────────── */}
        <div style={{ display: 'flex', height: '88vh' }}>

          {/* ══ LEFT FORM PANEL — 620px ════════════════════════════ */}
          <div style={{
            width: 620, flexShrink: 0, display: 'flex', flexDirection: 'column',
            borderRight: '1px solid rgba(99,102,241,0.1)',
            background: 'linear-gradient(180deg,#fafbff 0%,#ffffff 100%)',
          }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 8px' }}>
              <Form form={form} layout="vertical" size="middle">

                {/* ══ SECTION 1: WHO ════════════════════════════════ */}
                <div style={{ marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <div style={{ width: 4, height: 18, borderRadius: 3, background: 'linear-gradient(#6366f1,#8b5cf6)' }} />
                    <UserOutlined style={{ color: '#6366f1', fontSize: 14 }} />
                    <span style={{ fontWeight: 800, fontSize: 13, color: '#6366f1', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Who is Travelling?
                    </span>
                  </div>

                  {/* Row 1: Employee + Dept + Priority in one line */}
                  <Row gutter={14}>
                    <Col span={11}>
                      <Form.Item name="requestedBy" label={<span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Employee / Requester</span>}
                        rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 14 }}>
                        <Select
                          showSearch placeholder="Search employee or name…"
                          options={employeeOptions} filterOption={filterOption} allowClear
                          style={{ fontSize: 14 }}
                          notFoundContent={<span style={{ fontSize: 13, color: '#9ca3af' }}>No employees found</span>}
                          onChange={(_, opt) => { if (opt?.department) form.setFieldValue('department', opt.department); }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={7}>
                      <Form.Item name="department" label={<span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Department</span>}
                        rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 14 }}>
                        <Select placeholder="Select dept…" options={DEPTS.map((d) => ({ value: d, label: d }))} style={{ fontSize: 14 }} />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item name="priority" label={<span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Priority</span>}
                        initialValue="normal" style={{ marginBottom: 14 }}>
                        <Select style={{ fontSize: 14 }} options={[
                          { value: 'normal', label: '🟢 Normal' },
                          { value: 'high',   label: '🟠 High'   },
                          { value: 'urgent', label: '🔴 Urgent' },
                        ]} />
                      </Form.Item>
                    </Col>
                  </Row>

                  {/* Row 2: Purpose (full width) */}
                  <Form.Item name="purpose" label={<span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Purpose of Trip</span>}
                    rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 0 }}>
                    <Input placeholder="e.g. Site visit, Client meeting, Logistics run…" style={{ fontSize: 14, height: 40 }} />
                  </Form.Item>
                </div>

                {/* ══ SECTION 2: WHERE ══════════════════════════════ */}
                <div style={{ margin: '18px 0 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <div style={{ width: 4, height: 18, borderRadius: 3, background: 'linear-gradient(#06b6d4,#0891b2)' }} />
                    <EnvironmentOutlined style={{ color: '#06b6d4', fontSize: 14 }} />
                    <span style={{ fontWeight: 800, fontSize: 13, color: '#06b6d4', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Where To?
                    </span>
                    {distKm && (
                      <span style={{
                        marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.22)',
                        borderRadius: 20, padding: '3px 12px', fontSize: 13, fontWeight: 800, color: '#6366f1',
                      }}>
                        <ThunderboltOutlined style={{ fontSize: 11 }} />
                        {distKm} km
                        <CheckCircleOutlined style={{ color: '#10b981', fontSize: 11 }} />
                      </span>
                    )}
                    {calcingDist && <Spin size="small" style={{ marginLeft: 'auto' }} />}
                  </div>

                  {/* From → connector → To layout */}
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    {/* Animated route connector */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 38, flexShrink: 0, width: 20 }}>
                      <div style={{
                        width: 14, height: 14, borderRadius: '50%', background: '#6366f1',
                        border: '3px solid #eef1ff', boxShadow: '0 0 0 3px rgba(99,102,241,0.2)',
                      }} />
                      <div style={{ width: 2.5, minHeight: 44, borderRadius: 2, margin: '5px 0', background: 'linear-gradient(180deg,#6366f1 0%,#10b981 100%)' }} />
                      <div style={{
                        width: 14, height: 14, borderRadius: 4, background: '#10b981',
                        border: '3px solid #f0fdf4', boxShadow: '0 0 0 3px rgba(16,185,129,0.2)',
                      }} />
                    </div>

                    <div style={{ flex: 1 }}>
                      {/* FROM */}
                      <Form.Item
                        name="fromLocation"
                        label={<span style={{ fontSize: 13, fontWeight: 700, color: '#6366f1' }}>Pickup Location (From)</span>}
                        rules={[{ required: true, message: 'Pickup location required' }]}
                        style={{ marginBottom: 12 }}
                      >
                        <LocationPicker value={fromLoc} onChange={(loc) => handleLocationChange('from', loc)}
                          placeholder="Search pickup address, landmark, area…" size="large" />
                      </Form.Item>

                      {/* TO */}
                      <Form.Item
                        name="toLocation"
                        label={<span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>Drop-off Destination (To)</span>}
                        rules={[{ required: true, message: 'Destination required' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <LocationPicker value={toLoc} onChange={(loc) => handleLocationChange('to', loc)}
                          placeholder="Search destination address, landmark, area…" size="large" />
                      </Form.Item>
                    </div>
                  </div>
                </div>

                {/* ══ SECTION 3: WHEN ═══════════════════════════════ */}
                <div style={{ margin: '18px 0 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <div style={{ width: 4, height: 18, borderRadius: 3, background: 'linear-gradient(#8b5cf6,#ec4899)' }} />
                    <ClockCircleOutlined style={{ color: '#8b5cf6', fontSize: 14 }} />
                    <span style={{ fontWeight: 800, fontSize: 13, color: '#8b5cf6', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      When &amp; How Many?
                    </span>
                  </div>

                  <Row gutter={14}>
                    <Col span={10}>
                      <Form.Item name="fromDatetime" label={<span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Departure Date &amp; Time</span>}
                        rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 14 }}>
                        <DatePicker showTime={{ format: 'HH:mm' }} format="DD MMM YYYY HH:mm"
                          placeholder="Select departure…" style={{ width: '100%', height: 40, fontSize: 14 }}
                          getPopupContainer={popupToBody} popupStyle={{ zIndex: 1100 }}
                          disabledDate={(d) => d && d.isBefore(dayjs().startOf('day'))}
                          onChange={() => {
                            const ret = form.getFieldValue('toDatetime');
                            if (ret && form.getFieldValue('fromDatetime') && ret.isBefore(form.getFieldValue('fromDatetime')))
                              form.setFieldValue('toDatetime', null);
                          }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={10}>
                      <Form.Item name="toDatetime" label={<span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Return Date &amp; Time</span>}
                        style={{ marginBottom: 14 }}>
                        <DatePicker showTime={{ format: 'HH:mm' }} format="DD MMM YYYY HH:mm"
                          placeholder="Select return (optional)…" style={{ width: '100%', height: 40, fontSize: 14 }}
                          getPopupContainer={popupToBody} popupStyle={{ zIndex: 1100 }}
                          disabledDate={(d) => {
                            if (!d) return false;
                            const dep = watchDepart;
                            return dep ? d.isBefore(dep.startOf('day')) : d.isBefore(dayjs().startOf('day'));
                          }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item name="passengers" label={<span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Passengers</span>}
                        style={{ marginBottom: 14 }}>
                        <InputNumber style={{ width: '100%', height: 40, fontSize: 14 }} min={1} max={50} placeholder="1" />
                      </Form.Item>
                    </Col>
                  </Row>

                  {/* Request date info strip */}
                  <Form.Item name="date" hidden><Input /></Form.Item>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 0,
                    background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.14)',
                    borderRadius: 10, padding: '8px 14px',
                  }}>
                    <ClockCircleOutlined style={{ color: '#6366f1', fontSize: 14 }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#6366f1' }}>{dayjs().format('dddd, DD MMMM YYYY')}</span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>· Request date (auto-stamped)</span>
                  </div>
                </div>

                {/* ══ SECTION 4: NOTES ══════════════════════════════ */}
                <div style={{ margin: '18px 0 8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <div style={{ width: 4, height: 18, borderRadius: 3, background: 'linear-gradient(#ec4899,#f43f5e)' }} />
                    <span style={{ fontWeight: 800, fontSize: 13, color: '#ec4899', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Additional Notes
                    </span>
                  </div>
                  <Form.Item name="remarks" style={{ marginBottom: 0 }}>
                    <Input.TextArea rows={2}
                      placeholder="Special pickup instructions, access codes, contact at destination, any other notes…"
                      style={{ resize: 'none', fontSize: 14, borderRadius: 10 }} />
                  </Form.Item>
                </div>

              </Form>
            </div>

            {/* ── Sticky action footer ───────────────────────────── */}
            <div style={{
              padding: '14px 28px',
              borderTop: '1px solid rgba(99,102,241,0.1)',
              background: 'rgba(250,251,255,0.98)',
              display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>
                {distKm ? (
                  <span style={{ color: '#6366f1', fontWeight: 700 }}>
                    Route: {distKm} km
                    {routeInfo?.duration && ` · ~${routeInfo.duration}`}
                  </span>
                ) : 'Set locations to calculate route'}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Button onClick={() => setModalOpen(false)} style={{ borderRadius: 10, height: 40, minWidth: 90, fontSize: 14, fontWeight: 600 }}>
                  Cancel
                </Button>
                <Button
                  type="primary" icon={<SendOutlined />} loading={isSaving}
                  onClick={handleSubmit}
                  style={{
                    borderRadius: 10, height: 40, minWidth: 180, fontWeight: 700, fontSize: 14,
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    border: 'none', boxShadow: '0 4px 16px rgba(99,102,241,0.45)',
                  }}
                >
                  {editRecord ? 'Update Booking' : 'Submit Booking'}
                </Button>
              </div>
            </div>
          </div>

          {/* ══ RIGHT MAP PANEL ═══════════════════════════════════ */}
          <div style={{ flex: 1, padding: 14, background: '#eef1ff', minWidth: 0 }}>
            <BookingMapPanel
              fromLoc={fromLoc}
              toLoc={toLoc}
              onRouteInfo={(info) => {
                setRouteInfo(info);
                if (info?.distance) { setDistKm(info.distance); form.setFieldValue('distanceKm', info.distance); }
              }}
            />
          </div>
        </div>
      </Modal>

      {/* ══ View Drawer ══════════════════════════════════════════ */}
      <Drawer
        open={!!viewRecord}
        onClose={() => setViewRecord(null)}
        title={
          viewRecord ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Tag color={statusColor(viewRecord.status)}>{viewRecord.status?.toUpperCase()}</Tag>
              <span style={{ fontWeight: 700 }}>{viewRecord.reqNo}</span>
            </div>
          ) : ''
        }
        width={520}
        extra={
          viewRecord?.status === 'pending' && (
            <Button size="small" icon={<EditOutlined />}
              onClick={() => { setViewRecord(null); openEdit(viewRecord); }}>
              Edit
            </Button>
          )
        }
      >
        {viewRecord && (
          <>
            {viewRecord.fromLat && viewRecord.toLat && (
              <div style={{ height: 200, borderRadius: 12, overflow: 'hidden', marginBottom: 16, border: '1px solid #eee' }}>
                <BookingMapPanel
                  fromLoc={{ address: viewRecord.fromLocation, lat: viewRecord.fromLat, lng: viewRecord.fromLng }}
                  toLoc={{ address: viewRecord.toLocation, lat: viewRecord.toLat, lng: viewRecord.toLng }}
                />
              </div>
            )}
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Status">
                <Tag color={statusColor(viewRecord.status)}>{viewRecord.status?.toUpperCase()}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Priority">
                <Tag color={priorityColor[viewRecord.priority]}>{viewRecord.priority?.toUpperCase()}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Requested By">{viewRecord.requestedBy}</Descriptions.Item>
              <Descriptions.Item label="Department">{viewRecord.department}</Descriptions.Item>
              <Descriptions.Item label="Purpose" span={2}>{viewRecord.purpose}</Descriptions.Item>
              <Descriptions.Item label="Request Date" span={2}>{formatDate(viewRecord.date)}</Descriptions.Item>
              <Descriptions.Item label="From" span={2}>
                <div>{viewRecord.fromLocation}</div>
                {viewRecord.fromLat && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {viewRecord.fromLat.toFixed(5)}, {viewRecord.fromLng.toFixed(5)}
                  </Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Destination" span={2}>
                <div>{viewRecord.toLocation}</div>
                {viewRecord.toLat && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {viewRecord.toLat.toFixed(5)}, {viewRecord.toLng.toFixed(5)}
                  </Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Depart">
                {viewRecord.fromDatetime ? dayjs(viewRecord.fromDatetime).format('DD MMM YYYY HH:mm') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Return">
                {viewRecord.toDatetime ? dayjs(viewRecord.toDatetime).format('DD MMM YYYY HH:mm') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Distance">
                {viewRecord.distanceKm ? (
                  <span style={{ fontWeight: 700, color: '#1677ff' }}>{viewRecord.distanceKm} km</span>
                ) : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Geo-fence">
                {viewRecord.geofenceRadiusM ? `${viewRecord.geofenceRadiusM} m` : '500 m'}
              </Descriptions.Item>
              <Descriptions.Item label="Vehicle">{viewRecord.vehicleReg ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Passengers">{viewRecord.passengers ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Approved By">{viewRecord.approvedBy ?? '—'}</Descriptions.Item>
              {viewRecord.remarks && (
                <Descriptions.Item label="Remarks" span={2}>{viewRecord.remarks}</Descriptions.Item>
              )}
            </Descriptions>
          </>
        )}
      </Drawer>
    </div>
  );
}
