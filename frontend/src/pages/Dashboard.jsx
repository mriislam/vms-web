import {
  AlertOutlined,
  ArrowDownOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  CarOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  ExperimentOutlined,
  IdcardOutlined,
  NotificationOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Col, Progress, Row, Spin, Table, Tag, Timeline, Tooltip, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { noticeService } from '../services/noticeService';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { dashboardService } from '../services/dashboardService';
import { formatCurrency } from '../utils/helpers';

const { Title, Text } = Typography;

// ── alert icon map ─────────────────────────────────────────────────────────────
const ALERT_ICONS = {
  maintenance: <ToolOutlined />,
  accident:    <AlertOutlined />,
  inventory:   <ExperimentOutlined />,
  dispatch:    <ThunderboltOutlined />,
  ok:          <CheckCircleOutlined />,
};

// ── stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, trend }) {
  return (
    <Card
      hoverable
      style={{
        borderRadius: 16,
        border: `1.5px solid ${color}`,
        overflow: 'hidden',
        cursor: 'default',
        background: `${color}12`,
        boxShadow: `0 2px 12px ${color}22`,
        transition: 'transform 0.2s, box-shadow 0.2s',
        height: '100%',
      }}
      styles={{ body: { padding: '20px 22px', height: '100%', boxSizing: 'border-box' } }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${color}44`; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)';   e.currentTarget.style.boxShadow = `0 2px 12px ${color}22`; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Text style={{ fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color, fontWeight: 600 }}>
            {label}
          </Text>
          <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.2, marginTop: 6, color }}>
            {value}
          </div>
          <div style={{ marginTop: 8, height: 18, display: 'flex', alignItems: 'center', gap: 5 }}>
            {trend === 'up'   && <ArrowUpOutlined   style={{ fontSize: 11, color: '#52c41a' }} />}
            {trend === 'down' && <ArrowDownOutlined style={{ fontSize: 11, color: '#ff4d4f' }} />}
            <Text style={{ fontSize: 12, color: `${color}cc` }}>{sub}</Text>
          </div>
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: `${color}20`,
          border: `1px solid ${color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, color,
        }}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

// ── custom tooltip ────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(13,17,28,0.95)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
    }}>
      <div style={{ color: '#8c9ab0', marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, marginTop: 2 }}>
          {p.name}: <strong style={{ color: '#fff' }}>{typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}</strong>
        </div>
      ))}
    </div>
  );
};

// ── status styles ─────────────────────────────────────────────────────────────
const statusStyle = {
  in_progress: { color: '#1677ff', bg: 'rgba(22,119,255,0.12)', label: 'In Progress' },
  completed:   { color: '#52c41a', bg: 'rgba(82,196,26,0.12)',  label: 'Completed' },
  pending:     { color: '#fa8c16', bg: 'rgba(250,140,22,0.12)', label: 'Pending' },
  approved:    { color: '#9254de', bg: 'rgba(146,84,222,0.12)', label: 'Approved' },
};

const dispatchCols = [
  { title: 'Vehicle',     dataIndex: 'vehicle',     key: 'vehicle',     render: (v) => <Text strong style={{ color: '#4096ff' }}>{v}</Text> },
  { title: 'Driver',      dataIndex: 'driver',      key: 'driver' },
  { title: 'Destination', dataIndex: 'destination', key: 'destination' },
  {
    title: 'Status', dataIndex: 'status', key: 'status',
    render: (s) => {
      const st = statusStyle[s] ?? { color: '#8c8c8c', bg: 'rgba(0,0,0,0.1)', label: s };
      return (
        <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
          {st.label}
        </span>
      );
    },
  },
];

// ── main ──────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const today = new Date().toLocaleDateString('en-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: raw, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.getStats().then((r) => r.data.data),
    refetchInterval: 30000,
  });
  const s = raw ?? {};

  const { data: notices = [], isLoading: noticesLoading } = useQuery({
    queryKey: ['notices'],
    queryFn: () => noticeService.getAll().then((r) => r.data.data ?? []),
    refetchInterval: 60000,
  });

  const readMut = useMutation({
    mutationFn: (id) => noticeService.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notices'] }),
  });

  const unreadCount    = notices.filter((n) => !n.readByMe).length;
  const recentNotices  = notices.slice(0, 5);
  const fleetStatus    = s.fleetStatus    ?? [];
  const monthlyCosts   = s.monthlyCosts   ?? [];
  const weeklyData     = s.weeklyDispatches ?? [];
  const recentDispatch = s.recentDispatches ?? [];
  const alerts         = s.alerts         ?? [];
  const totalFleet     = fleetStatus.reduce((a, f) => a + (f.value ?? 0), 0);

  return (
    <div style={{ padding: '0 0 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 800 }}>Fleet Dashboard</Title>
          <Text style={{ color: '#8c9ab0', fontSize: 13 }}>{today}</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge status="processing" />
          <Text style={{ color: '#52c41a', fontSize: 13, fontWeight: 600 }}>Live</Text>
        </div>
      </div>

      {/* Stat cards */}
      <Spin spinning={statsLoading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          {[
            { icon: <CarOutlined />,         label: 'Total Vehicles',      value: s.totalVehicles ?? '—',       sub: `${s.activeVehicles ?? 0} active`,           trend: 'up',   color: '#1677ff' },
            { icon: <IdcardOutlined />,       label: 'Active Drivers',      value: s.activeDrivers ?? '—',       sub: `${s.totalDrivers ?? 0} total`,              trend: null,   color: '#52c41a' },
            { icon: <ThunderboltOutlined />,  label: 'Requisitions Pending',value: s.dispatchPending ?? '—',     sub: `${s.dispatchInProgress ?? 0} in progress`,  trend: null,   color: '#9254de' },
            { icon: <ToolOutlined />,         label: 'Maintenance Pending', value: s.maintenancePending ?? '—',  sub: 'jobs awaiting workshop',                    trend: 'down', color: '#ff4d4f' },
            { icon: <AlertOutlined />,        label: 'Open Accidents',      value: s.openAccidents ?? '—',       sub: 'cases require attention',                   trend: 'down', color: '#fa8c16' },
            { icon: <ExperimentOutlined />,   label: 'Low Stock Items',     value: s.lowStockItems ?? '—',       sub: 'inventory alerts',                          trend: 'down', color: '#13c2c2' },
          ].map((st) => (
            <Col key={st.label} xs={24} sm={12} xl={4} style={{ display: 'flex' }}>
              <StatCard {...st} />
            </Col>
          ))}
        </Row>
      </Spin>

      {/* Charts row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Monthly cost bar chart */}
        <Col xs={24} lg={14} style={{ display: 'flex', flexDirection: 'column' }}>
          <Card style={{ borderRadius: 16, flex: 1 }} styles={{ body: { padding: '20px 16px 10px' } }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingLeft: 8 }}>
              <div>
                <Title level={5} style={{ margin: 0 }}>Monthly Cost Breakdown</Title>
                <Text type="secondary" style={{ fontSize: 12 }}>Last 6 months (BDT) — live from DB</Text>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                {[{ c: '#4096ff', l: 'Fuel' }, { c: '#fa8c16', l: 'Maintenance' }, { c: '#9254de', l: 'Expenses' }].map((i) => (
                  <span key={i.l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: i.c, display: 'inline-block' }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>{i.l}</Text>
                  </span>
                ))}
              </div>
            </div>
            <Spin spinning={statsLoading}>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={monthlyCosts} barSize={14} barGap={3}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#8c9ab0', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8c9ab0', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="fuel"        fill="#4096ff" radius={[4,4,0,0]} name="Fuel" />
                  <Bar dataKey="maintenance" fill="#fa8c16" radius={[4,4,0,0]} name="Maintenance" />
                  <Bar dataKey="other"       fill="#9254de" radius={[4,4,0,0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </Spin>
          </Card>
        </Col>

        {/* Fleet status donut + weekly dispatches */}
        <Col xs={24} lg={10} style={{ display: 'flex', flexDirection: 'column' }}>
          <Row gutter={[0, 16]} style={{ flex: 1 }}>
            {/* Donut */}
            <Col span={24}>
              <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 20 } }}>
                <Title level={5} style={{ margin: '0 0 12px' }}>Fleet Status</Title>
                <Spin spinning={statsLoading}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <ResponsiveContainer width={120} height={120}>
                      <PieChart>
                        <Pie data={fleetStatus} cx="50%" cy="50%" innerRadius={36} outerRadius={56} paddingAngle={3} dataKey="value">
                          {fleetStatus.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                        </Pie>
                        <RechartsTooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ flex: 1 }}>
                      {fleetStatus.map((f) => (
                        <div key={f.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: f.color }} />
                            <Text style={{ fontSize: 13 }}>{f.name}</Text>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Progress
                              percent={totalFleet > 0 ? Math.round((f.value / totalFleet) * 100) : 0}
                              showInfo={false} strokeColor={f.color}
                              trailColor="rgba(255,255,255,0.06)"
                              style={{ width: 60, margin: 0 }} size="small"
                            />
                            <Text strong style={{ fontSize: 13, minWidth: 20 }}>{f.value}</Text>
                          </div>
                        </div>
                      ))}
                      {fleetStatus.length === 0 && (
                        <Text type="secondary" style={{ fontSize: 12 }}>No vehicle data</Text>
                      )}
                    </div>
                  </div>
                </Spin>
              </Card>
            </Col>

            {/* Weekly dispatch area chart */}
            <Col span={24}>
              <Card style={{ borderRadius: 16 }} styles={{ body: { padding: '16px 20px 10px' } }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Title level={5} style={{ margin: 0 }}>Weekly Requisitions</Title>
                  <Text style={{ color: '#52c41a', fontWeight: 700, fontSize: 22 }}>{s.weeklyTotal ?? 0}</Text>
                </div>
                <Spin spinning={statsLoading}>
                  <ResponsiveContainer width="100%" height={70}>
                    <AreaChart data={weeklyData}>
                      <defs>
                        <linearGradient id="dGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#1677ff" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#1677ff" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" tick={{ fill: '#8c9ab0', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="dispatches" stroke="#1677ff" strokeWidth={2} fill="url(#dGrad)" name="Requisitions" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Spin>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* Recent dispatches + Alerts */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={15} style={{ display: 'flex', flexDirection: 'column' }}>
          <Card
            style={{ borderRadius: 16, flex: 1 }}
            styles={{ body: { padding: 0 } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Recent Requisitions</span>
                <Button type="link" size="small" icon={<ArrowRightOutlined />} style={{ fontSize: 12 }}
                  onClick={() => navigate('/vehicle-requisition')}>View All</Button>
              </div>
            }
          >
            <Spin spinning={statsLoading}>
              <Table
                dataSource={recentDispatch}
                columns={dispatchCols}
                pagination={false}
                size="small"
                locale={{ emptyText: 'No requisitions yet' }}
                style={{ borderRadius: '0 0 16px 16px', overflow: 'hidden' }}
              />
            </Spin>
          </Card>
        </Col>

        <Col xs={24} lg={9} style={{ display: 'flex', flexDirection: 'column' }}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertOutlined style={{ color: '#fa8c16' }} />
                <span>Alerts & Activity</span>
              </div>
            }
            style={{ borderRadius: 16, flex: 1 }}
            styles={{ body: { padding: '8px 20px 16px' } }}
          >
            <Spin spinning={statsLoading}>
              <Timeline
                items={alerts.map((a) => ({
                  color: a.color,
                  dot: <span style={{ fontSize: 13, color: a.color }}>{ALERT_ICONS[a.type] ?? <AlertOutlined />}</span>,
                  children: (
                    <div style={{ paddingBottom: 4 }}>
                      <Text style={{ fontSize: 13 }}>{a.text}</Text>
                    </div>
                  ),
                }))}
              />
            </Spin>
          </Card>
        </Col>
      </Row>

      {/* Notices */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card
            style={{ borderRadius: 16 }}
            styles={{ body: { padding: '0 0 4px' } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <NotificationOutlined style={{ color: '#faad14' }} />
                  <span>Notices</span>
                  {unreadCount > 0 && <Badge count={unreadCount} style={{ background: '#faad14' }} />}
                </div>
                <Button type="link" size="small" icon={<ArrowRightOutlined />}
                  style={{ fontSize: 12 }} onClick={() => navigate('/notices')}>
                  View All
                </Button>
              </div>
            }
          >
            <Spin spinning={noticesLoading}>
              {recentNotices.length === 0 && !noticesLoading && (
                <div style={{ textAlign: 'center', padding: '24px 0', opacity: 0.45, fontSize: 13 }}>
                  No notices posted yet
                </div>
              )}
              {recentNotices.map((n, idx) => {
                const borderColor = n.priority === 'high' ? '#ff4d4f' : n.priority === 'medium' ? '#fa8c16' : '#1677ff';
                const tagColor    = n.priority === 'high' ? 'red'     : n.priority === 'medium' ? 'orange'  : 'blue';
                return (
                  <div
                    key={n.id}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 14,
                      padding: '14px 20px',
                      borderBottom: idx < recentNotices.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                      opacity: n.readByMe ? 0.75 : 1,
                    }}
                  >
                    <div style={{ width: 4, minHeight: 44, borderRadius: 4, background: borderColor, flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                        {!n.readByMe && (
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1677ff', display: 'inline-block', flexShrink: 0 }} />
                        )}
                        <Text strong style={{ fontSize: 13 }}>{n.title}</Text>
                        <Tag color={tagColor} style={{ fontSize: 11 }}>{n.priority?.toUpperCase()}</Tag>
                        <Tag color="default" style={{ fontSize: 11 }}>{n.category}</Tag>
                        {n.readByMe && <Tag color="success" style={{ fontSize: 11 }}>Read</Tag>}
                      </div>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                        {n.body?.length > 120 ? n.body.slice(0, 120) + '…' : n.body}
                      </Text>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>By <b>{n.postedBy}</b></Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>{n.date}</Text>
                        <Tooltip title="Users who read this">
                          <Text type="secondary" style={{ fontSize: 11, cursor: 'default' }}>
                            <TeamOutlined style={{ marginRight: 3 }} />{n.readCount ?? 0} read
                          </Text>
                        </Tooltip>
                      </div>
                    </div>
                    {!n.readByMe && (
                      <Tooltip title="Mark as read">
                        <Button
                          size="small" type="text" icon={<CheckOutlined />}
                          style={{ color: '#52c41a', flexShrink: 0 }}
                          loading={readMut.isPending && readMut.variables === n.id}
                          onClick={() => readMut.mutate(n.id)}
                        />
                      </Tooltip>
                    )}
                  </div>
                );
              })}
            </Spin>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
