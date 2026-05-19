import {
  CarOutlined, DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined,
} from '@ant-design/icons';
import { VEHICLE_ICONS, iconPickerSvg } from '../utils/vehicleIcons';
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
import { vehicleService } from '../services/vehicleService';
import { formatCurrency, formatDate, statusColor } from '../utils/helpers';

const OWNERSHIP_COLOR = { Private: 'blue', Government: 'green', Special: 'purple' };

function VehicleIconPicker({ value, onChange }) {
  const sel = value || 'car';
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {VEHICLE_ICONS.map(icon => (
        <div
          key={icon.key}
          onClick={() => onChange(icon.key)}
          title={icon.label}
          style={{
            width: 64, textAlign: 'center', cursor: 'pointer', padding: '6px 4px 4px',
            borderRadius: 8, border: `2px solid ${sel === icon.key ? '#1677ff' : '#d9d9d9'}`,
            background: sel === icon.key ? '#e6f4ff' : '#fafafa',
            transition: 'all 0.15s',
          }}
        >
          <svg
            viewBox="0 0 32 32" width="36" height="36"
            dangerouslySetInnerHTML={{ __html: iconPickerSvg(icon.key) }}
          />
          <div style={{ fontSize: 9, color: sel === icon.key ? '#1677ff' : '#666', marginTop: 2, fontWeight: sel === icon.key ? 700 : 400 }}>
            {icon.label}
          </div>
        </div>
      ))}
    </div>
  );
}

const COLUMNS_DEF = [
  { key: 'regNo',           columnTitle: 'Reg No',           title: 'Reg No',           dataIndex: 'regNo' },
  { key: 'make',            columnTitle: 'Make',             title: 'Make',             dataIndex: 'make' },
  { key: 'model',           columnTitle: 'Model',            title: 'Model',            dataIndex: 'model' },
  { key: 'year',            columnTitle: 'Year',             title: 'Year',             dataIndex: 'year' },
  { key: 'type',            columnTitle: 'Type',             title: 'Type',             dataIndex: 'type' },
  { key: 'ownership',       columnTitle: 'Ownership',        title: 'Ownership',        dataIndex: 'ownership',       render: (v) => v ? <Tag color={OWNERSHIP_COLOR[v]}>{v}</Tag> : '—' },
  { key: 'status',          columnTitle: 'Status',           title: 'Status',           dataIndex: 'status',          render: (s) => <Tag color={statusColor(s)}>{s?.toUpperCase()}</Tag> },
  { key: 'lastService',     columnTitle: 'Last Service',     title: 'Last Service',     dataIndex: 'lastService',     render: (d) => formatDate(d) },
  { key: 'color',           columnTitle: 'Color',            title: 'Color',            dataIndex: 'color',           defaultVisible: false },
  { key: 'fuelType',        columnTitle: 'Fuel Type',        title: 'Fuel Type',        dataIndex: 'fuelType',        defaultVisible: false },
  { key: 'chassisNo',       columnTitle: 'Chassis No',       title: 'Chassis No',       dataIndex: 'chassisNo',       defaultVisible: false },
  { key: 'engineNo',        columnTitle: 'Engine No',        title: 'Engine No',        dataIndex: 'engineNo',        defaultVisible: false },
  { key: 'odometer',        columnTitle: 'Odometer',         title: 'Odometer',         dataIndex: 'odometer',        defaultVisible: false, render: (v) => v != null ? `${Number(v).toLocaleString()} km` : '—' },
  { key: 'insuranceExpiry', columnTitle: 'Insurance Expiry', title: 'Insurance Expiry', dataIndex: 'insuranceExpiry', defaultVisible: false, render: (d) => formatDate(d) },
  { key: 'purchaseDate',    columnTitle: 'Purchase Date',    title: 'Purchase Date',    dataIndex: 'purchaseDate',    defaultVisible: false, render: (d) => formatDate(d) },
  { key: 'purchasePrice',   columnTitle: 'Purchase Price',   title: 'Purchase Price',   dataIndex: 'purchasePrice',   defaultVisible: false, render: (v) => formatCurrency(v) },
  { key: 'owner',           columnTitle: 'Owner',            title: 'Owner',            dataIndex: 'owner',           defaultVisible: false },
];

export default function Vehicles() {
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatus]       = useState('all');
  const [ownershipFilter, setOwnership] = useState('all');
  const [modalOpen, setModalOpen]       = useState(false);
  const [editRecord, setEditRecord]     = useState(null);
  const [viewRecord, setViewRecord]     = useState(null);
  const [form] = Form.useForm();

  const { data, isLoading, save, remove, isSaving } = useApiCrud('vehicles', vehicleService, {
    onSaveSuccess: () => setModalOpen(false),
  });

  const { visibleColumns, visibleKeys, setVisible, resetToDefault, allColumns } =
    useColumnPicker('vehicles', COLUMNS_DEF);

  const columns = [
    ...visibleColumns,
    {
      title: 'Actions', key: 'actions', fixed: 'right', width: 110,
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 2 }}>
          <Button type="link" size="small" icon={<EyeOutlined />}    onClick={() => setViewRecord(r)} />
          <Button type="link" size="small" icon={<EditOutlined />}   onClick={() => openEdit(r)} />
          <Popconfirm title="Delete this vehicle?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => remove(r.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  const filtered = data.filter((v) => {
    const q = search.toLowerCase();
    const matchQ = !q || v.regNo?.toLowerCase().includes(q) || v.make?.toLowerCase().includes(q) || v.model?.toLowerCase().includes(q);
    const matchS = statusFilter === 'all' || v.status === statusFilter;
    const matchO = ownershipFilter === 'all' || v.ownership === ownershipFilter;
    return matchQ && matchS && matchO;
  });

  function openAdd() { setEditRecord(null); form.resetFields(); setModalOpen(true); }

  function openEdit(record) {
    setEditRecord(record);
    form.setFieldsValue({
      ...record,
      vehicleIcon:     record.vehicleIcon     || 'car',
      insuranceExpiry: record.insuranceExpiry ? dayjs(record.insuranceExpiry) : null,
      purchaseDate:    record.purchaseDate    ? dayjs(record.purchaseDate)    : null,
      lastService:     record.lastService     ? dayjs(record.lastService)     : null,
    });
    setModalOpen(true);
  }

  function handleSubmit() {
    form.validateFields().then((values) => {
      const payload = {
        ...values,
        insuranceExpiry: values.insuranceExpiry?.format('YYYY-MM-DD') ?? null,
        purchaseDate:    values.purchaseDate?.format('YYYY-MM-DD')    ?? null,
        lastService:     values.lastService?.format('YYYY-MM-DD')     ?? null,
      };
      save(editRecord?.id ?? null, payload);
    });
  }

  const total    = data.length;
  const active   = data.filter((v) => v.status === 'active').length;
  const inactive = data.filter((v) => v.status === 'inactive').length;

  return (
    <div>
      <PageHeader
        icon={<CarOutlined />} color="#52c41a" title="Vehicles"
        subtitle="Manage and track your entire fleet"
        stats={[
          { label: 'Total',    value: total,    color: '#52c41a' },
          { label: 'Active',   value: active,   color: '#1677ff' },
          { label: 'Inactive', value: inactive, color: '#ff4d4f' },
        ]}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add Vehicle</Button>
        }
      />

      <Card size="small" style={{ borderRadius: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
          <Input placeholder="Search reg no, make, model…" prefix={<SearchOutlined />} value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 260 }} allowClear />
          <Select value={ownershipFilter} onChange={setOwnership} style={{ width: 150 }} options={[
            { value: 'all',        label: 'All Ownership' },
            { value: 'Private',    label: 'Private' },
            { value: 'Government', label: 'Government' },
            { value: 'Special',    label: 'Special' },
          ]} />
          <Select value={statusFilter} onChange={setStatus} style={{ width: 130 }} options={[{ value:'all', label:'All Status' },{ value:'active', label:'Active' },{ value:'inactive', label:'Inactive' }]} />
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
        icon={<CarOutlined />}
        color="#52c41a"
        title={editRecord ? `Edit Vehicle — ${editRecord.regNo}` : 'Add New Vehicle'}
        subtitle={editRecord ? 'Update the vehicle information below' : 'Fill in the details to register a new vehicle'}
        okText={editRecord ? 'Update Vehicle' : 'Add Vehicle'}
        width={760}
      >
        <Form form={form} layout="vertical" size="small">
          <FormSection title="Identity" color="#52c41a">
            <Row gutter={16}>
              <Col span={8}><Form.Item name="regNo" label="Registration No" rules={[{ required: true, message: 'Required' }]}><Input placeholder="DHK-0000" /></Form.Item></Col>
              <Col span={8}>
                <Form.Item name="make" label="Make" rules={[{ required: true, message: 'Required' }]}>
                  <Select showSearch placeholder="Select make" options={[
                    'Toyota','Mitsubishi','Isuzu','Tata','Hyundai','Nissan','Hino',
                    'Mercedes-Benz','Volvo','Ashok Leyland','Mahindra','Ford',
                    'Honda','Suzuki','Kia','MAN','Foton','JAC','Yutong','Other',
                  ].map((m) => ({ value: m, label: m }))} />
                </Form.Item>
              </Col>
              <Col span={8}><Form.Item name="model" label="Model"           rules={[{ required: true, message: 'Required' }]}><Input placeholder="Hilux" /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={6}><Form.Item name="year" label="Year" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={2000} max={2035} /></Form.Item></Col>
              <Col span={6}><Form.Item name="type" label="Type" rules={[{ required: true }]}><Select options={['Pickup','Truck','SUV','Van','Bus','Microbus'].map((t) => ({ value: t, label: t }))} /></Form.Item></Col>
              <Col span={6}><Form.Item name="fuelType" label="Fuel Type" rules={[{ required: true }]}><Select options={['Diesel','Petrol','CNG','Electric'].map((f) => ({ value: f, label: f }))} /></Form.Item></Col>
              <Col span={6}>
                <Form.Item name="ownership" label="Ownership" rules={[{ required: true }]}>
                  <Select options={['Private','Government','Special'].map((o) => ({ value: o, label: o }))} />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>

          <FormSection title="Technical Details" color="#1677ff">
            <Row gutter={16}>
              <Col span={8}><Form.Item name="color"     label="Color">     <Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="chassisNo" label="Chassis No"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="engineNo"  label="Engine No"> <Input /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="odometer" label="Odometer (km)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
              <Col span={8}><Form.Item name="owner"    label="Owner / Branch"><Input /></Form.Item></Col>
              <Col span={8}>
                <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                  <Select options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>

          <FormSection title="Financial & Compliance" color="#fa8c16">
            <Row gutter={16}>
              <Col span={8}><Form.Item name="purchaseDate"    label="Purchase Date">     <DatePicker style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={8}><Form.Item name="purchasePrice"   label="Purchase Price (৳)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
              <Col span={8}><Form.Item name="insuranceExpiry" label="Insurance Expiry">  <DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="lastService" label="Last Service Date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            </Row>
          </FormSection>

          <FormSection title="Map Icon" color="#722ed1">
            <Form.Item name="vehicleIcon" label="Select icon shown on the VTS map" initialValue="car">
              <VehicleIconPicker />
            </Form.Item>
          </FormSection>
        </Form>
      </FormModal>

      {/* ── View Drawer ── */}
      <Drawer
        open={!!viewRecord} onClose={() => setViewRecord(null)}
        title={viewRecord ? `Vehicle — ${viewRecord.regNo}` : ''} width={520}
        extra={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="small" icon={<EditOutlined />} onClick={() => { setViewRecord(null); openEdit(viewRecord); }}>Edit</Button>
            <Popconfirm title="Delete this vehicle?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => { remove(viewRecord.id); setViewRecord(null); }}>
              <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
            </Popconfirm>
          </div>
        }
      >
        {viewRecord && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="Reg No"        >{viewRecord.regNo}</Descriptions.Item>
            <Descriptions.Item label="Status"        ><Tag color={statusColor(viewRecord.status)}>{viewRecord.status?.toUpperCase()}</Tag></Descriptions.Item>
            <Descriptions.Item label="Make"          >{viewRecord.make}</Descriptions.Item>
            <Descriptions.Item label="Model"         >{viewRecord.model}</Descriptions.Item>
            <Descriptions.Item label="Year"          >{viewRecord.year}</Descriptions.Item>
            <Descriptions.Item label="Type"          >{viewRecord.type}</Descriptions.Item>
            <Descriptions.Item label="Ownership"     ><Tag color={OWNERSHIP_COLOR[viewRecord.ownership]}>{viewRecord.ownership}</Tag></Descriptions.Item>
            <Descriptions.Item label="Color"         >{viewRecord.color}</Descriptions.Item>
            <Descriptions.Item label="Fuel Type"     >{viewRecord.fuelType}</Descriptions.Item>
            <Descriptions.Item label="Chassis No"    >{viewRecord.chassisNo}</Descriptions.Item>
            <Descriptions.Item label="Engine No"     >{viewRecord.engineNo}</Descriptions.Item>
            <Descriptions.Item label="Odometer"      >{viewRecord.odometer?.toLocaleString()} km</Descriptions.Item>
            <Descriptions.Item label="Owner"         >{viewRecord.owner}</Descriptions.Item>
            <Descriptions.Item label="Purchase Date" >{formatDate(viewRecord.purchaseDate)}</Descriptions.Item>
            <Descriptions.Item label="Purchase Price">{formatCurrency(viewRecord.purchasePrice)}</Descriptions.Item>
            <Descriptions.Item label="Ins. Expiry"   >{formatDate(viewRecord.insuranceExpiry)}</Descriptions.Item>
            <Descriptions.Item label="Last Service"  >{formatDate(viewRecord.lastService)}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
