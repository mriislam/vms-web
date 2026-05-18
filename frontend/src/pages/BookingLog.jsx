import {
  DownloadOutlined, EyeOutlined, FileTextOutlined, SearchOutlined,
} from '@ant-design/icons';
import {
  Button, Card, DatePicker, Descriptions, Drawer, Input,
  Select, Spin, Table, Tag,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import ColumnPicker from '../components/ColumnPicker';
import PageHeader from '../components/PageHeader';
import { useApiCrud } from '../hooks/useApiCrud';
import { useColumnPicker } from '../hooks/useColumnPicker';
import { dispatchService } from '../services/dispatchService';
import { formatDate, formatDateTime, statusColor } from '../utils/helpers';

const { RangePicker } = DatePicker;

const COLS_DEF = [
  { key: 'dispatchNo',  columnTitle: 'Dispatch No',   title: 'Dispatch No',   dataIndex: 'dispatchNo' },
  { key: 'vehicleReg',  columnTitle: 'Vehicle',        title: 'Vehicle',       dataIndex: 'vehicleReg' },
  { key: 'driverName',  columnTitle: 'Driver',         title: 'Driver',        dataIndex: 'driverName' },
  { key: 'origin',      columnTitle: 'Origin',         title: 'Origin',        dataIndex: 'origin' },
  { key: 'destination', columnTitle: 'Destination',    title: 'Destination',   dataIndex: 'destination' },
  { key: 'date',        columnTitle: 'Date',            title: 'Date',          dataIndex: 'date',       render: (d) => formatDate(d) },
  { key: 'status',      columnTitle: 'Status',          title: 'Status',        dataIndex: 'status',     render: (s) => <Tag color={statusColor(s)}>{s?.replace(/_/g, ' ').toUpperCase()}</Tag> },
  { key: 'distance',    columnTitle: 'Distance (km)',   title: 'Distance',      dataIndex: 'distance',   render: (v) => v ? `${v} km` : '—' },
  { key: 'fuelUsed',    columnTitle: 'Fuel Used (L)',   title: 'Fuel',          dataIndex: 'fuelUsed',   defaultVisible: false, render: (v) => v ? `${v} L` : '—' },
  { key: 'purpose',     columnTitle: 'Purpose',         title: 'Purpose',       dataIndex: 'purpose',    defaultVisible: false },
  { key: 'approvedBy',  columnTitle: 'Approved By',     title: 'Approved By',   dataIndex: 'approvedBy', defaultVisible: false },
  { key: 'startTime',   columnTitle: 'Start Time',      title: 'Start Time',    dataIndex: 'startTime',  defaultVisible: false, render: (v) => v ? formatDateTime(v) : '—' },
  { key: 'endTime',     columnTitle: 'End Time',        title: 'End Time',      dataIndex: 'endTime',    defaultVisible: false, render: (v) => v ? formatDateTime(v) : '—' },
];

export default function BookingLog() {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatus]     = useState('all');
  const [dateRange, setDateRange]     = useState(null);
  const [viewRecord, setViewRecord]   = useState(null);

  const { data, isLoading } = useApiCrud('vehicle-requisition', dispatchService);

  const { visibleColumns, visibleKeys, setVisible, resetToDefault, allColumns } =
    useColumnPicker('booking-log', COLS_DEF);

  const columns = [
    ...visibleColumns,
    {
      title: '', key: 'view', width: 48, fixed: 'right',
      render: (_, r) => <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setViewRecord(r)} />,
    },
  ];

  const filtered = data.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch = !q || d.dispatchNo?.toLowerCase().includes(q)
      || d.vehicleReg?.toLowerCase().includes(q) || d.driverName?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchDate   = !dateRange || !dateRange[0] || (
      d.date && dayjs(d.date).isAfter(dateRange[0].startOf('day').subtract(1, 'ms'))
             && dayjs(d.date).isBefore(dateRange[1].endOf('day').add(1, 'ms'))
    );
    return matchSearch && matchStatus && matchDate;
  });

  const totalDistance = filtered.reduce((s, d) => s + (d.distance ?? 0), 0);
  const totalFuel     = filtered.reduce((s, d) => s + (d.fuelUsed  ?? 0), 0);

  return (
    <div>
      <PageHeader
        icon={<FileTextOutlined />} color="#d4380d" title="Vehicle Booking Log"
        subtitle="Complete history and audit trail of all vehicle bookings"
        stats={[
          { label: 'Total Records',    value: filtered.length,          color: '#d4380d' },
          { label: 'Total Distance',   value: `${totalDistance} km`,    color: '#1677ff' },
          { label: 'Total Fuel',       value: `${totalFuel.toFixed(1)} L`, color: '#52c41a' },
        ]}
        actions={
          <Button icon={<DownloadOutlined />}>Export CSV</Button>
        }
      />

      <Card size="small" style={{ borderRadius: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <Input placeholder="Search dispatch no, vehicle, driver…" prefix={<SearchOutlined />}
            value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 260 }} allowClear />
          <Select value={statusFilter} onChange={setStatus} style={{ width: 140 }} options={[
            { value: 'all', label: 'All Status' }, { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' }, { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
          ]} />
          <RangePicker size="small" onChange={setDateRange} style={{ width: 240 }} />
          <div style={{ marginLeft: 'auto' }}>
            <ColumnPicker allColumns={allColumns} visibleKeys={visibleKeys} onChange={setVisible} onReset={resetToDefault} />
          </div>
        </div>
        <Spin spinning={isLoading}>
          <Table dataSource={filtered} columns={columns} size="small" scroll={{ x: 'max-content' }} rowKey="id"
            summary={() => filtered.length > 0 && (
              <Table.Summary.Row style={{ background: '#fafafa' }}>
                <Table.Summary.Cell index={0} colSpan={visibleColumns.length}>
                  <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                    {filtered.length} record(s) &nbsp;|&nbsp;
                    Total distance: <strong>{totalDistance} km</strong> &nbsp;|&nbsp;
                    Total fuel: <strong>{totalFuel.toFixed(1)} L</strong>
                  </span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </Spin>
      </Card>

      <Drawer open={!!viewRecord} onClose={() => setViewRecord(null)}
        title={viewRecord ? `Trip Log — ${viewRecord.dispatchNo}` : ''} width={460}>
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
