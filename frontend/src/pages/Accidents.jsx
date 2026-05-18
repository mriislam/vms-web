import {
  AlertOutlined, CarOutlined, DeleteOutlined, EditOutlined, EyeOutlined,
  IdcardOutlined, PlusOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Button, Card, Col, DatePicker, Descriptions, Drawer, Form, Input, InputNumber,
  Popconfirm, Row, Select, Spin, Table, Tag, Typography, message,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import ColumnPicker from '../components/ColumnPicker';
import FormModal, { FormSection } from '../components/FormModal';
import PageHeader from '../components/PageHeader';
import { useApiCrud } from '../hooks/useApiCrud';
import { useColumnPicker } from '../hooks/useColumnPicker';
import { accidentService } from '../services/accidentService';
import { driverService } from '../services/driverService';
import { vehicleService } from '../services/vehicleService';
import { formatDate, statusColor } from '../utils/helpers';

const { Text } = Typography;
const SEVERITY_COLOR = { minor: 'blue', moderate: 'orange', major: 'red', fatal: 'purple' };

const COLUMNS_DEF = [
  { key: 'caseNo',      columnTitle: 'Case No',      title: 'Case No',      dataIndex: 'caseNo' },
  { key: 'vehicleReg',  columnTitle: 'Vehicle',      title: 'Vehicle',      dataIndex: 'vehicleReg' },
  { key: 'driverName',  columnTitle: 'Driver',       title: 'Driver',       dataIndex: 'driverName' },
  { key: 'date',        columnTitle: 'Date',         title: 'Date',         dataIndex: 'date',     render: (d) => formatDate(d) },
  { key: 'location',    columnTitle: 'Location',     title: 'Location',     dataIndex: 'location' },
  { key: 'type',        columnTitle: 'Type',         title: 'Type',         dataIndex: 'type' },
  { key: 'severity',    columnTitle: 'Severity',     title: 'Severity',     dataIndex: 'severity',
    render: (s) => s ? <Tag color={SEVERITY_COLOR[s]}>{s.toUpperCase()}</Tag> : '—' },
  { key: 'status',      columnTitle: 'Status',       title: 'Status',       dataIndex: 'status',
    render: (s) => <Tag color={statusColor(s)}>{s?.replace(/_/g, ' ').toUpperCase()}</Tag> },
  { key: 'casualties',  columnTitle: 'Casualties',   title: 'Casualties',   dataIndex: 'casualties',  defaultVisible: false },
  { key: 'damage',      columnTitle: 'Damage (৳)',   title: 'Damage (৳)',   dataIndex: 'damage',      defaultVisible: false, render: (v) => v ? `৳${Number(v).toLocaleString()}` : '—' },
  { key: 'reportedBy',  columnTitle: 'Reported By',  title: 'Reported By',  dataIndex: 'reportedBy',  defaultVisible: false },
  { key: 'policeCase',  columnTitle: 'Police Case',  title: 'Police Case',  dataIndex: 'policeCase',  defaultVisible: false },
];

export default function Accidents() {
  const [search, setSearch]           = useState('');
  const [severityFilter, setSeverity] = useState('all');
  const [statusFilter, setStatus]     = useState('all');
  const [modalOpen, setModalOpen]     = useState(false);
  const [editRecord, setEditRecord]   = useState(null);
  const [viewRecord, setViewRecord]   = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [form] = Form.useForm();

  /* ── API data ── */
  const { data, isLoading, save, remove, isSaving } = useApiCrud('accidents', accidentService, {
    onSaveSuccess: () => { setModalOpen(false); setSelectedVehicle(null); },
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicleService.getAll().then((r) => r.data.data ?? []),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => driverService.getAll().then((r) => r.data.data ?? []),
  });

  const { visibleColumns, visibleKeys, setVisible, resetToDefault, allColumns } =
    useColumnPicker('accidents', COLUMNS_DEF);

  /* ── vehicle select handler — auto-fill ── */
  function onVehicleSelect(regNo) {
    const v = vehicles.find((x) => x.regNo === regNo);
    setSelectedVehicle(v ?? null);
  }

  /* ── columns ── */
  const columns = [
    ...visibleColumns,
    {
      title: 'Actions', key: 'actions', fixed: 'right', width: 110,
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 2 }}>
          <Button type="link" size="small" icon={<EyeOutlined />}  onClick={() => setViewRecord(r)} />
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Delete this record?" okText="Delete" okButtonProps={{ danger: true }}
            onConfirm={() => remove(r.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  const filtered = data.filter((d) => {
    const q = search.toLowerCase();
    return (
      (!q || d.caseNo?.toLowerCase().includes(q) || d.vehicleReg?.toLowerCase().includes(q) ||
       d.driverName?.toLowerCase().includes(q) || d.location?.toLowerCase().includes(q)) &&
      (severityFilter === 'all' || d.severity === severityFilter) &&
      (statusFilter   === 'all' || d.status   === statusFilter)
    );
  });

  function openAdd() {
    setEditRecord(null);
    setSelectedVehicle(null);
    form.resetFields();
    setModalOpen(true);
  }

  function openEdit(r) {
    setEditRecord(r);
    const v = vehicles.find((x) => x.regNo === r.vehicleReg);
    setSelectedVehicle(v ?? null);
    form.setFieldsValue({ ...r, date: r.date ? dayjs(r.date) : null });
    setModalOpen(true);
  }

  function handleSubmit() {
    form.validateFields().then((values) => {
      save(editRecord?.id ?? null, { ...values, date: values.date?.format('YYYY-MM-DD') ?? null });
    });
  }

  const total    = data.length;
  const open_    = data.filter((d) => d.status === 'open').length;
  const resolved = data.filter((d) => d.status === 'resolved').length;

  return (
    <div>
      <PageHeader
        icon={<AlertOutlined />} color="#ff4d4f" title="Accident / Occurrence"
        subtitle="Record and track vehicle accidents and incidents"
        stats={[
          { label: 'Total',    value: total,    color: '#ff4d4f' },
          { label: 'Open',     value: open_,    color: '#fa8c16' },
          { label: 'Resolved', value: resolved, color: '#52c41a' },
        ]}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}
            style={{ background: '#ff4d4f', borderColor: '#ff4d4f' }}>
            Report Incident
          </Button>
        }
      />

      <Card size="small" style={{ borderRadius: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
          <Input placeholder="Search case no, vehicle, driver, location…"
            prefix={<SearchOutlined />} value={search}
            onChange={(e) => setSearch(e.target.value)} style={{ width: 320 }} allowClear />
          <Select value={severityFilter} onChange={setSeverity} style={{ width: 140 }}
            options={[{ value:'all',label:'All Severity' },{ value:'minor',label:'Minor' },
              { value:'moderate',label:'Moderate' },{ value:'major',label:'Major' },{ value:'fatal',label:'Fatal' }]} />
          <Select value={statusFilter} onChange={setStatus} style={{ width: 140 }}
            options={[{ value:'all',label:'All Status' },{ value:'open',label:'Open' },
              { value:'under_review',label:'Under Review' },{ value:'resolved',label:'Resolved' },
              { value:'closed',label:'Closed' }]} />
          <div style={{ marginLeft: 'auto' }}>
            <ColumnPicker allColumns={allColumns} visibleKeys={visibleKeys} onChange={setVisible} onReset={resetToDefault} />
          </div>
        </div>
        <Spin spinning={isLoading}>
          <Table dataSource={filtered} columns={columns} size="small" scroll={{ x: 'max-content' }} rowKey="id" pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}`, pageSizeOptions: ['10', '25', '50', '100'] }} />
        </Spin>
      </Card>

      {/* ── Add / Edit Modal ── */}
      <FormModal
        open={modalOpen} onClose={() => { setModalOpen(false); setSelectedVehicle(null); }}
        onSubmit={handleSubmit} confirmLoading={isSaving}
        icon={<AlertOutlined />} color="#ff4d4f"
        title={editRecord ? `Edit Record — ${editRecord.caseNo}` : 'Report Accident / Occurrence'}
        subtitle={editRecord ? 'Update the incident details' : 'Log a new vehicle accident or occurrence'}
        okText={editRecord ? 'Update' : 'Submit Report'} width={720}
      >
        <Form form={form} layout="vertical" size="small">
          <FormSection title="Incident Details" color="#ff4d4f">

            {/* Row 1: Vehicle select + auto-fill display */}
            <Row gutter={16}>
              <Col span={10}>
                <Form.Item name="vehicleReg" label="Vehicle Reg No" rules={[{ required: true }]}>
                  <Select
                    showSearch
                    placeholder="Search by reg no…"
                    filterOption={(input, opt) =>
                      opt?.value?.toLowerCase().includes(input.toLowerCase()) ||
                      opt?.label?.toLowerCase().includes(input.toLowerCase())
                    }
                    options={vehicles
                      .filter((v) => v.status === 'active')
                      .map((v) => ({
                        value: v.regNo,
                        label: `${v.regNo} — ${v.make} ${v.model}`,
                      }))}
                    onSelect={onVehicleSelect}
                  />
                </Form.Item>
              </Col>
              <Col span={14}>
                {/* Auto-fill info card */}
                {selectedVehicle ? (
                  <div style={{
                    marginTop: 22,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'rgba(22,119,255,0.05)',
                    border: '1px solid rgba(22,119,255,0.2)',
                    display: 'flex', gap: 20, flexWrap: 'wrap',
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CarOutlined style={{ color: '#1677ff', fontSize: 13 }} />
                      <Text style={{ fontSize: 12 }}>
                        <b>{selectedVehicle.make} {selectedVehicle.model}</b>
                        {' ('}{selectedVehicle.year}{')'}
                      </Text>
                    </span>
                    <span>
                      <Text type="secondary" style={{ fontSize: 12 }}>Type: </Text>
                      <Text style={{ fontSize: 12 }}><b>{selectedVehicle.type}</b></Text>
                    </span>
                    <span>
                      <Text type="secondary" style={{ fontSize: 12 }}>Fuel: </Text>
                      <Text style={{ fontSize: 12 }}><b>{selectedVehicle.fuelType}</b></Text>
                    </span>
                    {selectedVehicle.owner && (
                      <span>
                        <Text type="secondary" style={{ fontSize: 12 }}>Branch: </Text>
                        <Text style={{ fontSize: 12 }}><b>{selectedVehicle.owner}</b></Text>
                      </span>
                    )}
                    <Tag color={selectedVehicle.status === 'active' ? 'success' : 'default'} style={{ fontSize: 11, margin: 0 }}>
                      {selectedVehicle.ownership}
                    </Tag>
                  </div>
                ) : (
                  <div style={{
                    marginTop: 22, padding: '8px 12px', borderRadius: 8,
                    background: 'rgba(0,0,0,0.02)',
                    border: '1px dashed rgba(0,0,0,0.12)',
                    color: '#bfbfbf', fontSize: 12, textAlign: 'center',
                  }}>
                    Select a vehicle to see its details
                  </div>
                )}
              </Col>
            </Row>

            {/* Row 2: Driver + Date */}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="driverName" label="Driver Name" rules={[{ required: true }]}>
                  <Select
                    showSearch
                    placeholder="Search driver…"
                    filterOption={(input, opt) =>
                      opt?.value?.toLowerCase().includes(input.toLowerCase()) ||
                      opt?.searchLabel?.toLowerCase().includes(input.toLowerCase())
                    }
                    options={drivers.map((d) => ({
                      value: d.name,
                      label: (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <IdcardOutlined style={{ color: '#13c2c2', fontSize: 12 }} />
                          {d.name}
                          <Text type="secondary" style={{ fontSize: 11 }}> — {d.licenseNo}</Text>
                        </span>
                      ),
                      searchLabel: `${d.name} ${d.licenseNo}`,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="date" label="Incident Date" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            {/* Row 3: Type + Severity */}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="type" label="Incident Type" rules={[{ required: true }]}>
                  <Select options={[
                    'Collision','Rollover','Hit & Run','Vehicle Fire','Theft',
                    'Vandalism','Mechanical Failure','Flood Damage','Other',
                  ].map((t) => ({ value: t, label: t }))} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="severity" label="Severity" rules={[{ required: true }]}>
                  <Select options={[
                    { value: 'minor',    label: 'Minor' },
                    { value: 'moderate', label: 'Moderate' },
                    { value: 'major',    label: 'Major' },
                    { value: 'fatal',    label: 'Fatal' },
                  ]} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="location" label="Location" rules={[{ required: true }]}>
              <Input placeholder="Road / area where incident occurred" />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={3} placeholder="Describe what happened…" />
            </Form.Item>
          </FormSection>

          <FormSection title="Impact & Follow-up" color="#fa8c16">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="casualties" label="Casualties">
                  <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="damage" label="Estimated Damage (৳)">
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                  <Select options={[
                    { value: 'open',         label: 'Open' },
                    { value: 'under_review', label: 'Under Review' },
                    { value: 'resolved',     label: 'Resolved' },
                    { value: 'closed',       label: 'Closed' },
                  ]} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="policeCase" label="Police Case No">
                  <Input placeholder="GD / FIR number" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="reportedBy" label="Reported By">
                  <Input placeholder="Name of reporter" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="action" label="Action Taken">
              <Input.TextArea rows={2} placeholder="Steps taken or pending…" />
            </Form.Item>
          </FormSection>
        </Form>
      </FormModal>

      {/* ── View Drawer ── */}
      <Drawer open={!!viewRecord} onClose={() => setViewRecord(null)}
        title={viewRecord ? `Incident — ${viewRecord.caseNo}` : ''} width={520}
        extra={
          <Button size="small" icon={<EditOutlined />}
            onClick={() => { setViewRecord(null); openEdit(viewRecord); }}>Edit</Button>
        }
      >
        {viewRecord && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="Case No"     >{viewRecord.caseNo}</Descriptions.Item>
            <Descriptions.Item label="Status"      ><Tag color={statusColor(viewRecord.status)}>{viewRecord.status?.replace(/_/g,' ').toUpperCase()}</Tag></Descriptions.Item>
            <Descriptions.Item label="Vehicle"     >{viewRecord.vehicleReg}</Descriptions.Item>
            <Descriptions.Item label="Driver"      >{viewRecord.driverName}</Descriptions.Item>
            <Descriptions.Item label="Date"        >{formatDate(viewRecord.date)}</Descriptions.Item>
            <Descriptions.Item label="Type"        >{viewRecord.type}</Descriptions.Item>
            <Descriptions.Item label="Severity"    ><Tag color={SEVERITY_COLOR[viewRecord.severity]}>{viewRecord.severity?.toUpperCase()}</Tag></Descriptions.Item>
            <Descriptions.Item label="Location" span={2}>{viewRecord.location}</Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>{viewRecord.description ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Casualties"  >{viewRecord.casualties ?? 0}</Descriptions.Item>
            <Descriptions.Item label="Damage"      >{viewRecord.damage ? `৳${Number(viewRecord.damage).toLocaleString()}` : '—'}</Descriptions.Item>
            <Descriptions.Item label="Police Case" >{viewRecord.policeCase ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Reported By" >{viewRecord.reportedBy ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Action" span={2}>{viewRecord.action ?? '—'}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
