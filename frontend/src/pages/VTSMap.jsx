import {
  EnvironmentOutlined, EyeOutlined, PauseCircleOutlined, PlayCircleOutlined, ReloadOutlined,
} from '@ant-design/icons';
import {
  Badge, Button, Card, Col, Descriptions, Drawer, Progress, Row, Select, Segmented, Slider,
  Switch, Table, Tag, Typography, message, Spin,
} from 'antd';
import L from 'leaflet';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import PageHeader from '../components/PageHeader';
import { vtsService } from '../services/vtsService';

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
    iconSize:    [14, 14],
    iconAnchor:  [7, 7],
    popupAnchor: [0, -10],
  });
}

const ICONS = {
  moving: makeIcon('#52c41a'),
  parked: makeIcon('#1677ff'),
  idle:   makeIcon('#fa8c16'),
};

const statusColors   = { moving: 'green',   parked: 'blue',   idle: 'orange' };
const statusDotColor = { moving: '#52c41a', parked: '#1677ff', idle: '#fa8c16' };

/* ── Map tile layer presets ─────────────────────────────────────── */
const TILE_LAYERS = {
  osm: {
    url:         'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    label:       'Street',
  },
  google: {
    url:         'https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}',
    attribution: '&copy; <a href="https://maps.google.com">Google Maps</a>',
    label:       'Google',
  },
  satellite: {
    url:         'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; <a href="https://maps.google.com">Google Maps</a>',
    label:       'Satellite',
  },
};

/* ── Fly-to helper ───────────────────────────────────────────────── */
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
  const [vehicles, setVehicles]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [statusFilter, setStatus]     = useState('all');
  const [viewRecord, setViewRecord]   = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [intervalSec, setIntervalSec] = useState(10);
  const [mapLayer, setMapLayer]       = useState('osm');
  const timerRef = useRef(null);

  /* ── Fetch live data from backend ───────────────────────────────── */
  const fetchLive = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await vtsService.getLive();
      const data = res.data.data ?? [];
      setVehicles(data.map((v) => ({ ...v, key: v.key ?? v.dispatchNo })));
    } catch {
      // silently ignore — don't flash error on every auto-refresh
    } finally {
      setLoading(false);
      if (showSpinner) setRefreshing(false);
    }
  }, []);

  /* Initial load */
  useEffect(() => { fetchLive(); }, [fetchLive]);

  /* Auto-refresh interval */
  useEffect(() => {
    clearInterval(timerRef.current);
    if (autoRefresh) timerRef.current = setInterval(() => fetchLive(false), intervalSec * 1000);
    return () => clearInterval(timerRef.current);
  }, [autoRefresh, intervalSec, fetchLive]);

  function handleRefresh() {
    fetchLive(true);
    message.success('Live data refreshed');
  }

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
            background: statusDotColor[r.status] ?? '#52c41a',
            boxShadow: `0 0 5px ${statusDotColor[r.status] ?? '#52c41a'}`,
            display: 'inline-block',
          }} />
          <Text strong style={{ fontSize: 12 }}>{v}</Text>
        </div>
      ),
    },
    { title: 'Driver',   dataIndex: 'driver',   key: 'driver' },
    { title: 'Speed',    dataIndex: 'speed',    key: 'speed',    render: (v) => `${v} km/h` },
    { title: 'Route',    dataIndex: 'route',    key: 'route',    ellipsis: true },
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
    { title: 'Progress', dataIndex: 'progress', key: 'progress', render: (v) => (
        <Progress percent={v} size="small" strokeColor="#1677ff" style={{ width: 70, margin: 0 }} />
      ),
    },
    { title: 'Status',  dataIndex: 'status',     key: 'status',     render: (s) => <Tag color={statusColors[s] ?? 'green'}>{(s ?? 'moving').toUpperCase()}</Tag> },
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
        subtitle="Live vehicle tracking — real trips from the system"
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

      {/* ── Map ────────────────────────────────────────────────── */}
      <Spin spinning={loading}>
        <Card
          size="small"
          style={{ borderRadius: 12, marginBottom: 16 }}
          styles={{ body: { padding: 0, overflow: 'hidden', borderRadius: 12 } }}
        >
          <div style={{ position: 'relative' }}>

            {/* Live Feed badge — top left */}
            <div style={{
              position: 'absolute', top: 12, left: 58, zIndex: 1000,
              background: 'rgba(0,0,0,0.65)', borderRadius: 8, padding: '4px 10px',
              display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'none',
            }}>
              <Badge status="processing" />
              <Text style={{ color: '#52c41a', fontSize: 12 }}>
                Live Feed · {vehicles.length} active trip{vehicles.length !== 1 ? 's' : ''}
              </Text>
            </div>

            {/* Map layer switcher — top right */}
            <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000 }}>
              <Segmented
                size="small"
                value={mapLayer}
                onChange={setMapLayer}
                options={Object.entries(TILE_LAYERS).map(([key, val]) => ({ value: key, label: val.label }))}
                style={{ background: 'rgba(0,0,0,0.60)', borderRadius: 8, padding: 2 }}
                className="map-layer-switcher"
              />
            </div>

            <MapContainer
              center={[23.8, 90.4]}
              zoom={7}
              style={{ height: 440, width: '100%', borderRadius: 12 }}
              scrollWheelZoom
            >
              <TileLayer
                key={mapLayer}
                attribution={TILE_LAYERS[mapLayer].attribution}
                url={TILE_LAYERS[mapLayer].url}
              />

              <FlyTo vehicles={vehicles} selectedKey={selectedKey} />

              {vehicles.map((v) => (
                <Marker
                  key={v.key}
                  position={[v.lat, v.lng]}
                  icon={ICONS[v.status] ?? ICONS.moving}
                  eventHandlers={{ click: () => handleSelectVehicle(v) }}
                >
                  <Popup>
                    <div style={{ minWidth: 180 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{v.vehicle}</div>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{v.vehicleMake}</div>
                      <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>{v.driver}</div>
                      <div style={{ fontSize: 12, marginBottom: 4 }}>
                        <Tag color={statusColors[v.status] ?? 'green'} style={{ margin: 0 }}>{(v.status ?? 'moving').toUpperCase()}</Tag>
                      </div>
                      <div style={{ fontSize: 12, marginBottom: 2 }}>📍 {v.location}</div>
                      <div style={{ fontSize: 12, marginBottom: 2 }}>🚀 {v.speed} km/h &nbsp;⛽ {v.fuel}%</div>
                      <div style={{ fontSize: 12, marginBottom: 2 }}>🗺 {v.route}</div>
                      <div style={{ fontSize: 12, marginBottom: 6 }}>
                        <Progress percent={v.progress} size="small" strokeColor="#1677ff" />
                      </div>
                      <Button type="link" size="small" style={{ padding: '2px 0', fontSize: 12 }}
                        onClick={() => handleSelectVehicle(v)}>
                        View details →
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </Card>
      </Spin>

      {/* Vehicle status cards */}
      {vehicles.length === 0 && !loading ? (
        <Card style={{ borderRadius: 12, marginBottom: 16, textAlign: 'center', padding: '24px 0' }}>
          <Text type="secondary">No active trips right now. Mark a dispatch as "In Progress" to see it here.</Text>
        </Card>
      ) : (
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          {vehicles.map((v) => (
            <Col key={v.key} xs={24} sm={12} md={8} lg={4}>
              <Card
                size="small"
                hoverable
                onClick={() => handleSelectVehicle(v)}
                style={{
                  borderRadius: 10, cursor: 'pointer',
                  borderColor: v.key === selectedKey ? (statusDotColor[v.status] ?? '#52c41a') : (statusDotColor[v.status] ?? '#52c41a') + '40',
                  boxShadow: v.key === selectedKey ? `0 0 12px ${statusDotColor[v.status] ?? '#52c41a'}40` : 'none',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text strong style={{ fontSize: 13 }}>{v.vehicle}</Text>
                  <Tag color={statusColors[v.status] ?? 'green'} style={{ margin: 0, fontSize: 10 }}>{(v.status ?? 'moving').toUpperCase()}</Tag>
                </div>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{v.driver}</Text>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                  {v.speed} km/h · ⛽ {v.fuel}%
                </Text>
                <Progress percent={v.progress} size="small" strokeColor="#1677ff" showInfo={false} style={{ marginTop: 4, marginBottom: 0 }} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

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
          locale={{ emptyText: 'No active trips — set a dispatch to "In Progress" to track it here' }}
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
          const dotColor = statusDotColor[live.status] ?? '#52c41a';
          return (
            <>
              <div style={{ marginBottom: 16, textAlign: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', margin: '0 auto 10px',
                  background: dotColor + '20', border: `2px solid ${dotColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <EnvironmentOutlined style={{ fontSize: 24, color: dotColor }} />
                </div>
                <Tag color={statusColors[live.status] ?? 'green'} style={{ fontSize: 13 }}>{(live.status ?? 'moving').toUpperCase()}</Tag>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Trip Progress</Text>
                  <Text style={{ fontSize: 12, fontWeight: 600 }}>{live.progress ?? 0}%</Text>
                </div>
                <Progress percent={live.progress ?? 0} strokeColor="#1677ff" size="small" showInfo={false} />
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
                <Descriptions.Item label="Type"        >{live.vehicleType}</Descriptions.Item>
                <Descriptions.Item label="Driver"      span={2}>{live.driver}</Descriptions.Item>
                <Descriptions.Item label="Location"    span={2}>{live.location}</Descriptions.Item>
                <Descriptions.Item label="Route"       span={2}>{live.route}</Descriptions.Item>
                <Descriptions.Item label="Speed"       >{live.speed} km/h</Descriptions.Item>
                <Descriptions.Item label="Heading"     >{live.heading}</Descriptions.Item>
                <Descriptions.Item label="Engine Temp" >
                  <Tag color={live.temp === 'High' ? 'red' : 'green'}>{live.temp ?? 'Normal'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Distance"    >{live.elapsedKm} / {live.distance} km</Descriptions.Item>
                <Descriptions.Item label="Purpose"     span={2}>{live.purpose}</Descriptions.Item>
                <Descriptions.Item label="Approved By" span={2}>{live.approvedBy}</Descriptions.Item>
                <Descriptions.Item label="Dispatch No" span={2}>{live.dispatchNo}</Descriptions.Item>
                <Descriptions.Item label="Coordinates" span={2}>{live.lat}°N, {live.lng}°E</Descriptions.Item>
              </Descriptions>
            </>
          );
        })()}
      </Drawer>
    </div>
  );
}
