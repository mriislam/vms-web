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
          BOOKING MODAL — full-width, two-panel Uber-style
      ══════════════════════════════════════════════════════════ */}
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width="96vw"
        style={{ top: '2vh', maxWidth: 1480, padding: 0 }}
        centered={false}
        destroyOnClose
        closeIcon={null}
        styles={{
          content: { padding: 0, borderRadius: 20 },
          mask:    { backdropFilter: 'blur(4px)' },
        }}
      >
        {/* ── Modal header — gradient style matching FormModal ── */}
        <div style={{
          background: 'linear-gradient(135deg, #1677ffee 0%, #1677ff99 100%)',
          padding: '14px 18px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderRadius: '20px 20px 0 0',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -24, top: -24, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 18, bottom: -32, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, zIndex: 1 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17, color: '#fff',
              boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
            }}>
              <UserOutlined />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                {editRecord ? `Edit Booking — ${editRecord.reqNo}` : 'New Single Booking'}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 1 }}>
                Enter trip details on the left — live route appears on the map
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, zIndex: 1 }}>
            {routeInfo && (
              <span style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 700, color: '#fff',
                display: 'flex', alignItems: 'center', gap: 6,
                backdropFilter: 'blur(4px)',
              }}>
                <EnvironmentOutlined />
                {routeInfo.distanceText}
              </span>
            )}
            <Button
              type="text" icon={<CloseOutlined />} onClick={() => setModalOpen(false)}
              style={{ color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8 }}
            />
          </div>
        </div>

        {/* ── Body: two panels ────────────────────────────────── */}
        <div style={{ display: 'flex', height: '84vh' }}>

          {/* LEFT: Form ─────────────────────────────────────────*/}
          <div style={{
            width: 500, flexShrink: 0,
            display: 'flex', flexDirection: 'column',
            borderRight: '1px solid rgba(0,0,0,0.07)',
            background: '#fff',
            borderRadius: '0 0 0 20px',
          }}>
            {/* Scrollable form body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 8px' }}>
              <Form form={form} layout="vertical" size="middle">

                {/* ══ REQUESTER ══════════════════════════════════ */}
                <SLabel title="Who is Travelling?" color="#0958d9" icon={<UserOutlined />} />
                <Row gutter={14}>
                  <Col span={15}>
                    <Form.Item name="requestedBy" label="Employee / Requester" rules={[{ required: true }]}>
                      <Select
                        showSearch placeholder="Search employee…"
                        options={employeeOptions} filterOption={filterOption} allowClear
                        notFoundContent={<span style={{ fontSize: 12, color: '#aaa' }}>No employees found</span>}
                        onChange={(val, opt) => {
                          if (opt?.department) form.setFieldValue('department', opt.department);
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={9}>
                    <Form.Item name="department" label="Department" rules={[{ required: true }]}>
                      <Select placeholder="Select…" options={DEPTS.map((d) => ({ value: d, label: d }))} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={14}>
                  <Col span={15}>
                    <Form.Item name="purpose" label="Purpose of Trip" rules={[{ required: true }]}>
                      <Input placeholder="e.g. Site visit, Client meeting…" />
                    </Form.Item>
                  </Col>
                  <Col span={9}>
                    <Form.Item name="priority" label="Priority" rules={[{ required: true }]} initialValue="normal">
                      <Select options={[
                        { value: 'normal', label: '🟢 Normal' },
                        { value: 'high',   label: '🟠 High'   },
                        { value: 'urgent', label: '🔴 Urgent' },
                      ]} />
                    </Form.Item>
                  </Col>
                </Row>

                {/* ══ ROUTE — Uber style ═════════════════════════ */}
                <SLabel title="Where To?" color="#1677ff" icon={<EnvironmentOutlined />} />

                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  {/* Vertical connector */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    paddingTop: 34, flexShrink: 0,
                  }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: '50%',
                      background: '#1677ff', border: '3px solid #e6f4ff',
                      boxShadow: '0 0 0 2px #1677ff40',
                    }} />
                    <div style={{
                      width: 2, flex: 1, minHeight: 120, borderRadius: 2, margin: '4px 0',
                      background: 'linear-gradient(#1677ff, #52c41a)',
                    }} />
                    <div style={{
                      width: 14, height: 14, borderRadius: 3,
                      background: '#52c41a', border: '3px solid #f6ffed',
                      boxShadow: '0 0 0 2px #52c41a40',
                    }} />
                  </div>

                  <div style={{ flex: 1 }}>
                    {/* From */}
                    <Form.Item
                      name="fromLocation"
                      label={<span style={{ fontWeight: 600, color: '#1677ff' }}>From</span>}
                      rules={[{ required: true }]} style={{ marginBottom: 0 }}
                    >
                      <LocationPicker
                        value={fromLoc} onChange={(loc) => handleLocationChange('from', loc)}
                        placeholder="Enter pickup location…" size="large"
                      />
                    </Form.Item>

                    {/* Distance — read-only, no drive time */}
                    <div style={{ padding: '6px 0', minHeight: 30, display: 'flex', alignItems: 'center' }}>
                      {calcingDist ? (
                        <span style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Spin size="small" /> Calculating distance…
                        </span>
                      ) : distKm ? (
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 7,
                          background: '#fff', border: '1.5px solid #1677ff',
                          borderRadius: 20, padding: '3px 12px',
                        }}>
                          <ThunderboltOutlined style={{ color: '#1677ff', fontSize: 12 }} />
                          <span style={{ fontWeight: 700, fontSize: 13, color: '#1677ff' }}>{distKm} km</span>
                          <Tooltip title="Auto-calculated via Google Maps">
                            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 11 }} />
                          </Tooltip>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: '#bbb' }}>Distance fills when both locations are set</span>
                      )}
                    </div>

                    {/* Destination */}
                    <Form.Item
                      name="toLocation"
                      label={<span style={{ fontWeight: 600, color: '#52c41a' }}>Destination</span>}
                      rules={[{ required: true }]} style={{ marginBottom: 10 }}
                    >
                      <LocationPicker
                        value={toLoc} onChange={(loc) => handleLocationChange('to', loc)}
                        placeholder="Enter drop-off destination…" size="large"
                      />
                    </Form.Item>

                    {/* Passengers — directly below destination */}
                    <Form.Item name="passengers" label="No. of Passengers" style={{ marginBottom: 0 }}>
                      <InputNumber style={{ width: 180 }} min={1} max={50} placeholder="How many passengers?" />
                    </Form.Item>
                  </div>
                </div>

                {/* ══ SCHEDULE ═══════════════════════════════════ */}
                <SLabel title="When?" color="#722ed1" icon={<ClockCircleOutlined />} />
                <Row gutter={14}>
                  <Col span={12}>
                    <Form.Item name="fromDatetime" label="Depart" rules={[{ required: true }]}>
                      <DatePicker
                        showTime={{ format: 'HH:mm' }} format="DD MMM YYYY HH:mm"
                        placeholder="Departure date & time" style={{ width: '100%' }}
                        getPopupContainer={popupToBody} popupStyle={{ zIndex: 1100 }}
                        disabledDate={(d) => d && d.isBefore(dayjs().startOf('day'))}
                        onChange={() => {
                          const ret = form.getFieldValue('toDatetime');
                          if (ret && form.getFieldValue('fromDatetime') && ret.isBefore(form.getFieldValue('fromDatetime'))) {
                            form.setFieldValue('toDatetime', null);
                          }
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="toDatetime" label="Return">
                      <DatePicker
                        showTime={{ format: 'HH:mm' }} format="DD MMM YYYY HH:mm"
                        placeholder="Return date & time" style={{ width: '100%' }}
                        getPopupContainer={popupToBody} popupStyle={{ zIndex: 1100 }}
                        disabledDate={(d) => {
                          if (!d) return false;
                          const depart = watchDepart;
                          if (depart) return d.isBefore(depart.startOf('day'));
                          return d.isBefore(dayjs().startOf('day'));
                        }}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* Auto-stamped request date — hidden field + read-only badge */}
                <Form.Item name="date" hidden><Input /></Form.Item>
                <Form.Item label="Request Date">
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: '#f0f7ff', border: '1px solid #91caff',
                    borderRadius: 8, padding: '7px 12px',
                  }}>
                    <ClockCircleOutlined style={{ color: '#1677ff', fontSize: 13 }} />
                    <span style={{ fontWeight: 600, color: '#0958d9', fontSize: 13 }}>
                      {dayjs().format('DD MMM YYYY')}
                    </span>
                    <span style={{ fontSize: 11, color: '#888', marginLeft: 4 }}>
                      Auto-stamped · not editable
                    </span>
                  </div>
                </Form.Item>

                {/* ══ NOTES ══════════════════════════════════════ */}
                <SLabel title="Notes" color="#eb2f96" />
                <Form.Item name="remarks" style={{ marginBottom: 6 }}>
                  <Input.TextArea rows={2} placeholder="Special instructions for the trip…" />
                </Form.Item>

              </Form>
            </div>

            {/* Sticky footer */}
            <div style={{
              padding: '14px 28px',
              borderTop: '1px solid rgba(0,0,0,0.08)',
              background: '#fafafa',
              display: 'flex', gap: 10, justifyContent: 'flex-end',
              borderRadius: '0 0 0 20px',
            }}>
              <Button onClick={() => setModalOpen(false)} style={{ borderRadius: 8, minWidth: 90 }}>
                Cancel
              </Button>
              <Button
                type="primary" icon={<SendOutlined />} loading={isSaving}
                onClick={handleSubmit}
                style={{ borderRadius: 8, minWidth: 160, fontWeight: 600 }}
              >
                {editRecord ? 'Update Booking' : 'Submit Booking'}
              </Button>
            </div>
          </div>

          {/* RIGHT: Map ─────────────────────────────────────────*/}
          <div style={{
            flex: 1, padding: 14,
            background: '#edf2fb',
            borderRadius: '0 0 20px 0',
          }}>
            <BookingMapPanel
              fromLoc={fromLoc}
              toLoc={toLoc}
              onRouteInfo={(info) => {
                setRouteInfo(info);
                if (info?.distance) {
                  setDistKm(info.distance);
                  form.setFieldValue('distanceKm', info.distance);
                }
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
