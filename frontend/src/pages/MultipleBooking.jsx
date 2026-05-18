import {
  AppstoreOutlined, DeleteOutlined, PlusOutlined, SaveOutlined, SearchOutlined,
} from '@ant-design/icons';
import {
  Button, Card, Col, DatePicker, Form, Input, InputNumber,
  Row, Select, Space, Table, Tag, Tooltip, message,
} from 'antd';
import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import { filterOption, useDriverOptions, useVehicleOptions } from '../hooks/useLookupOptions';

const DEPTS         = ['HQ', 'HR', 'Finance', 'Operations', 'IT', 'Admin', 'Logistics'];
const priorityColor = { normal: 'blue', high: 'orange', urgent: 'red' };

let rowKey = 1;

function emptyRow() {
  return {
    key:          rowKey++,
    vehicleReg:   null,
    driverName:   null,
    requestedBy:  '',
    department:   null,
    fromLocation: '',
    toLocation:   '',
    fromDate:     null,
    toDate:       null,
    passengers:   1,
    priority:     'normal',
    purpose:      '',
  };
}

export default function MultipleBooking() {
  const [rows, setRows]   = useState([emptyRow()]);
  const [search, setSearch] = useState('');
  const vehicleOptions    = useVehicleOptions();
  const driverOptions     = useDriverOptions();

  function addRow()       { setRows((prev) => [...prev, emptyRow()]); }
  function removeRow(key) { setRows((prev) => prev.filter((r) => r.key !== key)); }

  function updateRow(key, field, value) {
    setRows((prev) => prev.map((r) => r.key === key ? { ...r, [field]: value } : r));
  }

  function handleSubmit() {
    const invalid = rows.some((r) => !r.vehicleReg || !r.requestedBy || !r.fromLocation || !r.toLocation || !r.fromDate || !r.toDate);
    if (invalid) { message.warning('Please fill all required fields in every row'); return; }
    message.success(`${rows.length} booking(s) submitted successfully`);
    setRows([emptyRow()]);
  }

  const colStyle = { padding: '4px 6px' };

  const columns = [
    {
      title: '#', width: 40, fixed: 'left',
      render: (_, __, i) => <span style={{ color: '#8c8c8c', fontSize: 12 }}>{i + 1}</span>,
    },
    {
      title: <span style={{ color: '#ff4d4f' }}>Vehicle *</span>, width: 180,
      render: (_, r) => (
        <Select size="small" showSearch placeholder="Select vehicle" style={{ width: '100%' }}
          options={vehicleOptions} filterOption={filterOption} value={r.vehicleReg}
          onChange={(v) => updateRow(r.key, 'vehicleReg', v)} />
      ),
    },
    {
      title: 'Driver', width: 180,
      render: (_, r) => (
        <Select size="small" showSearch placeholder="Select driver" style={{ width: '100%' }}
          options={driverOptions} filterOption={filterOption} value={r.driverName} allowClear
          onChange={(v) => updateRow(r.key, 'driverName', v)} />
      ),
    },
    {
      title: <span style={{ color: '#ff4d4f' }}>Requested By *</span>, width: 150,
      render: (_, r) => (
        <Input size="small" value={r.requestedBy} placeholder="Name"
          onChange={(e) => updateRow(r.key, 'requestedBy', e.target.value)} />
      ),
    },
    {
      title: 'Department', width: 140,
      render: (_, r) => (
        <Select size="small" style={{ width: '100%' }} placeholder="Select"
          options={DEPTS.map((d) => ({ value: d, label: d }))} value={r.department}
          onChange={(v) => updateRow(r.key, 'department', v)} />
      ),
    },
    {
      title: <span style={{ color: '#ff4d4f' }}>From *</span>, width: 140,
      render: (_, r) => (
        <Input size="small" value={r.fromLocation} placeholder="Origin"
          onChange={(e) => updateRow(r.key, 'fromLocation', e.target.value)} />
      ),
    },
    {
      title: <span style={{ color: '#ff4d4f' }}>To *</span>, width: 140,
      render: (_, r) => (
        <Input size="small" value={r.toLocation} placeholder="Destination"
          onChange={(e) => updateRow(r.key, 'toLocation', e.target.value)} />
      ),
    },
    {
      title: <span style={{ color: '#ff4d4f' }}>From Date *</span>, width: 130,
      render: (_, r) => (
        <DatePicker size="small" style={{ width: '100%' }} value={r.fromDate}
          onChange={(v) => updateRow(r.key, 'fromDate', v)} />
      ),
    },
    {
      title: <span style={{ color: '#ff4d4f' }}>To Date *</span>, width: 130,
      render: (_, r) => (
        <DatePicker size="small" style={{ width: '100%' }} value={r.toDate}
          onChange={(v) => updateRow(r.key, 'toDate', v)} />
      ),
    },
    {
      title: 'Pax', width: 70,
      render: (_, r) => (
        <InputNumber size="small" min={1} style={{ width: '100%' }} value={r.passengers}
          onChange={(v) => updateRow(r.key, 'passengers', v)} />
      ),
    },
    {
      title: 'Priority', width: 110,
      render: (_, r) => (
        <Select size="small" style={{ width: '100%' }} value={r.priority}
          onChange={(v) => updateRow(r.key, 'priority', v)}
          options={[{ value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} />
      ),
    },
    {
      title: 'Purpose', width: 160,
      render: (_, r) => (
        <Input size="small" value={r.purpose} placeholder="Purpose"
          onChange={(e) => updateRow(r.key, 'purpose', e.target.value)} />
      ),
    },
    {
      title: '', key: 'del', width: 44, fixed: 'right',
      render: (_, r) => (
        <Tooltip title="Remove row">
          <Button type="text" size="small" danger icon={<DeleteOutlined />}
            disabled={rows.length === 1} onClick={() => removeRow(r.key)} />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        icon={<AppstoreOutlined />} color="#531dab" title="Multiple Booking"
        subtitle="Submit bulk vehicle booking requests in a single batch"
        stats={[
          { label: 'Rows Added', value: rows.length,                                 color: '#531dab' },
          { label: 'Filled',     value: rows.filter((r) => r.vehicleReg).length,     color: '#52c41a' },
          { label: 'Incomplete', value: rows.filter((r) => !r.vehicleReg).length,    color: '#fa8c16' },
        ]}
        actions={
          <Space>
            <Button icon={<PlusOutlined />} onClick={addRow}>Add Row</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSubmit}>
              Submit {rows.length} Booking{rows.length > 1 ? 's' : ''}
            </Button>
          </Space>
        }
      />

      <Card size="small" style={{ borderRadius: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
          <Input placeholder="Filter rows…" prefix={<SearchOutlined />}
            value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 220 }} allowClear />
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#8c8c8c' }}>
            * Required fields &nbsp;|&nbsp; {rows.length} row(s)
          </span>
        </div>

        <Table
          dataSource={rows.filter((r) => !search || r.requestedBy?.toLowerCase().includes(search.toLowerCase()) || r.vehicleReg?.toLowerCase().includes(search.toLowerCase()))}
          columns={columns}
          size="small"
          scroll={{ x: 1600 }}
          rowKey="key"
          pagination={false}
          bordered
          style={{ fontSize: 12 }}
        />

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button icon={<PlusOutlined />} onClick={addRow} size="small">Add Another Row</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSubmit}>
            Submit All Bookings
          </Button>
        </div>
      </Card>
    </div>
  );
}
