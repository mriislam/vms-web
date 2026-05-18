import {
  EnvironmentOutlined, EyeOutlined, PauseCircleOutlined, PlayCircleOutlined, ReloadOutlined,
} from '@ant-design/icons';
import {
  Badge, Button, Card, Col, Descriptions, Drawer, Progress, Row, Select, Slider,
  Switch, Table, Tag, Typography, message,
} from 'antd';
import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import PageHeader from '../components/PageHeader';

const { Text } = Typography;

/* ── Fix Leaflet default icon paths broken by Vite ─────────────── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/* ── Custom colored markers ─────────────────────────────────────── */
function makeIcon(color) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:14px;height:14px;border-radius:50%;
        background:${color};
        border:2.5px solid #fff;
        box-shadow:0 0 8px ${color},0 2px 6px rgba(0,0,0,0.4);
      "></div>`,
    iconSize:   [14, 14],
    iconAnchor: [7, 7],
    popupAnchor:[0, -10],
  });
}

const ICONS = {
  moving: makeIcon('#52c41a'),
  parked: makeIcon('#1677ff'),
  idle:   makeIcon('#fa8c16'),
};

const statusColors   = { moving: 'green',   parked: 'blue',   idle: 'orange' };
const statusDotColor = { moving: '#52c41a', parked: '#1677ff', idle: '#fa8c16' };

const INITIAL_VEHICLES = [
  { key: 1, vehicle: 'DHK-1234', driver: 'Rahim Uddin',   speed: 62,  location: 'Comilla Highway',  lat: 23.45,  lng: 91.17,  status: 'moving', lastUpdate: '1 min ago',  fuel: 68, temp: 'Normal', heading: 'SE', route: 'Dhaka → CTG',     km: 3820 },
  { key: 2, vehicle: 'DHK-5678', driver: 'Karim Ali',     speed: 0,   location: 'Sylhet Depot',      lat: 24.90,  lng: 91.87,  status: 'parked', lastUpdate: '3 min ago',  fuel: 45, temp: 'Normal', heading: '—',  route: 'Dhaka → Sylhet',  km: 2100 },
  { key: 3, vehicle: 'CTG-0091', driver: 'Nasir Hossain', speed: 48,  location: 'Feni Bypass',       lat: 23.00,  lng: 91.40,  status: 'moving', lastUpdate: '2 min ago',  fuel: 30, temp: 'Normal', heading: 'N',  route: 'CTG → Comilla',   km: 2900 },
  { key: 4, vehicle: 'SYL-3322', driver: 'Jalal Mia',     speed: 0,   location: 'Rajshahi HQ',       lat: 24.37,  lng: 88.60,  status: 'idle',   lastUpdate: '15 min ago', fuel: 82, temp: 'Normal', heading: '—',  route: '—',               km: 2400 },
  { key: 5, vehicle: 'DHK-7741', driver: 'Farid Ahmed',   speed: 75,  location: 'Padma Bridge Rd',   lat: 23.535, lng: 89.555, status: 'moving', lastUpdate: '1 min ago',  fuel: 55, temp: 'High',   heading: 'SW', route: 'Dhaka → Rajshahi', km: 3600 },
];

/* ── Fly-to helper: pans the map when selectedKey changes ───────── */
function FlyTo({ vehicles, selectedKey }) {
  const map = useMap();
  useEffect(() => {
    if (!selectedKey) return;
    const v = vehicles.find((x) => x.key === selectedKey);
    if (v) map.flyTo([v.lat, v.lng], 11, { duration: 1 });
  }, [selectedKey]); // eslint-disable-line
  return null;
}

export default function VTSMap() {
  const [vehicles, setVehicles]       = useState(INITIAL_VEHICLES);
  const [statusFilter, setStatus]     = useState('all');
  const [viewRecord, setViewRecord]   = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [intervalSec, setIntervalSec] = useState(10);
  const timerRef = useRef(null);

  function simulateUpdate() {
    setVehicles((prev) => prev.map((v) => {
      if (v.status !== 'moving') return { ...v, lastUpdate: 'just now' };
      const newSpeed = Math.max(40, Math.min(90, v.speed + (Math.random() * 10 - 5)));
      const newFuel  = Math.max(5, parseFloat((v.fuel - Math.random() * 0.4).toFixed(1)));
      /* tiny drift to show movement on map */
      const dLat = (Math.random() - 0.5) * 0.005;
      const dLng = (Math.random() - 0.5) * 0.005;
      return { ...v, speed: Math.round(newSpeed), fuel: newFuel, lat: v.lat + dLat, lng: v.lng + dLng, lastUpdate: 'just now' };
    }));
  }

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => { simulateUpdate(); setRefreshing(false); message.success('Live data refreshed'); }, 600);
  }

  useEffect(() => {
    clearInterval(timerRef.current);
    if (autoRefresh) timerRef.current = setInterval(simulateUpdate, intervalSec * 1000);
    return () => clearInterval(timerRef.current);
  }, [autoRefresh, intervalSec]);

  function handleSelectVehicle(v) { setSelectedKey(v.key); setViewRecord(v); }

  const filtered = statusFilter === 'all' ? vehicles : vehicles.filter((v) => v.status === statusFilter);
  const moving   = vehicles.filter((v) => v.status === 'moving').length;
  const parked   = vehicles.filter((v) => v.status === 'parked').length;
  const idle     = vehicles.filter((v) => v.status === 'idle').length;

  const columns = [
    {
      title: 'Vehicle', dataIndex: 'vehicle', key: 'vehicle',
      render: (v, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: statusDotColor[r.status],
            boxShadow: `0 0 5px ${statusDotColor[r.status]}`,
            display: 'inline-block',
          }} />
          <Text strong style={{ fontSize: 12 }}>{v}</Text>
        </div>
      ),
    },
    { title: 'Driver',   dataIndex: 'driver',   key: 'driver' },
    { title: 'Speed',    dataIndex: 'speed',    key: 'speed',  render: (v) => `${v} km/h` },
    { title: 'Location', dataIndex: 'location', key: 'location' },
    {
      title: 'Fuel', dataIndex: 'fuel', key: 'fuel',
      render: (v) => {
        const color = v > 50 ? '#52c41a' : v > 20 ? '#fa8c16' : '#ff4d4f';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Progress percent={v} size="small" strokeColor={color} style={{ width: 60, margin: 0 }} showInfo={false} />
            <Text style={{ fontSize: 11, color }}>{v}%</Text>
          </div>
        );
      },
    },
    { title: 'Status',  dataIndex: 'status',     key: 'status',     render: (s) => <Tag color={statusColors[s]}>{s.toUpperCase()}</Tag> },
    { title: 'Updated', dataIndex: 'lastUpdate', key: 'lastUpdate' },
    {
      title: 'Track', key: 'track',
      render: (_, r) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleSelectVehicle(r)}>
          Details
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        icon={<EnvironmentOutlined />}
        color="#eb2f96"
        title="VTS Map"
        subtitle="Live vehicle tracking and real-time location monitoring"
        stats={[
          { label: 'Moving', value: moving, color: '#52c41a' },
          { label: 'Parked', value: parked, color: '#1677ff' },
          { label: 'Idle',   value: idle,   color: '#fa8c16' },
        ]}
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, opacity: 0.7 }}>Auto-refresh</span>
            <Switch
              size="small"
              checked={autoRefresh}
              onChange={setAutoRefresh}
              checkedChildren={<PlayCircleOutlined />}
              unCheckedChildren={<PauseCircleOutlined />}
            />
            {autoRefresh && (
              <>
                <Slider
                  min={5} max={60} step={5}
                  value={intervalSec}
                  onChange={setIntervalSec}
                  style={{ width: 90 }}
                  tooltip={{ formatter: (v) => `${v}s` }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>{intervalSec}s</Text>
              </>
            )}
            <Button size="small" icon={<ReloadOutlined spin={refreshing} />} onClick={handleRefresh} loading={refreshing}>
              Refresh
            </Button>
          </div>
        }
      />

      {/* ── OpenStreetMap ───────────────────────────────────── */}
      <Card
        size="small"
        style={{ borderRadius: 12, marginBottom: 16 }}
        styles={{ body: { padding: 0, overflow: 'hidden', borderRadius: 12 } }}
      >
        {/* Live badge overlay */}
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute', top: 12, left: 58, zIndex: 1000,
            background: 'rgba(0,0,0,0.65)', borderRadius: 8, padding: '4px 10px',
            display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'none',
          }}>
            <Badge status="processing" />
            <Text style={{ color: '#52c41a', fontSize: 12 }}>Live Feed</Text>
          </div>

          <MapContainer
            center={[23.8, 90.4]}
            zoom={7}
            style={{ height: 420, width: '100%', borderRadius: 12 }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FlyTo vehicles={vehicles} selectedKey={selectedKey} />

            {vehicles.map((v) => (
              <Marker
                key={v.key}
                position={[v.lat, v.lng]}
                icon={ICONS[v.status]}
                eventHandlers={{ click: () => handleSelectVehicle(v) }}
              >
                <Popup>
                  <div style={{ minWidth: 160 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{v.vehicle}</div>
                    <div style={{ fontSize: 12, color: '#555' }}>{v.driver}</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      <Tag color={statusColors[v.status]} style={{ margin: 0 }}>{v.status.toUpperCase()}</Tag>
                    </div>
                    <div style={{ fontSize: 12, marginTop: 6 }}>📍 {v.location}</div>
                    <div style={{ fontSize: 12 }}>🚀 {v.speed} km/h &nbsp; ⛽ {v.fuel}%</div>
                    <div style={{ fontSize: 12 }}>🗺 {v.route}</div>
                    <Button
                      type="link"
                      size="small"
                      style={{ padding: '4px 0', fontSize: 12 }}
                      onClick={() => handleSelectVehicle(v)}
                    >
                      View details →
                    </Button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </Card>

      {/* Vehicle status cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {vehicles.map((v) => (
          <Col key={v.key} xs={24} sm={12} md={8} lg={4}>
            <Card
              size="small"
              hoverable
              onClick={() => handleSelectVehicle(v)}
              style={{
                borderRadius: 10, cursor: 'pointer',
                borderColor: v.key === selectedKey ? statusDotColor[v.status] : statusDotColor[v.status] + '40',
                boxShadow: v.key === selectedKey ? `0 0 12px ${statusDotColor[v.status]}40` : 'none',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text strong style={{ fontSize: 13 }}>{v.vehicle}</Text>
                <Tag color={statusColors[v.status]} style={{ margin: 0, fontSize: 10 }}>{v.status.toUpperCase()}</Tag>
              </div>
              <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{v.driver}</Text>
              <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                {v.speed > 0 ? `${v.speed} km/h` : 'Stopped'} · ⛽ {v.fuel}%
              </Text>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Live Table */}
      <Card size="small" style={{ borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text strong>Live Vehicle List</Text>
          <Select
            value={statusFilter}
            onChange={setStatus}
            size="small"
            style={{ width: 130 }}
            options={[
              { value: 'all',    label: 'All Status' },
              { value: 'moving', label: 'Moving' },
              { value: 'parked', label: 'Parked' },
              { value: 'idle',   label: 'Idle' },
            ]}
          />
        </div>
        <Table
          dataSource={filtered}
          columns={columns}
          size="small"
          pagination={false}
          rowKey="key"
          scroll={{ x: 'max-content' }}
          onRow={(r) => ({ onClick: () => handleSelectVehicle(r), style: { cursor: 'pointer' } })}
          rowClassName={(r) => r.key === selectedKey ? 'ant-table-row-selected' : ''}
        />
      </Card>

      {/* Vehicle Detail Drawer */}
      <Drawer
        open={!!viewRecord}
        onClose={() => { setViewRecord(null); setSelectedKey(null); }}
        title={viewRecord ? `Tracking — ${viewRecord.vehicle}` : ''}
        width={420}
      >
        {viewRecord && (() => {
          const live = vehicles.find((v) => v.key === viewRecord.key) || viewRecord;
          return (
            <>
              <div style={{ marginBottom: 16, textAlign: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', margin: '0 auto 10px',
                  background: statusDotColor[live.status] + '20',
                  border: `2px solid ${statusDotColor[live.status]}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <EnvironmentOutlined style={{ fontSize: 24, color: statusDotColor[live.status] }} />
                </div>
                <Tag color={statusColors[live.status]} style={{ fontSize: 13 }}>{live.status.toUpperCase()}</Tag>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Fuel Level</Text>
                  <Text style={{ fontSize: 12, fontWeight: 600 }}>{live.fuel}%</Text>
                </div>
                <Progress
                  percent={live.fuel}
                  strokeColor={live.fuel > 50 ? '#52c41a' : live.fuel > 20 ? '#fa8c16' : '#ff4d4f'}
                  size="small"
                  showInfo={false}
                />
              </div>

              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Vehicle"     >{live.vehicle}</Descriptions.Item>
                <Descriptions.Item label="Driver"      >{live.driver}</Descriptions.Item>
                <Descriptions.Item label="Location"    span={2}>{live.location}</Descriptions.Item>
                <Descriptions.Item label="Route"       span={2}>{live.route}</Descriptions.Item>
                <Descriptions.Item label="Speed"       >{live.speed} km/h</Descriptions.Item>
                <Descriptions.Item label="Heading"     >{live.heading}</Descriptions.Item>
                <Descriptions.Item label="Engine Temp" >
                  <Tag color={live.temp === 'High' ? 'red' : 'green'}>{live.temp}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Total km"    >{live.km.toLocaleString()} km</Descriptions.Item>
                <Descriptions.Item label="Coordinates" span={2}>{live.lat.toFixed(4)}°N, {live.lng.toFixed(4)}°E</Descriptions.Item>
                <Descriptions.Item label="Last Update" span={2}>{live.lastUpdate}</Descriptions.Item>
              </Descriptions>
            </>
          );
        })()}
      </Drawer>
    </div>
  );
}
