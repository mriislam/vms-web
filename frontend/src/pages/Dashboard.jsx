import {
  AlertOutlined,
  ArrowRightOutlined,
  CarOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  ExperimentOutlined,
  IdcardOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Col, Progress, Row, Spin, Table, Tag, Timeline, Tooltip, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { noticeService } from '../services/noticeService';
import {
  Area, AreaChart,
  Bar, BarChart,
  CartesianGrid, Cell,
  Pie, PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis, YAxis,
} from 'recharts';
import { dashboardService } from '../services/dashboardService';
import { formatCurrency } from '../utils/helpers';
import { useUIStore } from '../stores/uiStore';

const { Title, Text } = Typography;

// ── Alert icon map ────────────────────────────────────────────────────────────
const ALERT_ICONS = {
  maintenance: <ToolOutlined />,
  accident:    <AlertOutlined />,
  inventory:   <ExperimentOutlined />,
  dispatch:    <ThunderboltOutlined />,
  ok:          <CheckCircleOutlined />,
};

const ALERT_ROUTES = {
  maintenance: '/maintenance',
  accident:    '/accidents',
  inventory:   '/inventory',
  dispatch:    '/booking/single',
  ok:          '/dashboard',
};

// ── Stat card configs ─────────────────────────────────────────────────────────
const STAT_CONFIGS = [
  {
    icon: <CarOutlined />, label: 'Total Vehicles', key: 'totalVehicles',
    subKey: 'activeVehicles', subSuffix: 'active', trend: 'up',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    glow: 'rgba(99,102,241,0.45)', to: '/vehicles',
  },
  {
    icon: <IdcardOutlined />, label: 'Active Drivers', key: 'activeDrivers',
    subKey: 'totalDrivers', subSuffix: 'total', trend: null,
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    glow: 'rgba(16,185,129,0.45)', to: '/drivers',
  },
  {
    icon: <ThunderboltOutlined />, label: 'Req. Pending', key: 'dispatchPending',
    subKey: 'dispatchInProgress', subSuffix: 'in progress', trend: null,
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    glow: 'rgba(139,92,246,0.45)', to: '/booking/single',
  },
  {
    icon: <ToolOutlined />, label: 'Maintenance', key: 'maintenancePending',
    subSuffix: 'jobs pending', trend: 'down',
    gradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
    glow: 'rgba(244,63,94,0.45)', to: '/maintenance',
  },
  {
    icon: <AlertOutlined />, label: 'Open Accidents', key: 'openAccidents',
    subSuffix: 'cases open', trend: 'down',
    gradient: 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
    glow: 'rgba(249,115,22,0.45)', to: '/accidents',
  },
  {
    icon: <ExperimentOutlined />, label: 'Low Stock', key: 'lowStockItems',
    subSuffix: 'alerts', trend: 'down',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    glow: 'rgba(6,182,212,0.45)', to: '/inventory',
  },
];

// ── Gradient stat card ────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, gradient, glow, trend, onClick }) {
  return (
    <Card
      hoverable onClick={onClick}
      style={{
        background: gradient, border: 'none',
        borderRadius: 20, overflow: 'hidden',
        cursor: 'pointer', height: '100%',
        boxShadow: `0 8px 32px ${glow}`,
        transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        position: 'relative',
      }}
      styles={{ body: { padding: '20px 20px', height: '100%', boxSizing: 'border-box' } }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
        e.currentTarget.style.boxShadow = `0 20px 48px ${glow}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = `0 8px 32px ${glow}`;
      }}
    >
      {/* Shine orb */}
      <div className="stat-card-shine" style={{
        position: 'absolute', top: -50, right: -50,
        width: 160, height: 160, borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -30, left: '20%',
        width: 100, height: 100, borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', fontWeight: 700, marginBottom: 10 }}>
            {label}
          </div>
          <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1, color: '#fff', letterSpacing: '-0.03em' }}>
            {value}
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            {trend === 'up'   && <span style={{ fontSize: 9, color: '#fff', background: 'rgba(255,255,255,0.25)', padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>↑</span>}
            {trend === 'down' && <span style={{ fontSize: 9, color: '#fff', background: 'rgba(255,255,255,0.2)',  padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>↓</span>}
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{sub}</span>
          </div>
        </div>
        <div style={{
          width: 48, height: 48, borderRadius: 14, flexShrink: 0,
          background: 'rgba(255,255,255,0.18)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, color: '#fff',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
        }}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

// ── Custom recharts tooltip ────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(7,12,20,0.96)', border: '1px solid rgba(99,102,241,0.2)',
      borderRadius: 10, padding: '10px 14px', fontSize: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    }}>
      <div style={{ color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, marginTop: 3, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span>{p.name}</span>
          <strong style={{ color: '#fff' }}>
            {typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}
          </strong>
        </div>
      ))}
    </div>
  );
};

// ── Chart legend (clickable) ──────────────────────────────────────────────────
function ChartLegend({ hiddenBars, onToggle }) {
  const items = [
    { key: 'fuel',        color: '#6366f1', label: 'Fuel' },
    { key: 'maintenance', color: '#f43f5e', label: 'Maintenance' },
    { key: 'other',       color: '#06b6d4', label: 'Expenses' },
  ];
  return (
    <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
      {items.map((i) => (
        <Tooltip key={i.key} title={hiddenBars.has(i.key) ? 'Click to show' : 'Click to hide'}>
          <span
            onClick={() => onToggle(i.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              opacity: hiddenBars.has(i.key) ? 0.3 : 1, transition: 'opacity 0.2s',
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 3, background: i.color, display: 'inline-block', boxShadow: `0 0 6px ${i.color}` }} />
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>{i.label}</Text>
          </span>
        </Tooltip>
      ))}
    </div>
  );
}

// ── Status pill ───────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  in_progress: { color: '#6366f1', bg: 'rgba(99,102,241,0.14)',  label: 'In Progress' },
  completed:   { color: '#10b981', bg: 'rgba(16,185,129,0.14)',  label: 'Completed'   },
  pending:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.14)',  label: 'Pending'     },
  approved:    { color: '#8b5cf6', bg: 'rgba(139,92,246,0.14)', label: 'Approved'    },
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isDark = useUIStore((s) => s.isDark);
  const [hiddenBars, setHiddenBars] = useState(new Set());

  function toggleBar(key) {
    setHiddenBars((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

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

  const cardStyle = {
    borderRadius: 16,
    border: isDark ? '1px solid rgba(99,102,241,0.1)' : '1px solid rgba(99,102,241,0.08)',
    background: isDark ? '#0d1628' : '#ffffff',
  };

  const dispatchCols = [
    {
      title: 'Vehicle', dataIndex: 'vehicle', key: 'vehicle',
      render: (v) => (
        <span style={{ fontWeight: 700, color: '#6366f1', fontSize: 13 }}>{v}</span>
      ),
    },
    { title: 'Driver',      dataIndex: 'driver',      key: 'driver' },
    { title: 'Destination', dataIndex: 'destination', key: 'destination' },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (st) => {
        const s = STATUS_STYLES[st] ?? { color: '#64748b', bg: 'rgba(100,116,139,0.1)', label: st };
        return (
          <span style={{
            background: s.bg, color: s.color, padding: '4px 12px',
            borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: '0.03em',
          }}>
            {s.label}
          </span>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '0 0 32px' }}>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <Spin spinning={statsLoading}>
        <Row gutter={[14, 14]} style={{ marginBottom: 18 }}>
          {STAT_CONFIGS.map((cfg) => {
            const value = s[cfg.key] ?? '—';
            const sub = cfg.subKey
              ? `${s[cfg.subKey] ?? 0} ${cfg.subSuffix}`
              : cfg.subSuffix;
            return (
              <Col key={cfg.key} xs={12} sm={8} xl={4} style={{ display: 'flex' }}>
                <StatCard
                  icon={cfg.icon} label={cfg.label} value={value} sub={sub}
                  gradient={cfg.gradient} glow={cfg.glow} trend={cfg.trend}
                  onClick={() => navigate(cfg.to)}
                />
              </Col>
            );
          })}
        </Row>
      </Spin>

      {/* ── Charts Row ──────────────────────────────────────────────────── */}
      <Row gutter={[14, 14]} style={{ marginBottom: 18 }}>
        {/* Monthly cost bar chart */}
        <Col xs={24} lg={14} style={{ display: 'flex', flexDirection: 'column' }}>
          <Card style={{ ...cardStyle, flex: 1 }} styles={{ body: { padding: '20px 16px 12px' } }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingLeft: 8 }}>
              <div>
                <Title level={5} style={{ margin: 0, fontWeight: 800 }}>Monthly Cost Breakdown</Title>
                <Text type="secondary" style={{ fontSize: 12 }}>Last 6 months (BDT) — click legend to filter</Text>
              </div>
              <ChartLegend hiddenBars={hiddenBars} onToggle={toggleBar} />
            </div>
            <Spin spinning={statsLoading}>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={monthlyCosts} barSize={13} barGap={4}>
                  <defs>
                    <linearGradient id="barFuel"        x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#4f46e5"/></linearGradient>
                    <linearGradient id="barMaintenance" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e"/><stop offset="100%" stopColor="#e11d48"/></linearGradient>
                    <linearGradient id="barOther"       x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#06b6d4"/><stop offset="100%" stopColor="#0891b2"/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.06)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,0.04)' }} />
                  <Bar dataKey="fuel"        fill="url(#barFuel)"        radius={[5,5,0,0]} name="Fuel"        hide={hiddenBars.has('fuel')}        cursor="pointer" onClick={() => navigate('/fuel')} />
                  <Bar dataKey="maintenance" fill="url(#barMaintenance)" radius={[5,5,0,0]} name="Maintenance" hide={hiddenBars.has('maintenance')} cursor="pointer" onClick={() => navigate('/maintenance')} />
                  <Bar dataKey="other"       fill="url(#barOther)"       radius={[5,5,0,0]} name="Expenses"    hide={hiddenBars.has('other')}       cursor="pointer" onClick={() => navigate('/expenses')} />
                </BarChart>
              </ResponsiveContainer>
            </Spin>
          </Card>
        </Col>

        {/* Right column: donut + weekly area */}
        <Col xs={24} lg={10} style={{ display: 'flex', flexDirection: 'column' }}>
          <Row gutter={[0, 14]} style={{ flex: 1 }}>
            {/* Fleet status donut */}
            <Col span={24}>
              <Card style={cardStyle} styles={{ body: { padding: 20 } }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <Title level={5} style={{ margin: 0, fontWeight: 800 }}>Fleet Status</Title>
                  <Text type="secondary" style={{ fontSize: 11 }}>Click a slice</Text>
                </div>
                <Spin spinning={statsLoading}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <ResponsiveContainer width={120} height={120}>
                      <PieChart>
                        <Pie
                          data={fleetStatus} cx="50%" cy="50%"
                          innerRadius={36} outerRadius={54}
                          paddingAngle={3} dataKey="value"
                          cursor="pointer" onClick={() => navigate('/vehicles')}
                          strokeWidth={0}
                        >
                          {fleetStatus.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ flex: 1 }}>
                      {fleetStatus.map((f) => (
                        <div
                          key={f.name}
                          onClick={() => navigate('/vehicles')}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            marginBottom: 8, cursor: 'pointer', borderRadius: 8,
                            padding: '3px 6px', transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = `${f.color}10`; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 9, height: 9, borderRadius: 3, background: f.color, boxShadow: `0 0 6px ${f.color}` }} />
                            <Text style={{ fontSize: 13, fontWeight: 500 }}>{f.name}</Text>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Progress
                              percent={totalFleet > 0 ? Math.round((f.value / totalFleet) * 100) : 0}
                              showInfo={false} strokeColor={f.color}
                              trailColor="rgba(99,102,241,0.06)"
                              style={{ width: 55, margin: 0 }} size="small"
                            />
                            <Text strong style={{ fontSize: 13, minWidth: 22, textAlign: 'right' }}>{f.value}</Text>
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

            {/* Weekly requisitions area chart */}
            <Col span={24}>
              <Card
                style={{ ...cardStyle, cursor: 'pointer' }}
                styles={{ body: { padding: '16px 20px 12px' } }}
                onClick={() => navigate('/booking/single')}
                hoverable
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <Title level={5} style={{ margin: 0, fontWeight: 800 }}>Weekly Requisitions</Title>
                    <Text type="secondary" style={{ fontSize: 11 }}>Click to view all</Text>
                  </div>
                  <div style={{
                    fontSize: 26, fontWeight: 900, lineHeight: 1,
                    background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  }}>
                    {s.weeklyTotal ?? 0}
                  </div>
                </div>
                <Spin spinning={statsLoading}>
                  <ResponsiveContainer width="100%" height={72}>
                    <AreaChart data={weeklyData}>
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="dispatches" stroke="#6366f1" strokeWidth={2.5}
                        fill="url(#areaGrad)" name="Requisitions"
                        activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2, cursor: 'pointer' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Spin>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* ── Recent Dispatches + Alerts ───────────────────────────────────── */}
      <Row gutter={[14, 14]}>
        <Col xs={24} lg={15} style={{ display: 'flex', flexDirection: 'column' }}>
          <Card
            style={{ ...cardStyle, flex: 1 }}
            styles={{ body: { padding: 0 } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 8px #6366f1' }} />
                  <span style={{ fontWeight: 800 }}>Recent Requisitions</span>
                </div>
                <Button type="link" size="small" icon={<ArrowRightOutlined />} style={{ fontSize: 12, color: '#6366f1', fontWeight: 600 }}
                  onClick={() => navigate('/booking/single')}>
                  View All
                </Button>
              </div>
            }
          >
            <Spin spinning={statsLoading}>
              <Table
                dataSource={recentDispatch} columns={dispatchCols}
                pagination={false} size="small"
                locale={{ emptyText: 'No requisitions yet' }}
                style={{ borderRadius: '0 0 16px 16px', overflow: 'hidden' }}
                onRow={() => ({ onClick: () => navigate('/booking/single'), style: { cursor: 'pointer' } })}
              />
            </Spin>
          </Card>
        </Col>

        <Col xs={24} lg={9} style={{ display: 'flex', flexDirection: 'column' }}>
          <Card
            style={{ ...cardStyle, flex: 1 }}
            styles={{ body: { padding: '8px 20px 16px' } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 8px #f59e0b' }} />
                <span style={{ fontWeight: 800 }}>Alerts & Activity</span>
              </div>
            }
          >
            <Spin spinning={statsLoading}>
              <Timeline
                items={alerts.map((a) => ({
                  color: a.color,
                  dot: <span style={{ fontSize: 13, color: a.color }}>{ALERT_ICONS[a.type] ?? <AlertOutlined />}</span>,
                  children: (
                    <div
                      onClick={() => navigate(ALERT_ROUTES[a.type] ?? '/dashboard')}
                      style={{
                        paddingBottom: 2, cursor: 'pointer', borderRadius: 8,
                        padding: '5px 8px', margin: '-5px -8px',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = `${a.color}10`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <Text style={{ fontSize: 13 }}>{a.text}</Text>
                      <ArrowRightOutlined style={{ fontSize: 10, marginLeft: 6, opacity: 0.4 }} />
                    </div>
                  ),
                }))}
              />
            </Spin>
          </Card>
        </Col>
      </Row>

      {/* ── Notices ──────────────────────────────────────────────────────── */}
      <Row gutter={[14, 14]} style={{ marginTop: 14 }}>
        <Col span={24}>
          <Card
            style={cardStyle}
            styles={{ body: { padding: '0 0 4px' } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 8px #f59e0b' }} />
                  <span style={{ fontWeight: 800 }}>Notices</span>
                  {unreadCount > 0 && (
                    <span style={{
                      background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                      color: '#fff', fontSize: 10, fontWeight: 800,
                      padding: '1px 7px', borderRadius: 10,
                    }}>
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <Button type="link" size="small" icon={<ArrowRightOutlined />}
                  style={{ fontSize: 12, color: '#6366f1', fontWeight: 600 }} onClick={() => navigate('/notices')}>
                  View All
                </Button>
              </div>
            }
          >
            <Spin spinning={noticesLoading}>
              {recentNotices.length === 0 && !noticesLoading && (
                <div style={{ textAlign: 'center', padding: '24px 0', opacity: 0.4, fontSize: 13 }}>
                  No notices posted yet
                </div>
              )}
              {recentNotices.map((n, idx) => {
                const priColor = n.priority === 'high' ? '#f43f5e' : n.priority === 'medium' ? '#f97316' : '#6366f1';
                const priTag   = n.priority === 'high' ? 'red'     : n.priority === 'medium' ? 'orange'  : 'blue';
                return (
                  <div
                    key={n.id}
                    onClick={() => navigate('/notices')}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 14,
                      padding: '14px 20px',
                      borderBottom: idx < recentNotices.length - 1 ? '1px solid rgba(99,102,241,0.08)' : 'none',
                      opacity: n.readByMe ? 0.7 : 1,
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ width: 4, minHeight: 44, borderRadius: 4, background: priColor, boxShadow: `0 0 8px ${priColor}60`, flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        {!n.readByMe && (
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 6px #6366f1', display: 'inline-block', flexShrink: 0 }} />
                        )}
                        <Text strong style={{ fontSize: 13, fontWeight: 700 }}>{n.title}</Text>
                        <Tag color={priTag} style={{ fontSize: 10, fontWeight: 700, borderRadius: 8 }}>{n.priority?.toUpperCase()}</Tag>
                        <Tag color="default" style={{ fontSize: 10, borderRadius: 8 }}>{n.category}</Tag>
                        {n.readByMe && <Tag color="success" style={{ fontSize: 10, borderRadius: 8 }}>Read</Tag>}
                      </div>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 5 }}>
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
                          style={{ color: '#10b981', flexShrink: 0, borderRadius: 8 }}
                          loading={readMut.isPending && readMut.variables === n.id}
                          onClick={(e) => { e.stopPropagation(); readMut.mutate(n.id); }}
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
