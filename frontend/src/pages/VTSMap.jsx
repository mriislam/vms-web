import {
  CarOutlined, ClockCircleOutlined, EnvironmentOutlined,
  HistoryOutlined, InfoCircleOutlined, MobileOutlined,
  PauseOutlined, PlayCircleOutlined, ReloadOutlined,
  SearchOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Badge, Button, Card, Col, DatePicker, Descriptions, Drawer,
  Progress, Row, Select, Segmented, Spin, Table, Tag, Tooltip, Typography,
} from 'antd';
import dayjs from 'dayjs';
import L from 'leaflet';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import PageHeader from '../components/PageHeader';
import { vtsService } from '../services/vtsService';

const { Text, Title } = Typography;

/* ── Leaflet icon fix ───────────────────────────────────────────── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function makeIcon(color, size = 14) {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:2.5px solid #fff;
      box-shadow:0 0 8px ${color},0 2px 6px rgba(0,0,0,.4)"></div>`,
    iconSize:    [size, size],
    iconAnchor:  [size/2, size/2],
    popupAnchor: [0, -size/2],
  });
}

const makeCarIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="font-size:22px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))">🚗</div>`,
  iconSize: [24, 24], iconAnchor: [12, 12],
});

const STATUS_COLOR  = { moving: '#52c41a', parked: '#1677ff', idle: '#fa8c16', running: '#52c41a', stopped: '#ff4d4f' };
const STATUS_TAG    = { moving: 'green',   parked: 'blue',    idle: 'orange',  running: 'green',   stopped: 'red' };

/* ── Map tile layers ────────────────────────────────────────────── */
const TILES = {
  osm:       { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',         attribution: '&copy; OpenStreetMap contributors', label: 'Street' },
  google:    { url: 'https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}',        attribution: '&copy; Google Maps',                label: 'Google' },
  satellite: { url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',        attribution: '&copy; Google Maps',                label: 'Satellite' },
};

/* ── FlyTo helper ───────────────────────────────────────────────── */
function FlyTo({ lat, lng, zoom = 11 }) {
  const map = useMap();
  useEffect(() => { if (lat && lng) map.flyTo([lat, lng], zoom, { duration: 1 }); }, [lat, lng]); // eslint-disable-line
  return null;
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points?.length > 1) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [points]); // eslint-disable-line
  return null;
}

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════ */
export default function VTSMap() {
  /* ── state ───────────────────────────────────────────────────── */
  const [devices,        setDevices]        = useState([]);
  const [liveAll,        setLiveAll]        = useState([]);
  const [selectedReg,    setSelectedReg]    = useState(null);
  const [liveOne,        setLiveOne]        = useState(null);
  const [activeTab,      setActiveTab]      = useState('live');
  const [mapLayer,       setMapLayer]       = useState('osm');
  const [autoRefresh,    setAutoRefresh]    = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [intervalSec,    setIntervalSec]    = useState(10);
  const [loading,        setLoading]        = useState(true);

  // History state
  const [historyPeriod,  setHistoryPeriod]  = useState('today');
  const [historyDate,    setHistoryDate]    = useState(null);
  const [historyFrom,    setHistoryFrom]    = useState(null);
  const [historyTo,      setHistoryTo]      = useState(null);
  const [historyData,    setHistoryData]    = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [playbackIdx,    setPlaybackIdx]    = useState(0);
  const [isPlaying,      setIsPlaying]      = useState(false);

  const timerRef    = useRef(null);
  const playbackRef = useRef(null);

  /* ── fetch all devices for search dropdown ───────────────────── */
  useEffect(() => {
    vtsService.getDevices().then(r => setDevices(r.data.data ?? [])).catch(() => {});
  }, []);

  /* ── fetch all live vehicles ─────────────────────────────────── */
  const fetchAll = useCallback(async () => {
    try {
      const r = await vtsService.getLive();
      setLiveAll(r.data.data ?? []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (autoRefresh && activeTab === 'live') {
      timerRef.current = setInterval(() => {
        fetchAll();
        if (selectedReg) fetchOne(selectedReg);
      }, intervalSec * 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [autoRefresh, intervalSec, activeTab, selectedReg, fetchAll]); // eslint-disable-line

  /* ── fetch single live vehicle ───────────────────────────────── */
  const fetchOne = useCallback(async (reg) => {
    try {
      const r = await vtsService.getLiveOne(reg);
      setLiveOne(r.data.data);
    } catch {}
  }, []);

  /* ── on vehicle select ───────────────────────────────────────── */
  function onSelectVehicle(reg) {
    setSelectedReg(reg);
    setActiveTab('live');
    setHistoryData(null);
    setIsPlaying(false);
    clearInterval(playbackRef.current);
    if (reg) fetchOne(reg);
    else setLiveOne(null);
  }

  /* ── history fetch ───────────────────────────────────────────── */
  async function fetchHistory() {
    if (!selectedReg) return;
    setHistoryLoading(true);
    setIsPlaying(false);
    setPlaybackIdx(0);
    clearInterval(playbackRef.current);
    try {
      const params = { period: historyPeriod };
      if (historyPeriod === 'specific' && historyDate) params.date = historyDate.format('YYYY-MM-DD');
      if (historyPeriod === 'range') {
        if (historyFrom) params.from = historyFrom.format('YYYY-MM-DD');
        if (historyTo)   params.to   = historyTo.format('YYYY-MM-DD');
      }
      const r = await vtsService.getHistory(selectedReg, params);
      setHistoryData(r.data.data);
    } catch {}
    finally { setHistoryLoading(false); }
  }

  /* ── playback ────────────────────────────────────────────────── */
  function togglePlayback() {
    const pts = historyData?.trackPoints ?? [];
    if (!pts.length) return;
    if (isPlaying) {
      setIsPlaying(false);
      clearInterval(playbackRef.current);
    } else {
      setIsPlaying(true);
      if (playbackIdx >= pts.length - 1) setPlaybackIdx(0);
      playbackRef.current = setInterval(() => {
        setPlaybackIdx(prev => {
          if (prev >= pts.length - 1) { clearInterval(playbackRef.current); setIsPlaying(false); return prev; }
          return prev + 1;
        });
      }, 200);
    }
  }
  useEffect(() => () => clearInterval(playbackRef.current), []);

  /* ── derived ─────────────────────────────────────────────────── */
  const selectedDevice = devices.find(d => d.vehicleReg === selectedReg);
  const currentLive    = liveOne ?? liveAll.find(v => v.vehicle === selectedReg);
  const trackPoints    = historyData?.trackPoints ?? [];
  const currentPoint   = trackPoints[playbackIdx];

  const dropdownOptions = devices.map(d => ({
    value: d.vehicleReg,
    label: (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span><CarOutlined style={{ marginRight: 6, color: '#1677ff' }} /><strong>{d.vehicleReg}</strong> · {d.vehicleMake}</span>
        <span style={{ fontSize: 10, color: d.isActive ? '#52c41a' : '#fa8c16' }}>
          {d.isActive ? '● LIVE' : '○ Parked'}
        </span>
      </div>
    ),
  }));

  const searchFilter = (input, option) => {
    if (!option) return false;
    const reg = option.value?.toLowerCase() ?? '';
    const dev = devices.find(d => d.vehicleReg === option.value);
    if (!dev) return false;
    const q = input.toLowerCase();
    return reg.includes(q)
      || (dev.imei ?? '').includes(q)
      || (dev.msisdn ?? '').includes(q)
      || (dev.clientMobile ?? '').includes(q)
      || (dev.clientId ?? '').toLowerCase().includes(q);
  };

  const moving = liveAll.filter(v => v.status === 'moving').length;
  const parked = liveAll.filter(v => v.status === 'parked').length;
  const idle   = liveAll.filter(v => v.status === 'idle').length;

  /* ── map markers ─────────────────────────────────────────────── */
  const liveFlyTarget  = currentLive ? { lat: currentLive.lat, lng: currentLive.lng } : null;
  const histFlyTarget  = (activeTab === 'history' && currentPoint) ? { lat: currentPoint.lat, lng: currentPoint.lng } : null;

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div>
      <PageHeader
        icon={<EnvironmentOutlined />}
        color="#eb2f96"
        title="VTS Map"
        subtitle="Live vehicle tracking and trip history"
        stats={[
          { label: 'Moving', value: moving, color: '#52c41a' },
          { label: 'Parked', value: parked, color: '#1677ff' },
          { label: 'Idle',   value: idle,   color: '#fa8c16' },
        ]}
      />

      {/* ── Vehicle search bar ────────────────────────────────── */}
      <Card size="small" style={{ borderRadius: 12, marginBottom: 12 }}
        styles={{ body: { padding: '12px 16px' } }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <SearchOutlined style={{ color: '#8c9ab0', fontSize: 16 }} />
          <Select
            showSearch
            allowClear
            placeholder="Search vehicle by Reg No / IMEI / SIM (MSISDN) / Client Mobile / Client ID"
            style={{ flex: 1, minWidth: 300 }}
            options={dropdownOptions}
            filterOption={searchFilter}
            value={selectedReg}
            onChange={onSelectVehicle}
            size="large"
            optionLabelProp="value"
            notFoundContent={<Text type="secondary">No GPS-equipped vehicles found</Text>}
          />
          {selectedReg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <Badge status={currentLive ? 'processing' : 'default'} />
              <Text style={{ color: currentLive ? '#52c41a' : '#8c9ab0', fontSize: 13 }}>
                Engine {selectedDevice?.engineStatus === 'on' ? 'ON' : 'OFF'} &nbsp;•&nbsp;
                {currentLive ? `${currentLive.speed} km/h` : '0.00 km/h'}
              </Text>
            </div>
          )}
        </div>
      </Card>

      {/* ── Tabs (only when vehicle selected) ────────────────── */}
      {selectedReg && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8, gap: 4 }}>
          {[
            { key: 'live',         icon: <ThunderboltOutlined />,   label: 'Live Tracking' },
            { key: 'history',      icon: <HistoryOutlined />,        label: 'History' },
            { key: 'vehicle-info', icon: <CarOutlined />,            label: 'Vehicle Info' },
            { key: 'device-info',  icon: <MobileOutlined />,         label: 'Device Info' },
          ].map(tab => (
            <Button
              key={tab.key}
              type={activeTab === tab.key ? 'primary' : 'default'}
              icon={tab.icon}
              onClick={() => setActiveTab(tab.key)}
              size="small"
              style={{ borderRadius: 20, fontSize: 12 }}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         MAP
      ══════════════════════════════════════════════════════════ */}
      {activeTab !== 'vehicle-info' && activeTab !== 'device-info' && (
        <Spin spinning={loading}>
          <Card size="small" style={{ borderRadius: 12, marginBottom: 12 }}
            styles={{ body: { padding: 0, overflow: 'hidden', borderRadius: 12 } }}>
            <div style={{ position: 'relative' }}>

              {/* Live Feed badge */}
              {activeTab === 'live' && (
                <div style={{
                  position: 'absolute', top: 12, left: 58, zIndex: 1000,
                  background: 'rgba(0,0,0,0.65)', borderRadius: 8, padding: '4px 10px',
                  display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'none',
                }}>
                  <Badge status="processing" />
                  <Text style={{ color: '#52c41a', fontSize: 12 }}>
                    Live · {selectedReg ? '1 vehicle' : `${liveAll.length} active trips`}
                  </Text>
                </div>
              )}

              {/* Map layer switcher */}
              <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000 }}>
                <Segmented size="small" value={mapLayer} onChange={setMapLayer}
                  options={Object.entries(TILES).map(([k, v]) => ({ value: k, label: v.label }))}
                  style={{ background: 'rgba(0,0,0,0.60)', borderRadius: 8, padding: 2 }}
                  className="map-layer-switcher"
                />
              </div>

              {/* Auto-refresh controls (live mode) */}
              {activeTab === 'live' && (
                <div style={{
                  position: 'absolute', bottom: 12, right: 12, zIndex: 1000,
                  background: 'rgba(0,0,0,0.60)', borderRadius: 8, padding: '6px 10px',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Text style={{ color: '#8c9ab0', fontSize: 11 }}>Auto</Text>
                  <Button
                    size="small" type="text"
                    icon={autoRefresh ? <PauseOutlined style={{ color: '#52c41a' }} /> : <PlayCircleOutlined style={{ color: '#8c9ab0' }} />}
                    onClick={() => setAutoRefresh(v => !v)}
                    style={{ padding: 2 }}
                  />
                  <Text style={{ color: '#8c9ab0', fontSize: 11 }}>{intervalSec}s</Text>
                  <Button size="small" type="text"
                    icon={<ReloadOutlined spin={refreshing} style={{ color: '#8c9ab0', fontSize: 12 }} />}
                    onClick={() => { fetchAll(); if (selectedReg) fetchOne(selectedReg); }}
                    style={{ padding: 2 }}
                  />
                </div>
              )}

              <MapContainer center={[23.8, 90.4]} zoom={7}
                style={{ height: 500, width: '100%', borderRadius: 12 }} scrollWheelZoom>
                <TileLayer key={mapLayer} attribution={TILES[mapLayer].attribution} url={TILES[mapLayer].url} />

                {/* Live mode: fly to selected or first vehicle */}
                {activeTab === 'live' && liveFlyTarget && (
                  <FlyTo lat={liveFlyTarget.lat} lng={liveFlyTarget.lng} zoom={12} />
                )}

                {/* History mode: fit all track points */}
                {activeTab === 'history' && trackPoints.length > 1 && !currentPoint && (
                  <FitBounds points={trackPoints} />
                )}
                {activeTab === 'history' && currentPoint && (
                  <FlyTo lat={currentPoint.lat} lng={currentPoint.lng} zoom={14} />
                )}

                {/* ── Live mode: selected vehicle trail + marker ─── */}
                {activeTab === 'live' && selectedReg && currentLive && (<>
                  {currentLive.trail?.length > 1 && (
                    <Polyline
                      positions={currentLive.trail}
                      pathOptions={{ color: '#52c41a', weight: 4, opacity: 0.65, dashArray: '8 5' }}
                    />
                  )}
                  <Marker position={[currentLive.lat, currentLive.lng]} icon={makeIcon('#52c41a', 16)}>
                    <Popup>
                      <div style={{ minWidth: 200 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{currentLive.vehicle}</div>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{currentLive.vehicleMake}</div>
                        <div style={{ fontSize: 12 }}>🚀 {currentLive.speed} km/h · Heading {currentLive.heading}</div>
                        <div style={{ fontSize: 12 }}>📍 {currentLive.location}</div>
                        <div style={{ fontSize: 12 }}>⛽ {currentLive.fuel}%</div>
                        <div style={{ fontSize: 12, marginTop: 4 }}>🗺 {currentLive.route}</div>
                        <Progress percent={currentLive.progress} size="small" strokeColor="#1677ff" style={{ marginTop: 6 }} />
                      </div>
                    </Popup>
                  </Marker>
                </>)}

                {/* ── Live mode: all vehicles trails + markers ─────── */}
                {activeTab === 'live' && !selectedReg && (<>
                  {liveAll.filter(v => v.trail?.length > 1).map(v => (
                    <Polyline key={`trail-${v.key}`}
                      positions={v.trail}
                      pathOptions={{ color: STATUS_COLOR[v.status] ?? '#52c41a', weight: 3, opacity: 0.55, dashArray: '7 5' }}
                    />
                  ))}
                  {liveAll.map(v => (
                    <Marker key={v.key} position={[v.lat, v.lng]} icon={makeIcon(STATUS_COLOR[v.status] ?? '#52c41a')}>
                      <Popup>
                        <div style={{ minWidth: 180 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{v.vehicle}</div>
                          <div style={{ fontSize: 12, color: '#888' }}>{v.driver}</div>
                          <div style={{ fontSize: 12 }}>🚀 {v.speed} km/h · ⛽ {v.fuel}%</div>
                          <div style={{ fontSize: 12 }}>📍 {v.location}</div>
                          <div style={{ fontSize: 12 }}>🗺 {v.route}</div>
                          <Progress percent={v.progress} size="small" strokeColor="#1677ff" style={{ marginTop: 4 }} />
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </>)}

                {/* ── History mode: polyline + dots ──────────────── */}
                {activeTab === 'history' && trackPoints.length > 0 && (<>
                  <Polyline
                    positions={trackPoints.map(p => [p.lat, p.lng])}
                    pathOptions={{ color: '#1677ff', weight: 3, opacity: 0.7 }}
                  />
                  {trackPoints.map((p, i) => (
                    <CircleMarker key={i} center={[p.lat, p.lng]}
                      radius={i === playbackIdx ? 8 : 4}
                      pathOptions={{
                        color: i === playbackIdx ? '#ff4d4f' : (p.engineStatus === 'running' ? '#52c41a' : '#fa8c16'),
                        fillColor: i === playbackIdx ? '#ff4d4f' : '#1677ff',
                        fillOpacity: 1, weight: i === playbackIdx ? 3 : 1,
                      }}
                    >
                      <Popup>
                        <div style={{ fontSize: 12 }}>
                          <div><strong>{p.timestamp}</strong></div>
                          <div>🚀 {p.speed} km/h · {p.engineStatus}</div>
                          <div>📍 {p.location}</div>
                          <div style={{ color: '#888', fontSize: 10 }}>{p.lat}, {p.lng}</div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </>)}
              </MapContainer>
            </div>
          </Card>
        </Spin>
      )}

      {/* ══════════════════════════════════════════════════════════
         HISTORY PANEL
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && selectedReg && (
        <>
          {/* Date filter bar */}
          <Card size="small" style={{ borderRadius: 12, marginBottom: 12 }}
            styles={{ body: { padding: '12px 16px' } }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <Select
                value={historyPeriod} onChange={setHistoryPeriod}
                style={{ width: 160 }}
                options={[
                  { value: 'today',    label: 'Today' },
                  { value: 'last4h',   label: 'Last 4 Hours' },
                  { value: 'last6h',   label: 'Last 6 Hours' },
                  { value: 'last12h',  label: 'Last 12 Hours' },
                  { value: 'last24h',  label: 'Last 24 Hours' },
                  { value: 'specific', label: 'Specific Date' },
                  { value: 'range',    label: 'Custom Range (max 7 days)' },
                ]}
              />
              {historyPeriod === 'specific' && (
                <DatePicker value={historyDate} onChange={setHistoryDate} />
              )}
              {historyPeriod === 'range' && (<>
                <DatePicker
                  value={historyFrom} onChange={setHistoryFrom} placeholder="From"
                  disabledDate={d => d && d.isAfter(dayjs())}
                />
                <DatePicker
                  value={historyTo} onChange={setHistoryTo} placeholder="To"
                  disabledDate={d => {
                    if (!d) return false;
                    if (d.isAfter(dayjs())) return true;
                    if (historyFrom && d.diff(historyFrom, 'day') > 7) return true;
                    return false;
                  }}
                />
              </>)}
              <Button type="primary" loading={historyLoading} icon={<HistoryOutlined />}
                onClick={fetchHistory} style={{ borderRadius: 20 }}>
                Show History
              </Button>
            </div>
          </Card>

          {/* Stats + playback */}
          {historyData && trackPoints.length > 0 && (
            <Card size="small" style={{ borderRadius: 12, marginBottom: 12 }}
              styles={{ body: { padding: '10px 16px' } }}>
              <Row gutter={16} align="middle">
                <Col><Text type="secondary" style={{ fontSize: 12 }}>TOTAL</Text><br />
                  <Text strong>{historyData.totalKm} km</Text></Col>
                <Col><Text type="secondary" style={{ fontSize: 12 }}>TRAVELED</Text><br />
                  <Text strong style={{ color: '#52c41a' }}>{historyData.traveledKm} km</Text></Col>
                <Col><Text type="secondary" style={{ fontSize: 12 }}>POINTS</Text><br />
                  <Text strong>{trackPoints.length}</Text></Col>
                <Col flex="auto" />
                <Col>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 12, color: '#8c9ab0' }}>
                      {playbackIdx + 1} / {trackPoints.length}
                    </Text>
                    <Button type="primary" shape="circle"
                      icon={isPlaying ? <PauseOutlined /> : <PlayCircleOutlined />}
                      onClick={togglePlayback} size="small"
                    />
                    <Button size="small" onClick={() => { setPlaybackIdx(0); setIsPlaying(false); }}>
                      Reset
                    </Button>
                  </div>
                </Col>
              </Row>
              {currentPoint && (
                <div style={{
                  marginTop: 10, padding: '8px 12px', background: 'rgba(22,119,255,0.08)',
                  borderRadius: 8, fontSize: 12, display: 'flex', gap: 20, flexWrap: 'wrap',
                }}>
                  <span><Badge color={currentPoint.engineStatus === 'running' ? '#52c41a' : '#fa8c16'} />
                    <strong>{currentPoint.engineStatus === 'running' ? 'Running' : 'Stopped'}</strong>
                  </span>
                  <span>🚀 <strong style={{ color: '#1677ff' }}>{currentPoint.speed} km/h</strong></span>
                  <span>🕐 {currentPoint.timestamp}</span>
                  <span>📍 {currentPoint.location}</span>
                  <span style={{ color: '#8c9ab0', fontSize: 10 }}>{currentPoint.lat}, {currentPoint.lng}</span>
                </div>
              )}
            </Card>
          )}

          {historyData && trackPoints.length > 0 && (
            <Card size="small" style={{ borderRadius: 12, marginBottom: 12 }}
              title={<span><HistoryOutlined /> Trip History &nbsp;
                <Tag color="blue">{trackPoints.length} pts</Tag>
                <Tag>{historyData.totalKm} km</Tag>
              </span>}
              styles={{ body: { padding: 0 } }}>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {trackPoints.map((p, i) => (
                  <div key={i} onClick={() => setPlaybackIdx(i)} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 16px', cursor: 'pointer',
                    background: i === playbackIdx ? 'rgba(22,119,255,0.1)' : 'transparent',
                    borderLeft: i === playbackIdx ? '3px solid #1677ff' : '3px solid transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (i !== playbackIdx) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                  onMouseLeave={e => { if (i !== playbackIdx) e.currentTarget.style.background = 'transparent'; }}>
                    <Text style={{ fontSize: 11, color: '#8c9ab0', minWidth: 30 }}>#{p.no}</Text>
                    <Text style={{ fontSize: 12, minWidth: 160 }}>{p.timestamp}</Text>
                    <Tag color={p.engineStatus === 'running' ? 'green' : 'orange'} style={{ fontSize: 10 }}>
                      {p.engineStatus === 'running' ? 'Running' : 'Stopped'}
                    </Tag>
                    <Text strong style={{ color: '#1677ff', minWidth: 70, fontSize: 12 }}>{p.speed} km/h</Text>
                    <Text type="secondary" style={{ fontSize: 11, flex: 1 }} ellipsis>{p.location}</Text>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {historyData && trackPoints.length === 0 && !historyLoading && (
            <Card style={{ borderRadius: 12, textAlign: 'center', padding: '24px 0' }}>
              <Text type="secondary">No GPS data found for the selected period.</Text>
            </Card>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
         VEHICLE INFO TAB
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'vehicle-info' && selectedReg && (
        <Card style={{ borderRadius: 12, marginBottom: 12 }}
          title={<span><CarOutlined /> Vehicle Information — {selectedReg}</span>}>
          <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
            <Descriptions.Item label="Registration">{selectedReg}</Descriptions.Item>
            <Descriptions.Item label="Make / Model">{currentLive?.vehicleMake || selectedDevice?.vehicleMake || '—'}</Descriptions.Item>
            <Descriptions.Item label="Type">{currentLive?.vehicleType || selectedDevice?.vehicleType || '—'}</Descriptions.Item>
            <Descriptions.Item label="Engine Status">
              <Tag color={selectedDevice?.engineStatus === 'on' ? 'green' : 'default'}>
                Engine {selectedDevice?.engineStatus === 'on' ? 'ON' : 'OFF'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Current Speed">{currentLive ? `${currentLive.speed} km/h` : '0 km/h'}</Descriptions.Item>
            <Descriptions.Item label="Heading">{currentLive?.heading || '—'}</Descriptions.Item>
            <Descriptions.Item label="Current Location" span={2}>{currentLive?.location || '—'}</Descriptions.Item>
            <Descriptions.Item label="Active Route" span={2}>{currentLive?.route || 'Not on a trip'}</Descriptions.Item>
            <Descriptions.Item label="Trip Progress">
              {currentLive ? <Progress percent={currentLive.progress} size="small" strokeColor="#1677ff" style={{ maxWidth: 200 }} /> : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Distance Covered">{currentLive ? `${currentLive.elapsedKm} / ${currentLive.distance} km` : '—'}</Descriptions.Item>
            <Descriptions.Item label="Fuel Level">
              {currentLive ? (
                <Progress percent={currentLive.fuel}
                  strokeColor={currentLive.fuel > 50 ? '#52c41a' : currentLive.fuel > 20 ? '#fa8c16' : '#ff4d4f'}
                  size="small" style={{ maxWidth: 200 }} />
              ) : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Engine Temp">
              <Tag color={currentLive?.temp === 'High' ? 'red' : 'green'}>{currentLive?.temp || 'Normal'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Driver" span={2}>{currentLive?.driver || '—'}</Descriptions.Item>
            <Descriptions.Item label="Trip Purpose" span={2}>{currentLive?.purpose || '—'}</Descriptions.Item>
            <Descriptions.Item label="Approved By">{currentLive?.approvedBy || '—'}</Descriptions.Item>
            <Descriptions.Item label="Dispatch No">{currentLive?.dispatchNo || '—'}</Descriptions.Item>
            <Descriptions.Item label="Coordinates" span={2}>
              {currentLive ? `${currentLive.lat}°N, ${currentLive.lng}°E` : '—'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════
         DEVICE INFO TAB
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'device-info' && selectedReg && selectedDevice && (
        <Card style={{ borderRadius: 12, marginBottom: 12 }}
          title={<span><MobileOutlined /> GPS Device Information — {selectedReg}</span>}>
          <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
            <Descriptions.Item label="Vehicle Reg">{selectedDevice.vehicleReg}</Descriptions.Item>
            <Descriptions.Item label="Device Model">{selectedDevice.deviceModel}</Descriptions.Item>
            <Descriptions.Item label="IMEI">{selectedDevice.imei}</Descriptions.Item>
            <Descriptions.Item label="VTS SIM (MSISDN)">{selectedDevice.msisdn}</Descriptions.Item>
            <Descriptions.Item label="Client Mobile">{selectedDevice.clientMobile || '—'}</Descriptions.Item>
            <Descriptions.Item label="Client ID">{selectedDevice.clientId}</Descriptions.Item>
            <Descriptions.Item label="Engine Status">
              <Badge status={selectedDevice.engineStatus === 'on' ? 'success' : 'default'} />
              Engine {selectedDevice.engineStatus === 'on' ? 'ON' : 'OFF'}
            </Descriptions.Item>
            <Descriptions.Item label="Device Status">
              <Tag color={selectedDevice.isActive ? 'green' : 'orange'}>
                {selectedDevice.isActive ? 'Active / Tracking' : 'Parked'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Current Speed" span={2}>{selectedDevice.speed} km/h</Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════
         LIVE VEHICLE CARDS (when no vehicle selected)
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'live' && !selectedReg && (
        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          {liveAll.map(v => (
            <Col key={v.key} xs={24} sm={12} md={8} lg={4}>
              <Card size="small" hoverable onClick={() => onSelectVehicle(v.vehicle)}
                style={{ borderRadius: 10, cursor: 'pointer',
                  borderColor: STATUS_COLOR[v.status] ?? '#52c41a',
                  boxShadow: `0 0 8px ${STATUS_COLOR[v.status] ?? '#52c41a'}30`,
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text strong style={{ fontSize: 13 }}>{v.vehicle}</Text>
                  <Tag color={STATUS_TAG[v.status] ?? 'green'} style={{ margin: 0, fontSize: 10 }}>MOVING</Tag>
                </div>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{v.driver}</Text>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{v.speed} km/h · ⛽ {v.fuel}%</Text>
                <Progress percent={v.progress} size="small" strokeColor="#1677ff" showInfo={false} style={{ marginTop: 4 }} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* ── Live vehicle selected: small info strip ────────────── */}
      {activeTab === 'live' && selectedReg && currentLive && (
        <Card size="small" style={{ borderRadius: 12, marginBottom: 12, borderColor: '#52c41a' }}
          styles={{ body: { padding: '10px 16px' } }}>
          <Row gutter={16} align="middle" wrap>
            <Col><Badge status="processing" /><Text strong>{currentLive.vehicle}</Text></Col>
            <Col><Text type="secondary" style={{ fontSize: 12 }}>Driver</Text><br /><Text style={{ fontSize: 13 }}>{currentLive.driver}</Text></Col>
            <Col><Text type="secondary" style={{ fontSize: 12 }}>Speed</Text><br /><Text strong style={{ color: '#1677ff', fontSize: 16 }}>{currentLive.speed} km/h</Text></Col>
            <Col><Text type="secondary" style={{ fontSize: 12 }}>Fuel</Text><br />
              <Progress percent={currentLive.fuel} size="small"
                strokeColor={currentLive.fuel > 50 ? '#52c41a' : currentLive.fuel > 20 ? '#fa8c16' : '#ff4d4f'}
                style={{ width: 80 }} /></Col>
            <Col flex="auto"><Text type="secondary" style={{ fontSize: 12 }}>Location</Text><br />
              <Text style={{ fontSize: 12 }}>{currentLive.location}</Text></Col>
            <Col><Text type="secondary" style={{ fontSize: 12 }}>Route Progress</Text><br />
              <Progress percent={currentLive.progress} size="small" strokeColor="#1677ff" style={{ width: 120 }} /></Col>
          </Row>
        </Card>
      )}

      {/* ── All-vehicle table (live, no selection) ──────────────── */}
      {activeTab === 'live' && !selectedReg && (
        <Card size="small" style={{ borderRadius: 12 }}
          title={<Text strong>Live Vehicle List</Text>}
          styles={{ body: { padding: 0 } }}>
          <Table
            dataSource={liveAll} rowKey="key" size="small" pagination={false}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: 'No active trips — set a dispatch to "In Progress" to track here' }}
            onRow={r => ({ onClick: () => onSelectVehicle(r.vehicle), style: { cursor: 'pointer' } })}
            columns={[
              { title: 'Vehicle',   dataIndex: 'vehicle',   render: v => <Text strong style={{ color: '#1677ff' }}>{v}</Text> },
              { title: 'Driver',    dataIndex: 'driver' },
              { title: 'Speed',     dataIndex: 'speed',     render: v => `${v} km/h` },
              { title: 'Fuel',      dataIndex: 'fuel',      render: v => {
                const c = v > 50 ? '#52c41a' : v > 20 ? '#fa8c16' : '#ff4d4f';
                return <span style={{ color: c, fontWeight: 600 }}>{v}%</span>;
              }},
              { title: 'Route',     dataIndex: 'route',     ellipsis: true },
              { title: 'Progress',  dataIndex: 'progress',  render: v => <Progress percent={v} size="small" strokeColor="#1677ff" style={{ width: 80 }} /> },
              { title: 'Location',  dataIndex: 'location',  ellipsis: true },
              { title: 'Updated',   dataIndex: 'lastUpdate' },
              { title: 'Track',     render: (_, r) =>
                <Button type="link" size="small" onClick={() => onSelectVehicle(r.vehicle)}>Track →</Button> },
            ]}
          />
        </Card>
      )}
    </div>
  );
}
