import {
  CarOutlined, DeleteOutlined, EditOutlined, EyeOutlined,
  PlusOutlined, SearchOutlined, UserOutlined,
} from '@ant-design/icons';
import {
  Button, Card, Col, DatePicker, Descriptions, Drawer, Form, Input,
  InputNumber, Popconfirm, Row, Select, Spin, Table, Tag, message,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import ColumnPicker from '../components/ColumnPicker';
import FormModal, { FormSection } from '../components/FormModal';
import PageHeader from '../components/PageHeader';
import { useApiCrud } from '../hooks/useApiCrud';
import { useColumnPicker } from '../hooks/useColumnPicker';
import { filterOption, useDriverOptions, useVehicleOptions } from '../hooks/useLookupOptions';
import { requisitionService } from '../services/requisitionService';
import { formatDate, statusColor } from '../utils/helpers';

const DEPTS         = ['HQ', 'HR', 'Finance', 'Operations', 'IT', 'Admin', 'Logistics'];
const priorityColor = { normal: 'blue', high: 'orange', urgent: 'red' };

const COLS_DEF = [
  { key: 'reqNo',        columnTitle: 'Booking No',    title: 'Booking No',    dataIndex: 'reqNo' },
  { key: 'requestedBy',  columnTitle: 'Requested By',  title: 'Requested By',  dataIndex: 'requestedBy' },
  { key: 'vehicleReg',   columnTitle: 'Vehicle',       title: 'Vehicle',       dataIndex: 'vehicleReg',  render: (v) => v ?? '—' },
  { key: 'purpose',      columnTitle: 'Purpose',        title: 'Purpose',       dataIndex: 'purpose' },
  { key: 'date',         columnTitle: 'Date',           title: 'Date',          dataIndex: 'date',         render: (d) => formatDate(d) },
  { key: 'priority',     columnTitle: 'Priority',       title: 'Priority',      dataIndex: 'priority',     render: (p) => <Tag color={priorityColor[p]}>{p?.toUpperCase()}</Tag> },
  { key: 'status',       columnTitle: 'Status',         title: 'Status',        dataIndex: 'status',       render: (s) => <Tag color={statusColor(s)}>{s?.toUpperCase()}</Tag> },
  { key: 'department',   columnTitle: 'Department',     title: 'Dept',          dataIndex: 'department',   defaultVisible: false },
  { key: 'fromLocation', columnTitle: 'From',           title: 'From',          dataIndex: 'fromLocation', defaultVisible: false },
  { key: 'toLocation',   columnTitle: 'To',             title: 'To',            dataIndex: 'toLocation',   defaultVisible: false },
  { key: 'fromDate',     columnTitle: 'From Date',      title: 'From Date',     dataIndex: 'fromDate',     defaultVisible: false, render: (d) => formatDate(d) },
  { key: 'toDate',       columnTitle: 'To Date',        title: 'To Date',       dataIndex: 'toDate',       defaultVisible: false, render: (d) => formatDate(d) },
  { key: 'passengers',   columnTitle: 'Passengers',     title: 'Pax',           dataIndex: 'passengers',   defaultVisible: false },
  { key: 'approvedBy',   columnTitle: 'Approved By',    title: 'Approved By',   dataIndex: 'approvedBy',   defaultVisible: false, render: (v) => v ?? '—' },
];

export default function SingleBooking() {
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('all');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [form] = Form.useForm();

  const { data, isLoading, save, remove, isSaving } = useApiCrud('requisitions', requisitionService, {
    onSaveSuccess: () => { setModalOpen(false); message.success('Booking submitted'); },
  });
  const vehicleOptions = useVehicleOptions();
  const driverOptions  = useDriverOptions();

  const { visibleColumns, visibleKeys, setVisible, resetToDefault, allColumns } =
    useColumnPicker('single-booking', COLS_DEF);

  const columns = [
    ...visibleColumns,
    {
      title: 'Actions', key: 'actions', fixed: 'right', width: 120,
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
    return (!q || r.reqNo?.toLowerCase().includes(q) || r.requestedBy?.toLowerCase().includes(q) || r.purpose?.toLowerCase().includes(q))
      && (statusFilter === 'all' || r.status === statusFilter);
  });

  function openAdd()    { setEditRecord(null); form.resetFields(); setModalOpen(true); }
  function openEdit(r)  {
    setEditRecord(r);
    form.setFieldsValue({
      ...r,
      date:     r.date     ? dayjs(r.date)     : null,
      fromDate: r.fromDate ? dayjs(r.fromDate) : null,
      toDate:   r.toDate   ? dayjs(r.toDate)   : null,
    });
    setModalOpen(true);
  }

  function handleSubmit() {
    form.validateFields().then((v) => {
      save(editRecord?.id ?? null, {
        ...v,
        date:     v.date?.format('YYYY-MM-DD')     ?? null,
        fromDate: v.fromDate?.format('YYYY-MM-DD') ?? null,
        toDate:   v.toDate?.format('YYYY-MM-DD')   ?? null,
      });
    });
  }

  const pending  = data.filter((r) => r.status === 'pending').length;
  const approved = data.filter((r) => r.status === 'approved').length;

  return (
    <div>
      <PageHeader
        icon={<UserOutlined />} color="#0958d9" title="Single Booking"
        subtitle="Book one vehicle for a single trip or assignment"
        stats={[
          { label: 'Pending',  value: pending,  color: '#faad14' },
          { label: 'Approved', value: approved, color: '#52c41a' },
          { label: 'Total',    value: data.length, color: '#0958d9' },
        ]}
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>New Booking</Button>}
      />

      <Card size="small" style={{ borderRadius: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
          <Input placeholder="Search booking no, requested by…" prefix={<SearchOutlined />}
            value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 280 }} allowClear />
          <Select value={statusFilter} onChange={setStatus} style={{ width: 130 }} options={[
            { value: 'all', label: 'All Status' }, { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' },
          ]} />
          <div style={{ marginLeft: 'auto' }}>
            <ColumnPicker allColumns={allColumns} visibleKeys={visibleKeys} onChange={setVisible} onReset={resetToDefault} />
          </div>
        </div>
        <Spin spinning={isLoading}>
          <Table dataSource={filtered} columns={columns} size="small" scroll={{ x: 'max-content' }} rowKey="id" pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}`, pageSizeOptions: ['10', '25', '50', '100'] }} />
        </Spin>
      </Card>

      <FormModal
        open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSubmit}
        confirmLoading={isSaving}
        icon={<UserOutlined />} color="#0958d9"
        title={editRecord ? `Edit Booking — ${editRecord.reqNo}` : 'New Single Booking'}
        subtitle={editRecord ? 'Update the booking details' : 'Submit a single vehicle booking request'}
        okText={editRecord ? 'Update' : 'Submit Booking'} width={720}
      >
        <Form form={form} layout="vertical" size="small">
          <FormSection title="Requester Info" color="#0958d9">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="requestedBy" label="Requested By" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="department" label="Department" rules={[{ required: true }]}>
                  <Select options={DEPTS.map((d) => ({ value: d, label: d }))} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="purpose" label="Purpose" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
                  <Select options={[{ value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>

          <FormSection title="Trip Details" color="#1677ff">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="fromLocation" label="From Location" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="toLocation" label="To Location" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="date" label="Request Date" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="fromDate" label="Travel From">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="toDate" label="Travel To">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="vehicleReg" label="Preferred Vehicle">
                  <Select showSearch placeholder="Select vehicle (optional)" options={vehicleOptions}
                    filterOption={filterOption} allowClear />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="passengers" label="Passengers">
                  <InputNumber style={{ width: '100%' }} min={1} />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>

          <FormSection title="Remarks" color="#722ed1">
            <Form.Item name="remarks" style={{ marginBottom: 4 }}>
              <Input.TextArea rows={2} placeholder="Any special notes…" />
            </Form.Item>
          </FormSection>
        </Form>
      </FormModal>

      <Drawer open={!!viewRecord} onClose={() => setViewRecord(null)}
        title={viewRecord ? `Booking — ${viewRecord.reqNo}` : ''} width={480}>
        {viewRecord && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="Booking No"   >{viewRecord.reqNo}</Descriptions.Item>
            <Descriptions.Item label="Status"       ><Tag color={statusColor(viewRecord.status)}>{viewRecord.status?.toUpperCase()}</Tag></Descriptions.Item>
            <Descriptions.Item label="Requested By" >{viewRecord.requestedBy}</Descriptions.Item>
            <Descriptions.Item label="Department"   >{viewRecord.department}</Descriptions.Item>
            <Descriptions.Item label="Purpose" span={2}>{viewRecord.purpose}</Descriptions.Item>
            <Descriptions.Item label="Priority"     ><Tag color={priorityColor[viewRecord.priority]}>{viewRecord.priority?.toUpperCase()}</Tag></Descriptions.Item>
            <Descriptions.Item label="Date"         >{formatDate(viewRecord.date)}</Descriptions.Item>
            <Descriptions.Item label="From"         >{viewRecord.fromLocation}</Descriptions.Item>
            <Descriptions.Item label="To"           >{viewRecord.toLocation}</Descriptions.Item>
            <Descriptions.Item label="Travel From"  >{formatDate(viewRecord.fromDate)}</Descriptions.Item>
            <Descriptions.Item label="Travel To"    >{formatDate(viewRecord.toDate)}</Descriptions.Item>
            <Descriptions.Item label="Vehicle"      >{viewRecord.vehicleReg ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Passengers"   >{viewRecord.passengers ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Approved By"  >{viewRecord.approvedBy ?? '—'}</Descriptions.Item>
            {viewRecord.remarks && <Descriptions.Item label="Remarks" span={2}>{viewRecord.remarks}</Descriptions.Item>}
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
