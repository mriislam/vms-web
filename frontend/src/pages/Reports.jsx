import { DownloadOutlined, FileTextOutlined, FundOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  Button, Card, Col, DatePicker, Divider, Row, Select, Space, Table, Tag, Typography, message,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import PageHeader from '../components/PageHeader';
import { formatCurrency, formatDate } from '../utils/helpers';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

/* ── Mock data generators ───────────────────────────────────────── */
const FUEL_DATA = [
  { vehicle: 'DHK-1234', driver: 'Rahim Uddin',   litres: 420, pricePerL: 109, total: 45780, odometer: 82400, date: '2026-04-10' },
  { vehicle: 'DHK-5678', driver: 'Karim Ali',     litres: 380, pricePerL: 109, total: 41420, odometer: 71200, date: '2026-04-11' },
  { vehicle: 'CTG-0091', driver: 'Nasir Hossain', litres: 310, pricePerL: 109, total: 33790, odometer: 65800, date: '2026-04-12' },
  { vehicle: 'SYL-3322', driver: 'Jalal Mia',     litres: 290, pricePerL: 109, total: 31610, odometer: 58200, date: '2026-04-13' },
  { vehicle: 'DHK-7741', driver: 'Farid Ahmed',   litres: 260, pricePerL: 109, total: 28340, odometer: 49500, date: '2026-04-14' },
];

const VEHICLE_USAGE = [
  { vehicle: 'DHK-1234', type: 'Truck',   trips: 24, km: 3820, idleHours: 12, fuelEff: 11.2, lastService: '2026-03-15' },
  { vehicle: 'DHK-5678', type: 'Van',     trips: 20, km: 3210, idleHours: 8,  fuelEff: 12.1, lastService: '2026-03-20' },
  { vehicle: 'CTG-0091', type: 'Pickup',  trips: 18, km: 2900, idleHours: 15, fuelEff: 10.8, lastService: '2026-03-10' },
  { vehicle: 'SYL-3322', type: 'Truck',   trips: 15, km: 2400, idleHours: 20, fuelEff: 9.9,  lastService: '2026-02-28' },
  { vehicle: 'DHK-7741', type: 'Bus',     trips: 22, km: 3600, idleHours: 6,  fuelEff: 13.5, lastService: '2026-04-01' },
];

const DRIVER_PERF = [
  { driver: 'Rahim Uddin',   trips: 24, onTime: 22, fuelEff: 11.2, incidents: 0, rating: 4.8 },
  { driver: 'Karim Ali',     trips: 20, onTime: 18, fuelEff: 12.1, incidents: 1, rating: 4.5 },
  { driver: 'Nasir Hossain', trips: 18, onTime: 17, fuelEff: 10.8, incidents: 0, rating: 4.7 },
  { driver: 'Jalal Mia',     trips: 15, onTime: 12, fuelEff: 9.9,  incidents: 2, rating: 4.1 },
  { driver: 'Farid Ahmed',   trips: 22, onTime: 21, fuelEff: 13.5, incidents: 0, rating: 4.9 },
];

const MAINTENANCE = [
  { vehicle: 'DHK-1234', type: 'Oil Change',     vendor: 'AutoCare BD',  cost: 4500,  date: '2026-03-15', status: 'completed' },
  { vehicle: 'DHK-5678', type: 'Tyre Rotation',  vendor: 'SpeedWheels',  cost: 6200,  date: '2026-03-20', status: 'completed' },
  { vehicle: 'CTG-0091', type: 'Brake Service',  vendor: 'MechPlus',     cost: 12000, date: '2026-03-10', status: 'completed' },
  { vehicle: 'SYL-3322', type: 'Engine Tuning',  vendor: 'AutoCare BD',  cost: 18500, date: '2026-02-28', status: 'completed' },
  { vehicle: 'DHK-7741', type: 'AC Service',     vendor: 'CoolAuto',     cost: 8000,  date: '2026-04-01', status: 'completed' },
];

const EXPENSES = [
  { category: 'Fuel',        description: 'Monthly diesel refill',     amount: 182400, date: '2026-04-10', ref: 'EXP-0041' },
  { category: 'Maintenance', description: 'Fleet service — April',     amount: 49200,  date: '2026-04-12', ref: 'EXP-0042' },
  { category: 'Insurance',   description: 'Vehicle insurance premium', amount: 95000,  date: '2026-04-01', ref: 'EXP-0043' },
  { category: 'Toll',        description: 'Highway toll — April',      amount: 12800,  date: '2026-04-14', ref: 'EXP-0044' },
  { category: 'Other',       description: 'Misc operational costs',    amount: 15600,  date: '2026-04-15', ref: 'EXP-0045' },
];

const DISPATCH_LOG = [
  { dispatchId: 'DSP-0101', vehicle: 'DHK-1234', driver: 'Rahim Uddin',   origin: 'Dhaka HQ',     destination: 'Chittagong', status: 'completed', departTime: '2026-04-10 08:00', arrivalTime: '2026-04-10 14:30' },
  { dispatchId: 'DSP-0102', vehicle: 'DHK-5678', driver: 'Karim Ali',     origin: 'Dhaka HQ',     destination: 'Sylhet',     status: 'completed', departTime: '2026-04-11 09:00', arrivalTime: '2026-04-11 15:00' },
  { dispatchId: 'DSP-0103', vehicle: 'CTG-0091', driver: 'Nasir Hossain', origin: 'Chittagong',   destination: 'Comilla',    status: 'completed', departTime: '2026-04-12 07:30', arrivalTime: '2026-04-12 10:00' },
  { dispatchId: 'DSP-0104', vehicle: 'SYL-3322', driver: 'Jalal Mia',     origin: 'Sylhet',       destination: 'Dhaka HQ',   status: 'in_progress', departTime: '2026-04-14 10:00', arrivalTime: '—' },
  { dispatchId: 'DSP-0105', vehicle: 'DHK-7741', driver: 'Farid Ahmed',   origin: 'Dhaka HQ',     destination: 'Rajshahi',   status: 'completed', departTime: '2026-04-13 06:00', arrivalTime: '2026-04-13 14:00' },
];

/* ── Column definitions per report type ────────────────────────── */
const REPORT_CONFIG = {
  fuel_summary: {
    title: 'Fuel Summary',
    color: '#ff4d4f',
    icon: '⛽',
    columns: [
      { title: 'Vehicle',    dataIndex: 'vehicle' },
      { title: 'Driver',     dataIndex: 'driver' },
      { title: 'Litres',     dataIndex: 'litres',    render: (v) => `${v} L` },
      { title: 'Price/L',    dataIndex: 'pricePerL', render: (v) => `৳${v}` },
      { title: 'Total',      dataIndex: 'total',     render: (v) => formatCurrency(v) },
      { title: 'Date',       dataIndex: 'date',      render: (d) => formatDate(d) },
    ],
    data: FUEL_DATA,
    chartKey: 'total',
    chartLabel: 'vehicle',
    chartTitle: 'Fuel Cost by Vehicle (৳)',
    summary: () => `Total: ${formatCurrency(FUEL_DATA.reduce((s, r) => s + r.total, 0))} · ${FUEL_DATA.reduce((s, r) => s + r.litres, 0)} litres`,
  },
  vehicle_usage: {
    title: 'Vehicle Usage',
    color: '#1677ff',
    icon: '🚛',
    columns: [
      { title: 'Vehicle',    dataIndex: 'vehicle' },
      { title: 'Type',       dataIndex: 'type' },
      { title: 'Trips',      dataIndex: 'trips' },
      { title: 'Distance',   dataIndex: 'km',         render: (v) => `${v.toLocaleString()} km` },
      { title: 'Idle Hrs',   dataIndex: 'idleHours',  render: (v) => `${v} h` },
      { title: 'Fuel Eff.',  dataIndex: 'fuelEff',    render: (v) => `${v} km/L` },
      { title: 'Last Service', dataIndex: 'lastService', render: (d) => formatDate(d) },
    ],
    data: VEHICLE_USAGE,
    chartKey: 'km',
    chartLabel: 'vehicle',
    chartTitle: 'Distance Covered (km)',
    summary: () => `Total: ${VEHICLE_USAGE.reduce((s, r) => s + r.trips, 0)} trips · ${VEHICLE_USAGE.reduce((s, r) => s + r.km, 0).toLocaleString()} km`,
  },
  driver_performance: {
    title: 'Driver Performance',
    color: '#52c41a',
    icon: '👤',
    columns: [
      { title: 'Driver',     dataIndex: 'driver' },
      { title: 'Trips',      dataIndex: 'trips' },
      { title: 'On-Time',    dataIndex: 'onTime' },
      { title: 'On-Time %',  key: 'pct', render: (_, r) => `${Math.round((r.onTime / r.trips) * 100)}%` },
      { title: 'Fuel Eff.',  dataIndex: 'fuelEff',   render: (v) => `${v} km/L` },
      { title: 'Incidents',  dataIndex: 'incidents',  render: (v) => <Tag color={v === 0 ? 'green' : 'red'}>{v}</Tag> },
      { title: 'Rating',     dataIndex: 'rating',     render: (v) => `★ ${v}` },
    ],
    data: DRIVER_PERF,
    chartKey: 'trips',
    chartLabel: 'driver',
    chartTitle: 'Trips by Driver',
    summary: () => `${DRIVER_PERF.length} drivers · Avg rating: ${(DRIVER_PERF.reduce((s, r) => s + r.rating, 0) / DRIVER_PERF.length).toFixed(1)}`,
  },
  maintenance_cost: {
    title: 'Maintenance Cost',
    color: '#fa541c',
    icon: '🔧',
    columns: [
      { title: 'Vehicle',    dataIndex: 'vehicle' },
      { title: 'Type',       dataIndex: 'type' },
      { title: 'Vendor',     dataIndex: 'vendor' },
      { title: 'Cost',       dataIndex: 'cost',    render: (v) => formatCurrency(v) },
      { title: 'Date',       dataIndex: 'date',    render: (d) => formatDate(d) },
      { title: 'Status',     dataIndex: 'status',  render: (s) => <Tag color="green">{s.toUpperCase()}</Tag> },
    ],
    data: MAINTENANCE,
    chartKey: 'cost',
    chartLabel: 'vehicle',
    chartTitle: 'Maintenance Cost by Vehicle (৳)',
    summary: () => `Total: ${formatCurrency(MAINTENANCE.reduce((s, r) => s + r.cost, 0))}`,
  },
  expense_report: {
    title: 'Expense Report',
    color: '#13c2c2',
    icon: '💰',
    columns: [
      { title: 'Ref',        dataIndex: 'ref' },
      { title: 'Category',   dataIndex: 'category',   render: (c) => <Tag color="cyan">{c}</Tag> },
      { title: 'Description', dataIndex: 'description' },
      { title: 'Amount',     dataIndex: 'amount',     render: (v) => formatCurrency(v) },
      { title: 'Date',       dataIndex: 'date',       render: (d) => formatDate(d) },
    ],
    data: EXPENSES,
    chartKey: 'amount',
    chartLabel: 'category',
    chartTitle: 'Expenses by Category (৳)',
    summary: () => `Total: ${formatCurrency(EXPENSES.reduce((s, r) => s + r.amount, 0))}`,
  },
  dispatch_log: {
    title: 'Dispatch Log',
    color: '#fa8c16',
    icon: '📋',
    columns: [
      { title: 'Dispatch ID', dataIndex: 'dispatchId' },
      { title: 'Vehicle',    dataIndex: 'vehicle' },
      { title: 'Driver',     dataIndex: 'driver' },
      { title: 'Origin',     dataIndex: 'origin' },
      { title: 'Destination', dataIndex: 'destination' },
      { title: 'Depart',     dataIndex: 'departTime' },
      { title: 'Arrival',    dataIndex: 'arrivalTime' },
      { title: 'Status',     dataIndex: 'status',    render: (s) => <Tag color={s === 'completed' ? 'green' : 'blue'}>{s.toUpperCase()}</Tag> },
    ],
    data: DISPATCH_LOG,
    chartKey: null,
    chartTitle: null,
    summary: () => `${DISPATCH_LOG.length} dispatches · ${DISPATCH_LOG.filter((d) => d.status === 'completed').length} completed`,
  },
};

const reportTypes = Object.entries(REPORT_CONFIG).map(([value, cfg]) => ({ value, label: cfg.title }));

const reportCards = Object.entries(REPORT_CONFIG).map(([type, cfg]) => ({
  type,
  title: cfg.title,
  description: {
    fuel_summary:       'Monthly fuel consumption and cost breakdown by vehicle.',
    vehicle_usage:      'Distance covered, trips completed, idle time per vehicle.',
    driver_performance: 'Trip history, fuel efficiency, and on-time delivery rate.',
    maintenance_cost:   'Service records and cumulative maintenance costs.',
    expense_report:     'Categorised expense ledger for any date range.',
    dispatch_log:       'Complete dispatch history with status and route details.',
  }[type],
  color: cfg.color,
  icon: cfg.icon,
}));

function exportCSV(config) {
  const rows   = config.data;
  const cols   = config.columns.filter((c) => c.dataIndex);
  const header = cols.map((c) => c.title).join(',');
  const body   = rows.map((row) =>
    cols.map((c) => {
      const val = row[c.dataIndex];
      return typeof val === 'string' && val.includes(',') ? `"${val}"` : val ?? '';
    }).join(',')
  ).join('\n');
  const csv  = `${header}\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${config.title.replace(/\s+/g, '_')}_${dayjs().format('YYYYMMDD')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [selected, setSelected]     = useState(null);
  const [generated, setGenerated]   = useState(false);
  const [dateRange, setDateRange]   = useState([dayjs().startOf('month'), dayjs()]);

  const config = selected ? REPORT_CONFIG[selected] : null;

  function handleGenerate() {
    if (!selected) return;
    setGenerated(true);
    message.success(`${config.title} generated`);
  }

  function handleExport(type) {
    const cfg = REPORT_CONFIG[type];
    exportCSV(cfg);
    message.success(`${cfg.title} exported as CSV`);
  }

  return (
    <div>
      <PageHeader
        icon={<FundOutlined />}
        color="#1677ff"
        title="Reports"
        subtitle="Generate and export fleet operational reports"
        stats={[
          { label: 'Report Types', value: reportTypes.length, color: '#1677ff' },
          { label: 'Export',       value: 'CSV',              color: '#52c41a' },
          { label: 'Period',       value: 'Apr 2026',         color: '#fa8c16' },
        ]}
        actions={
          <Space wrap>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              size="small"
              style={{ width: 220 }}
            />
            <Select
              placeholder="Select report type"
              options={reportTypes}
              style={{ width: 200 }}
              value={selected}
              onChange={(v) => { setSelected(v); setGenerated(false); }}
            />
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              disabled={!selected}
              onClick={handleGenerate}
            >
              Generate
            </Button>
          </Space>
        }
      />

      {/* Report Cards */}
      {!generated && (
        <Row gutter={[16, 16]}>
          {reportCards.map((r) => (
            <Col key={r.type} xs={24} sm={12} lg={8}>
              <Card
                size="small"
                style={{
                  borderRadius: 12,
                  cursor: 'pointer',
                  border: selected === r.type ? `2px solid ${r.color}` : undefined,
                  background: selected === r.type ? r.color + '08' : undefined,
                  transition: 'all 0.2s',
                }}
                hoverable
                onClick={() => { setSelected(r.type); setGenerated(false); }}
                styles={{ body: { padding: 20 } }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10,
                    background: r.color + '18', border: `1px solid ${r.color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0,
                  }}>
                    {r.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ fontSize: 14 }}>{r.title}</Text>
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>{r.description}</Text>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <Button
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={(e) => { e.stopPropagation(); handleExport(r.type); }}
                      >
                        Export CSV
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Generated Report Preview */}
      {generated && config && (
        <div>
          <Card
            size="small"
            style={{ borderRadius: 12, marginBottom: 16 }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{config.icon}</span>
                <span style={{ color: config.color, fontWeight: 700 }}>{config.title}</span>
                <Tag color="green">Generated</Tag>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>{config.summary()}</Text>
              </div>
            }
            extra={
              <Space>
                <Button size="small" onClick={() => setGenerated(false)}>← Back</Button>
                <Button
                  size="small"
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={() => handleExport(selected)}
                  style={{ background: config.color, borderColor: config.color }}
                >
                  Export CSV
                </Button>
              </Space>
            }
          >
            {/* Chart */}
            {config.chartKey && (
              <>
                <Title level={5} style={{ marginBottom: 12 }}>{config.chartTitle}</Title>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={config.data} margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                    <XAxis dataKey={config.chartLabel} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => (config.chartKey === 'total' || config.chartKey === 'cost' || config.chartKey === 'amount' ? formatCurrency(v) : v)} />
                    <Bar dataKey={config.chartKey} fill={config.color} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <Divider style={{ margin: '16px 0' }} />
              </>
            )}

            {/* Data table */}
            <Table
              dataSource={config.data.map((r, i) => ({ ...r, key: i }))}
              columns={config.columns}
              size="small"
              pagination={false}
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
