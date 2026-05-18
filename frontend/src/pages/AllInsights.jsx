import { PieChartOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  Button, Card, Col, DatePicker, Progress, Row, Select, Statistic, Table, Tabs, Tag, Typography, message,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import PageHeader from '../components/PageHeader';
import { formatCurrency } from '../utils/helpers';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

/* ── Static data ─────────────────────────────────────────────── */
const kpiData = [
  { label: 'Fleet Utilisation',      value: 72,   suffix: '%',     description: '34 of 48 vehicles active today', color: '#1677ff' },
  { label: 'On-time Delivery',        value: 88,   suffix: '%',     description: 'Last 30 days',                   color: '#52c41a' },
  { label: 'Avg Fuel Efficiency',     value: 11.4, suffix: ' km/L', description: 'Across all vehicles',            color: '#fa8c16' },
  { label: 'Maintenance Compliance',  value: 94,   suffix: '%',     description: 'Vehicles serviced on schedule',  color: '#722ed1' },
];

const costBreakdown = [
  { category: 'Driver Pay',  amount: 210000, pct: 32, color: '#52c41a' },
  { category: 'Fuel',        amount: 182400, pct: 28, color: '#ff4d4f' },
  { category: 'Maintenance', amount: 136000, pct: 21, color: '#fa8c16' },
  { category: 'Insurance',   amount: 95000,  pct: 15, color: '#1677ff' },
  { category: 'Other',       amount: 30600,  pct: 4,  color: '#722ed1' },
];

const topVehicles = [
  { vehicle: 'DHK-1234', trips: 24, km: 3820, fuelEff: 11.2 },
  { vehicle: 'DHK-7741', trips: 22, km: 3600, fuelEff: 13.5 },
  { vehicle: 'DHK-5678', trips: 20, km: 3210, fuelEff: 12.1 },
  { vehicle: 'CTG-0091', trips: 18, km: 2900, fuelEff: 10.8 },
  { vehicle: 'SYL-3322', trips: 15, km: 2400, fuelEff: 9.9  },
];

const rankColors = ['#faad14', '#8c8c8c', '#fa541c', '#1677ff', '#722ed1'];

const monthlyFuel = [
  { month: 'Nov', cost: 148000 }, { month: 'Dec', cost: 162000 },
  { month: 'Jan', cost: 155000 }, { month: 'Feb', cost: 138000 },
  { month: 'Mar', cost: 170000 }, { month: 'Apr', cost: 182400 },
];

const dispatchTrend = [
  { month: 'Nov', completed: 88, pending: 12 }, { month: 'Dec', completed: 95, pending: 8 },
  { month: 'Jan', completed: 102, pending: 10 }, { month: 'Feb', completed: 91, pending: 14 },
  { month: 'Mar', completed: 110, pending: 9  }, { month: 'Apr', completed: 118, pending: 7 },
];

const driverLeaderboard = [
  { driver: 'Farid Ahmed',   rating: 4.9, trips: 22, onTimePct: 95, incidents: 0 },
  { driver: 'Rahim Uddin',   rating: 4.8, trips: 24, onTimePct: 92, incidents: 0 },
  { driver: 'Nasir Hossain', rating: 4.7, trips: 18, onTimePct: 94, incidents: 0 },
  { driver: 'Karim Ali',     rating: 4.5, trips: 20, onTimePct: 90, incidents: 1 },
  { driver: 'Jalal Mia',     rating: 4.1, trips: 15, onTimePct: 80, incidents: 2 },
];

const maintenanceDue = [
  { vehicle: 'CTG-0091', type: 'Oil Change',    dueDate: '2026-04-20', urgency: 'high' },
  { vehicle: 'SYL-3322', type: 'Tyre Check',    dueDate: '2026-04-25', urgency: 'medium' },
  { vehicle: 'DHK-5678', type: 'Brake Service', dueDate: '2026-05-01', urgency: 'low' },
];

export default function AllInsights() {
  const [activeTab, setTab]      = useState('overview');
  const [dateRange, setDateRange] = useState([dayjs().subtract(5, 'month'), dayjs()]);
  const [refreshing, setRefreshing] = useState(false);

  const totalCost = costBreakdown.reduce((s, c) => s + c.amount, 0);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => { setRefreshing(false); message.success('Insights refreshed'); }, 700);
  }

  const driverColumns = [
    { title: 'Driver',     dataIndex: 'driver' },
    { title: 'Rating',     dataIndex: 'rating',    render: (v) => <span style={{ color: '#faad14', fontWeight: 700 }}>★ {v}</span> },
    { title: 'Trips',      dataIndex: 'trips' },
    { title: 'On-Time',    dataIndex: 'onTimePct', render: (v) => `${v}%` },
    { title: 'Incidents',  dataIndex: 'incidents', render: (v) => <Tag color={v === 0 ? 'green' : 'red'}>{v}</Tag> },
  ];

  const maintColumns = [
    { title: 'Vehicle', dataIndex: 'vehicle' },
    { title: 'Service', dataIndex: 'type' },
    { title: 'Due Date', dataIndex: 'dueDate' },
    { title: 'Urgency', dataIndex: 'urgency', render: (v) => <Tag color={v === 'high' ? 'red' : v === 'medium' ? 'orange' : 'blue'}>{v.toUpperCase()}</Tag> },
  ];

  return (
    <div>
      <PageHeader
        icon={<PieChartOutlined />}
        color="#eb2f96"
        title="Insights"
        subtitle="Fleet performance analytics and key operational metrics"
        stats={[
          { label: 'Fleet Util.',  value: '72%',                    color: '#1677ff' },
          { label: 'On-time',      value: '88%',                    color: '#52c41a' },
          { label: 'Monthly Cost', value: formatCurrency(totalCost), color: '#eb2f96' },
        ]}
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <RangePicker value={dateRange} onChange={setDateRange} size="small" picker="month" style={{ width: 200 }} />
            <Button icon={<ReloadOutlined spin={refreshing} />} onClick={handleRefresh} loading={refreshing}>Refresh</Button>
          </div>
        }
      />

      <Tabs
        activeKey={activeTab}
        onChange={setTab}
        style={{ marginBottom: 16 }}
        items={[
          { key: 'overview',  label: 'Overview'    },
          { key: 'fleet',     label: 'Fleet'       },
          { key: 'finance',   label: 'Finance'     },
          { key: 'people',    label: 'People'      },
        ]}
      />

      {/* ── OVERVIEW ────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            {kpiData.map((k) => (
              <Col key={k.label} xs={24} sm={12} lg={6}>
                <Card size="small" style={{ borderRadius: 12, borderLeft: `4px solid ${k.color}`, background: k.color + '08' }}>
                  <Statistic
                    title={<Text type="secondary" style={{ fontSize: 12 }}>{k.label}</Text>}
                    value={k.value}
                    suffix={k.suffix}
                    valueStyle={{ fontSize: 28, fontWeight: 700, color: k.color }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>{k.description}</Text>
                </Card>
              </Col>
            ))}
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="Monthly Dispatch Trend" size="small" style={{ borderRadius: 12 }}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dispatchTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" fill="#52c41a" radius={[4,4,0,0]} name="Completed" />
                    <Bar dataKey="pending"   fill="#fa8c16" radius={[4,4,0,0]} name="Pending" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Cost Breakdown — Apr 2026" size="small" style={{ borderRadius: 12 }}>
                {costBreakdown.map((c) => (
                  <div key={c.category} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontWeight: 500 }}>{c.category}</Text>
                      <Text type="secondary">{formatCurrency(c.amount)}</Text>
                    </div>
                    <Progress percent={c.pct} size="small" showInfo={false} strokeColor={c.color} />
                  </div>
                ))}
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* ── FLEET ───────────────────────────────────────── */}
      {activeTab === 'fleet' && (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card title="Top Vehicles by Usage" size="small" style={{ borderRadius: 12 }}>
              {topVehicles.map((v, i) => (
                <div
                  key={v.vehicle}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 0',
                    borderBottom: i < topVehicles.length - 1 ? '1px solid rgba(128,128,128,0.1)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: rankColors[i],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    <div>
                      <Text strong>{v.vehicle}</Text>
                      <div><Text type="secondary" style={{ fontSize: 11 }}>{v.fuelEff} km/L avg efficiency</Text></div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div><Text>{v.trips} trips</Text></div>
                    <div><Text type="secondary" style={{ fontSize: 12 }}>{v.km.toLocaleString()} km</Text></div>
                  </div>
                </div>
              ))}
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card title="Fleet Status Distribution" size="small" style={{ borderRadius: 12 }}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Active',      value: 34, color: '#52c41a' },
                      { name: 'Idle',        value: 8,  color: '#fa8c16' },
                      { name: 'Maintenance', value: 4,  color: '#ff4d4f' },
                      { name: 'Inactive',    value: 2,  color: '#8c8c8c' },
                    ]}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {[{ color: '#52c41a' }, { color: '#fa8c16' }, { color: '#ff4d4f' }, { color: '#8c8c8c' }].map((c, i) => (
                      <Cell key={i} fill={c.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24}>
            <Card title="Upcoming Maintenance" size="small" style={{ borderRadius: 12 }}>
              <Table
                dataSource={maintenanceDue.map((r, i) => ({ ...r, key: i }))}
                columns={maintColumns}
                size="small"
                pagination={false}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* ── FINANCE ─────────────────────────────────────── */}
      {activeTab === 'finance' && (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card title="Monthly Fuel Cost Trend" size="small" style={{ borderRadius: 12 }}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyFuel}>
                  <defs>
                    <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ff4d4f" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ff4d4f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="cost" stroke="#ff4d4f" fill="url(#fuelGrad)" strokeWidth={2} name="Fuel Cost" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Expense Split" size="small" style={{ borderRadius: 12 }}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={costBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="amount" nameKey="category" paddingAngle={2}>
                    {costBreakdown.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24}>
            <Row gutter={[16, 16]}>
              {[
                { label: 'Total Monthly Spend', value: formatCurrency(totalCost), color: '#eb2f96', sub: 'Apr 2026' },
                { label: 'Fuel Budget Used',    value: '91%',                     color: '#ff4d4f', sub: 'vs ৳200,000 budget' },
                { label: 'Cost per km',         value: '৳47.8',                   color: '#fa8c16', sub: 'Fleet average' },
                { label: 'Savings vs Last Month', value: formatCurrency(8200),    color: '#52c41a', sub: '4.3% reduction' },
              ].map((s) => (
                <Col key={s.label} xs={24} sm={12} lg={6}>
                  <Card size="small" style={{ borderRadius: 12, borderLeft: `4px solid ${s.color}`, background: s.color + '08' }}>
                    <Statistic
                      title={<Text type="secondary" style={{ fontSize: 12 }}>{s.label}</Text>}
                      value={s.value}
                      valueStyle={{ fontSize: 22, fontWeight: 700, color: s.color }}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>{s.sub}</Text>
                  </Card>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>
      )}

      {/* ── PEOPLE ──────────────────────────────────────── */}
      {activeTab === 'people' && (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card title="Driver Leaderboard" size="small" style={{ borderRadius: 12 }}>
              <Table
                dataSource={driverLeaderboard.map((r, i) => ({ ...r, key: i }))}
                columns={driverColumns}
                size="small"
                pagination={false}
              />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Staff Summary" size="small" style={{ borderRadius: 12 }}>
              {[
                { label: 'Total Drivers',       value: 5,   color: '#13c2c2' },
                { label: 'On Leave',            value: 1,   color: '#fa8c16' },
                { label: 'Coordinators',        value: 6,   color: '#52c41a' },
                { label: 'Pending Leave Requests', value: 2, color: '#eb2f96' },
                { label: 'Avg Driver Rating',   value: '4.6 ★', color: '#faad14' },
              ].map((s) => (
                <div key={s.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: '1px solid rgba(128,128,128,0.08)',
                }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>{s.label}</Text>
                  <Text strong style={{ color: s.color, fontSize: 15 }}>{s.value}</Text>
                </div>
              ))}
            </Card>
          </Col>
          <Col xs={24}>
            <Card title="Driver Performance Comparison" size="small" style={{ borderRadius: 12 }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={driverLeaderboard}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                  <XAxis dataKey="driver" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="trips"      fill="#1677ff" radius={[4,4,0,0]} name="Trips" />
                  <Bar dataKey="onTimePct"  fill="#52c41a" radius={[4,4,0,0]} name="On-Time %" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}
