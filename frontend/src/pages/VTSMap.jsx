import {
  CarOutlined, CloseOutlined, EnvironmentOutlined,
  HistoryOutlined, MobileOutlined, PauseOutlined,
  PlayCircleOutlined, ReloadOutlined, SearchOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Badge, Button, Card, Col, DatePicker, Descriptions,
  Progress, Row, Select, Segmented, Spin, Table, Tag, Typography,
} from 'antd';
import dayjs from 'dayjs';
import L from 'leaflet';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import PageHeader from '../components/PageHeader';
import { vtsService } from '../services/vtsService';

const { Text } = Typography;

/* ── Leaflet default icon fix ───────────────────────────────────── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/* ── Solid vehicle icon: filled disc + top-down car silhouette ─── */
function makeVehicleIcon(color = '#52c41a', selected = false) {
  const sz = selected ? 38 : 32;
  const half = sz / 2;
  const pulse = selected
    ? `<div style="position:absolute;inset:-7px;border-radius:50%;border:3px solid ${color};
         opacity:.55;animation:vtsPulse 1.3s ease-out infinite;pointer-events:none"></div>`
    : '';
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${sz}px;height:${sz}px">
      ${pulse}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"
           width="${sz}" height="${sz}"
           style="filter:drop-shadow(0 2px 7px rgba(0,0,0,.6));display:block">
        <!-- Solid disc background -->
        <circle cx="16" cy="16" r="15" fill="${color}" stroke="rgba(255,255,255,0.92)" stroke-width="2"/>
        <!-- White car body (top-down silhouette) -->
        <path fill="white" d="M21.5 7.5 Q23 7.5 23.5 9.5 L24.5 15 L24.5 22.5
          Q24.5 24.5 22.5 24.5 L9.5 24.5 Q7.5 24.5 7.5 22.5 L7.5 15
          L8.5 9.5 Q9 7.5 10.5 7.5 Z"/>
        <!-- Windshield (glass slot at front) -->
        <rect fill="${color}" opacity="0.5" x="10" y="10.5" width="12" height="4" rx="1.5"/>
        <!-- Rear window -->
        <rect fill="${color}" opacity="0.5" x="10" y="20.5" width="12" height="3" rx="1.5"/>
      </svg>
    </div>`,
    iconSize:    [sz, sz],
    iconAnchor:  [half, half],
    popupAnchor: [0, -(half + 4)],
  });
}

/* ── Tile layers ────────────────────────────────────────────────── */
const TILES = {
  osm:       { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors', label: 'Street' },
  google:    { url: 'https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}', attribution: '&copy; Google Maps', label: 'Google' },
  satellite: { url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', attribution: '&copy; Google Maps', label: 'Satellite' },
};

const VEH_COLOR = { moving: '#52c41a', parked: '#1677ff', idle: '#fa8c16' };

/* ── Map helpers ────────────────────────────────────────────────── */
function FlyTo({ lat, lng, zoom = 13 }) {
  const map = useMap();
  useEffect(() => { if (lat && lng) map.flyTo([lat, lng], zoom, { duration: 0.9 }); }, [lat, lng]); // eslint-disable-line
  return null;
}
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points?.length > 1)
      map.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng])), { padding: [40, 40] });
  }, [points]); // eslint-disable-line
  return null;
}
function ResizeHandler({ trigger }) {
  const map = useMap();
  useEffect(() => { const t = setTimeout(() => map.invalidateSize(), 80); return () => clearTimeout(t); }, [trigger]); // eslint-disable-line
  return null;
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
export default function VTSMap() {
  const [devices,       setDevices]       = useState([]);
  const [liveAll,       setLiveAll]       = useState([]);
  const [selectedReg,   setSelectedReg]   = useState(null);
  const [liveOne,       setLiveOne]       = useState(null);
  const [activeTab,     setActiveTab]     = useState('live');
  const [mapLayer,      setMapLayer]      = useState('osm');
  const [autoRefresh,   setAutoRefresh]   = useState(true);
  const [intervalSec]                     = useState(10);
  const [loading,       setLoading]       = useState(true);

  // History
  const [histPeriod,    setHistPeriod]    = useState('today');
  const [histDate,      setHistDate]      = useState(null);
  const [histFrom,      setHistFrom]      = useState(null);
  const [histTo,        setHistTo]        = useState(null);
  const [histData,      setHistData]      = useState(null);
  const [histLoading,   setHistLoading]   = useState(false);
  const [playIdx,       setPlayIdx]       = useState(0);
  const [playing,       setPlaying]       = useState(false);
  const [playSpeed,     setPlaySpeed]     = useState(200);
  const [dispMode,      setDispMode]      = useState('Markers');

  const timerRef   = useRef(null);
  const playRef    = useRef(null);

  /* ── load devices ────────────────────────────────────────────── */
  useEffect(() => {
    vtsService.getDevices().then(r => setDevices(r.data.data ?? [])).catch(() => {});
  }, []);

  /* ── live data ───────────────────────────────────────────────── */
  const fetchAll = useCallback(async () => {
    try { const r = await vtsService.getLive(); setLiveAll(r.data.data ?? []); } catch {}
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

  const fetchOne = useCallback(async (reg) => {
    try { const r = await vtsService.getLiveOne(reg); setLiveOne(r.data.data); } catch {}
  }, []);

  /* ── vehicle select ──────────────────────────────────────────── */
  function onSelect(reg) {
    setSelectedReg(reg);
    setActiveTab('live');
    setHistData(null);
    setPlaying(false);
    setPlayIdx(0);
    clearInterval(playRef.current);
    if (reg) fetchOne(reg);
    else setLiveOne(null);
  }

  /* ── history ─────────────────────────────────────────────────── */
  async function fetchHistory() {
    if (!selectedReg) return;
    setHistLoading(true);
    setPlaying(false);
    setPlayIdx(0);
    clearInterval(playRef.current);
    try {
      const p = { period: histPeriod };
      if (histPeriod === 'specific' && histDate) p.date = histDate.format('YYYY-MM-DD');
      if (histPeriod === 'range') {
        if (histFrom) p.from = histFrom.format('YYYY-MM-DD');
        if (histTo)   p.to   = histTo.format('YYYY-MM-DD');
      }
      const r = await vtsService.getHistory(selectedReg, p);
      setHistData(r.data.data);
    } catch {}
    finally { setHistLoading(false); }
  }

  /* ── playback ────────────────────────────────────────────────── */
  function togglePlay() {
    const pts = histData?.trackPoints ?? [];
    if (!pts.length) return;
    if (playing) { setPlaying(false); clearInterval(playRef.current); return; }
    setPlaying(true);
    if (playIdx >= pts.length - 1) setPlayIdx(0);
    playRef.current = setInterval(() => {
      setPlayIdx(prev => {
        if (prev >= pts.length - 1) { clearInterval(playRef.current); setPlaying(false); return prev; }
        return prev + 1;
      });
    }, playSpeed);
  }

  useEffect(() => {
    if (playing) {
      clearInterval(playRef.current);
      const pts = histData?.trackPoints ?? [];
      playRef.current = setInterval(() => {
        setPlayIdx(prev => {
          if (prev >= pts.length - 1) { clearInterval(playRef.current); setPlaying(false); return prev; }
          return prev + 1;
        });
      }, playSpeed);
    }
  }, [playSpeed]); // eslint-disable-line

  useEffect(() => () => { clearInterval(playRef.current); }, []);

  /* ── derived ─────────────────────────────────────────────────── */
  const selDev      = devices.find(d => d.vehicleReg === selectedReg);
  const liveCur     = liveOne ?? liveAll.find(v => v.vehicle === selectedReg);
  const trackPts    = histData?.trackPoints ?? [];
  const curPt       = trackPts[playIdx];
  const moving      = liveAll.filter(v => v.status === 'moving').length;
  const parked      = liveAll.filter(v => v.status === 'parked').length;
  const idle        = liveAll.filter(v => v.status === 'idle').length;
  const splitLayout = activeTab === 'history' && !!selectedReg;
  const showMap     = activeTab !== 'vehicle-info' && activeTab !== 'device-info';

  const dropdownOpts = devices.map(d => ({
    value: d.vehicleReg,
    label: (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span><CarOutlined style={{ marginRight: 6, color: '#1677ff' }} /><strong>{d.vehicleReg}</strong>{d.vehicleMake ? ` · ${d.vehicleMake}` : ''}</span>
        <span style={{ fontSize: 10, color: d.isActive ? '#52c41a' : '#fa8c16' }}>
          {d.isActive ? '● LIVE' : '○ Parked'}
        </span>
      </div>
    ),
  }));

  const searchFilter = (input, opt) => {
    const dev = devices.find(d => d.vehicleReg === opt?.value);
    if (!dev) return false;
    const q = input.toLowerCase();
    return (opt.value ?? '').toLowerCase().includes(q)
      || (dev.imei ?? '').includes(q)
      || (dev.msisdn ?? '').includes(q)
      || (dev.clientMobile ?? '').includes(q)
      || (dev.clientId ?? '').toLowerCase().includes(q);
  };

  /* ── overlay: history filter on top of map ───────────────────── */
  const histFilterOverlay = splitLayout && (
    <div style={{
      position: 'absolute', top: 10, left: 50, zIndex: 1000,
      display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'nowrap',
      background: 'rgba(0,0,0,.7)', borderRadius: 8, padding: '5px 8px',
    }}>
      <Select value={histPeriod} onChange={setHistPeriod} size="small"
        style={{ width: 150 }} className="map-layer-switcher"
        options={[
          { value: 'today',    label: 'Today' },
          { value: 'last4h',   label: 'Last 4 Hours' },
          { value: 'last6h',   label: 'Last 6 Hours' },
          { value: 'last12h',  label: 'Last 12 Hours' },
          { value: 'last24h',  label: 'Last 24 Hours' },
          { value: 'specific', label: 'Specific Date' },
          { value: 'range',    label: 'Date Range (7d)' },
        ]}
      />
      {histPeriod === 'specific' && (
        <DatePicker size="small" value={histDate} onChange={setHistDate}
          style={{ width: 115 }} className="map-layer-switcher" />
      )}
      {histPeriod === 'range' && (<>
        <DatePicker size="small" value={histFrom} onChange={setHistFrom}
          placeholder="From" style={{ width: 108 }} className="map-layer-switcher"
          disabledDate={d => d && d.isAfter(dayjs())} />
        <DatePicker size="small" value={histTo} onChange={setHistTo}
          placeholder="To" style={{ width: 108 }} className="map-layer-switcher"
          disabledDate={d => {
            if (!d || d.isAfter(dayjs())) return true;
            return histFrom ? d.diff(histFrom, 'day') > 7 : false;
          }} />
      </>)}
      <Button size="small" type="primary" loading={histLoading} icon={<HistoryOutlined />}
        onClick={fetchHistory} style={{ borderRadius: 6, flexShrink: 0 }}>
        Show History
      </Button>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div>
      {/* ── Page header ──────────────────────────────────────── */}
      <PageHeader
        icon={<EnvironmentOutlined />} color="#eb2f96"
        title="VTS Map" subtitle="Live vehicle tracking and trip history"
        stats={[
          { label: 'Moving', value: moving, color: '#52c41a' },
          { label: 'Parked', value: parked, color: '#1677ff' },
          { label: 'Idle',   value: idle,   color: '#fa8c16' },
        ]}
      />

      {/* ── Search bar ───────────────────────────────────────── */}
      <Card size="small" style={{ borderRadius: 12, marginBottom: 8 }}
        styles={{ body: { padding: '10px 14px' } }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <SearchOutlined style={{ color: '#8c9ab0', fontSize: 16, flexShrink: 0 }} />
          <Select showSearch allowClear
            placeholder="Search by Reg No / IMEI / SIM (MSISDN) / Client Mobile / Client ID"
            style={{ flex: 1 }} options={dropdownOpts} filterOption={searchFilter}
            value={selectedReg} onChange={onSelect} size="large" optionLabelProp="value"
            notFoundContent={<Text type="secondary">No GPS-equipped vehicles found</Text>}
          />
        </div>
      </Card>

      {/* ── Selected vehicle bar + tabs ──────────────────────── */}
      {selectedReg && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#fff', borderRadius: 10, padding: '5px 10px 5px 14px',
          marginBottom: 8, boxShadow: '0 1px 4px rgba(0,0,0,.08)', border: '1px solid #f0f0f0',
        }}>
          {/* Left: vehicle + engine + speed */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CarOutlined style={{ color: '#52c41a', fontSize: 15 }} />
            <Text strong style={{ fontSize: 13 }}>{selectedReg}</Text>
            <Badge status="processing" />
            <Text style={{ color: '#52c41a', fontSize: 12 }}>Engine ON</Text>
            <Text style={{ color: '#bbb', fontSize: 12 }}>•</Text>
            <Text strong style={{ fontSize: 13 }}>
              {liveCur?.speed ?? selDev?.speed ?? 0} km/h
            </Text>
          </div>
          {/* Right: tabs + close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {[
              { key: 'live',         icon: <ThunderboltOutlined />, label: 'Live Tracking' },
              { key: 'history',      icon: <HistoryOutlined />,      label: 'History' },
              { key: 'vehicle-info', icon: <CarOutlined />,          label: 'Vehicle Info' },
              { key: 'device-info',  icon: <MobileOutlined />,       label: 'Device Info' },
            ].map(t => (
              <Button key={t.key}
                type={activeTab === t.key ? 'primary' : 'text'}
                icon={t.icon} size="small"
                onClick={() => setActiveTab(t.key)}
                style={{ borderRadius: 16, fontSize: 12, height: 28, paddingInline: 10 }}>
                {t.label}
              </Button>
            ))}
            <Button size="small" type="text" icon={<CloseOutlined />}
              onClick={() => onSelect(null)}
              style={{ marginLeft: 4, color: '#bbb', fontSize: 12 }} />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
         MAP AREA
      ══════════════════════════════════════════════════════ */}
      {showMap && (
        <Spin spinning={loading && activeTab === 'live'}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-start' }}>

            {/* ── Map column ────────────────────────────────── */}
            <div style={{
              flex: 1, minWidth: 0, position: 'relative',
              borderRadius: 12, overflow: 'hidden',
              boxShadow: '0 2px 10px rgba(0,0,0,.12)',
            }}>
              {/* Live badge */}
              {activeTab === 'live' && (
                <div style={{
                  position: 'absolute', top: 10, left: 50, zIndex: 1000, pointerEvents: 'none',
                  background: 'rgba(0,0,0,.65)', borderRadius: 8, padding: '4px 10px',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Badge status="processing" />
                  <Text style={{ color: '#52c41a', fontSize: 12 }}>
                    Live · {selectedReg ? '1 vehicle' : `${liveAll.length} vehicles`}
                  </Text>
                </div>
              )}

              {/* History filter overlay (top-left of map) */}
              {histFilterOverlay}

              {/* Layer switcher (top-right) */}
              <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}>
                <Segmented size="small" value={mapLayer} onChange={setMapLayer}
                  options={Object.entries(TILES).map(([k, v]) => ({ value: k, label: v.label }))}
                  style={{ background: 'rgba(0,0,0,.6)', borderRadius: 8, padding: 2 }}
                  className="map-layer-switcher"
                />
              </div>

              {/* Auto-refresh (live, bottom-right) */}
              {activeTab === 'live' && (
                <div style={{
                  position: 'absolute', bottom: 30, right: 10, zIndex: 1000,
                  background: 'rgba(0,0,0,.6)', borderRadius: 8, padding: '5px 8px',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Text style={{ color: '#8c9ab0', fontSize: 11 }}>Auto</Text>
                  <Button size="small" type="text"
                    icon={autoRefresh ? <PauseOutlined style={{ color: '#52c41a' }} /> : <PlayCircleOutlined style={{ color: '#8c9ab0' }} />}
                    onClick={() => setAutoRefresh(v => !v)} style={{ padding: 0 }} />
                  <Text style={{ color: '#8c9ab0', fontSize: 11 }}>{intervalSec}s</Text>
                  <Button size="small" type="text"
                    icon={<ReloadOutlined style={{ color: '#8c9ab0', fontSize: 12 }} />}
                    onClick={() => { fetchAll(); if (selectedReg) fetchOne(selectedReg); }}
                    style={{ padding: 0 }} />
                </div>
              )}

              {/* History stats bar (bottom of map) */}
              {activeTab === 'history' && histData && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000,
                  background: 'rgba(0,0,0,.62)', padding: '5px 14px',
                  display: 'flex', gap: 28, alignItems: 'center',
                }}>
                  <Text style={{ color: '#aaa', fontSize: 11 }}>TOTAL</Text>
                  <Text strong style={{ color: '#52c41a', fontSize: 13 }}>{histData.totalKm} km</Text>
                  <Text style={{ color: '#aaa', fontSize: 11 }}>TRAVELED</Text>
                  <Text strong style={{ color: '#1677ff', fontSize: 13 }}>{histData.traveledKm} km</Text>
                  <Text style={{ color: '#666', fontSize: 11 }}>{trackPts.length} pts</Text>
                </div>
              )}

              <MapContainer center={[23.8, 90.4]} zoom={7}
                style={{ height: 560, width: '100%' }} scrollWheelZoom>
                <TileLayer key={mapLayer} url={TILES[mapLayer].url} attribution={TILES[mapLayer].attribution} />
                <ResizeHandler trigger={splitLayout} />

                {activeTab === 'live' && liveCur && <FlyTo lat={liveCur.lat} lng={liveCur.lng} zoom={13} />}
                {activeTab === 'history' && trackPts.length > 1 && !curPt && <FitBounds points={trackPts} />}
                {activeTab === 'history' && curPt && <FlyTo lat={curPt.lat} lng={curPt.lng} zoom={14} />}

                {/* Live: selected vehicle — trail + car icon */}
                {activeTab === 'live' && selectedReg && liveCur && (<>
                  {liveCur.trail?.length > 1 && (
                    <Polyline positions={liveCur.trail}
                      pathOptions={{ color: '#52c41a', weight: 4, opacity: 0.65, dashArray: '8 5' }} />
                  )}
                  <Marker position={[liveCur.lat, liveCur.lng]} icon={makeVehicleIcon('#52c41a', true)}>
                    <Popup>
                      <div style={{ minWidth: 210 }}>
                        <div style={{ background: '#1677ff', color: '#fff', padding: '5px 10px', margin: '-8px -12px 8px', borderRadius: '4px 4px 0 0', fontSize: 12 }}>
                          <strong>VEHICLE</strong> {liveCur.vehicle}
                          <Tag color="success" style={{ marginLeft: 8, fontSize: 10 }}>Running</Tag>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1677ff', marginBottom: 4 }}>
                          {liveCur.speed} km/h
                          <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>Limit: 100 km/h</Text>
                        </div>
                        <div style={{ fontSize: 11, color: '#888' }}>📍 {liveCur.location}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>⛽ {liveCur.fuel}%  ·  Heading: {liveCur.heading}</div>
                        <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{liveCur.lat}, {liveCur.lng}</div>
                        <Progress percent={liveCur.progress} size="small" strokeColor="#1677ff" style={{ marginTop: 6 }} />
                      </div>
                    </Popup>
                  </Marker>
                </>)}

                {/* Live: all vehicles — trails + car icons */}
                {activeTab === 'live' && !selectedReg && (<>
                  {liveAll.filter(v => v.trail?.length > 1).map(v => (
                    <Polyline key={`trail-${v.key}`} positions={v.trail}
                      pathOptions={{ color: VEH_COLOR[v.status] ?? '#52c41a', weight: 3, opacity: 0.55, dashArray: '7 5' }} />
                  ))}
                  {liveAll.map(v => (
                    <Marker key={v.key} position={[v.lat, v.lng]}
                      icon={makeVehicleIcon(VEH_COLOR[v.status] ?? '#52c41a', false)}>
                      <Popup>
                        <div style={{ minWidth: 190 }}>
                          <div style={{ background: '#1677ff', color: '#fff', padding: '5px 10px', margin: '-8px -12px 8px', borderRadius: '4px 4px 0 0', fontSize: 12 }}>
                            <strong>{v.vehicle}</strong>
                            <Tag color="success" style={{ marginLeft: 8, fontSize: 10 }}>Running</Tag>
                          </div>
                          <div style={{ fontSize: 11 }}>👤 {v.driver}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1677ff' }}>{v.speed} km/h</div>
                          <div style={{ fontSize: 11, color: '#888' }}>📍 {v.location}</div>
                          <div style={{ fontSize: 11, color: '#888' }}>🗺 {v.route}</div>
                          <div style={{ fontSize: 11, color: '#888' }}>⛽ {v.fuel}%</div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </>)}

                {/* History: route polyline + markers */}
                {activeTab === 'history' && trackPts.length > 0 && (<>
                  <Polyline positions={trackPts.map(p => [p.lat, p.lng])}
                    pathOptions={{ color: '#1677ff', weight: 3, opacity: 0.75 }} />
                  {trackPts.map((p, i) => (
                    <CircleMarker key={i} center={[p.lat, p.lng]}
                      radius={i === playIdx ? 9 : (dispMode === 'Dots' ? 2 : 4)}
                      pathOptions={{
                        color:       i === playIdx ? '#ff4d4f' : (p.engineStatus === 'running' ? '#52c41a' : '#fa8c16'),
                        fillColor:   i === playIdx ? '#ff4d4f' : '#1677ff',
                        fillOpacity: 1, weight: i === playIdx ? 3 : 1,
                      }}>
                      <Popup>
                        <div style={{ minWidth: 210 }}>
                          <div style={{ background: '#1677ff', color: '#fff', padding: '5px 10px', margin: '-8px -12px 8px', borderRadius: '4px 4px 0 0' }}>
                            <div style={{ fontSize: 11, fontWeight: 700 }}>VEHICLE</div>
                            <div style={{ fontSize: 10, opacity: 0.85 }}>{p.timestamp}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                            <Tag color={p.engineStatus === 'running' ? 'green' : 'orange'} style={{ margin: 0 }}>
                              {p.engineStatus === 'running' ? 'Running' : 'Stopped'}
                            </Tag>
                            <Text strong style={{ color: '#1677ff', fontSize: 16 }}>{p.speed}</Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>km/h</Text>
                          </div>
                          <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>📍 {p.lat}, {p.lng}</div>
                          <div style={{ fontSize: 12 }}>{p.location}</div>
                          <div style={{ marginTop: 6, fontSize: 11, color: '#888' }}>
                            TRAVELED <strong>{histData?.traveledKm ?? 0} km</strong>
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </>)}
              </MapContainer>
            </div>

            {/* ── History right panel ───────────────────────── */}
            {splitLayout && (
              <div style={{
                flex: '0 0 340px', display: 'flex', flexDirection: 'column',
                height: 560, background: '#fff', borderRadius: 12,
                border: '1px solid #e8e8e8', overflow: 'hidden',
                boxShadow: '0 2px 10px rgba(0,0,0,.1)',
              }}>
                {/* Header */}
                <div style={{
                  background: 'linear-gradient(135deg,#1677ff,#0050b3)',
                  padding: '10px 14px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <Text style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
                    <HistoryOutlined style={{ marginRight: 6 }} />Trip History
                  </Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Text style={{ color: 'rgba(255,255,255,.8)', fontSize: 12 }}>
                      {histData?.totalKm ?? 0} km · {trackPts.length} pts
                    </Text>
                    {trackPts.length > 0 && (
                      <Tag style={{ background: 'rgba(255,255,255,.18)', color: '#fff', borderColor: 'transparent', fontSize: 10 }}>
                        {selectedReg}
                      </Tag>
                    )}
                  </div>
                </div>

                {/* Display mode toggle */}
                <div style={{ padding: '6px 12px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
                  <Segmented size="small" value={dispMode} onChange={setDispMode}
                    options={['Markers', 'Dots', 'Icons']} />
                </div>

                {/* Point list */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {histLoading && (
                    <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
                  )}
                  {!histLoading && trackPts.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '36px 16px', color: '#8c9ab0' }}>
                      <HistoryOutlined style={{ fontSize: 38, display: 'block', marginBottom: 10, opacity: 0.4 }} />
                      <div style={{ fontSize: 13, marginBottom: 6, fontWeight: 600 }}>No history data</div>
                      <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                        Select a period from the filter<br />on the map and click <strong>Show History</strong>
                      </div>
                    </div>
                  )}
                  {trackPts.map((p, i) => (
                    <div key={i} onClick={() => setPlayIdx(i)}
                      onMouseEnter={e => { if (i !== playIdx) e.currentTarget.style.background = '#f7f7f7'; }}
                      onMouseLeave={e => { if (i !== playIdx) e.currentTarget.style.background = 'transparent'; }}
                      style={{
                        padding: '7px 12px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer',
                        background: i === playIdx ? '#e6f4ff' : 'transparent',
                        borderLeft: `3px solid ${i === playIdx ? '#1677ff' : 'transparent'}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        transition: 'background .1s',
                      }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#222' }}>{p.timestamp}</div>
                        <div style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>
                          {p.lat.toFixed(8)}, {p.lng.toFixed(8)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1677ff', lineHeight: 1.2 }}>{p.speed}</div>
                        <div style={{ fontSize: 10, color: '#888' }}>km/h #{i + 1}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Playback controls */}
                <div style={{
                  padding: '7px 10px', borderTop: '1px solid #eee',
                  display: 'flex', alignItems: 'center', gap: 6, background: '#fafafa',
                }}>
                  <Button type="primary" shape="circle" size="small"
                    icon={playing ? <PauseOutlined /> : <PlayCircleOutlined />}
                    onClick={togglePlay} disabled={trackPts.length === 0} />
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: playing ? '#1677ff' : '#ddd' }} />
                  <Text style={{ fontSize: 12, color: '#555' }}>
                    {trackPts.length > 0 ? `${playIdx + 1} / ${trackPts.length}` : '—'}
                  </Text>
                  <div style={{ flex: 1 }} />
                  <Select size="small" value={playSpeed} onChange={setPlaySpeed} style={{ width: 96 }}
                    options={[
                      { value: 500, label: '0.5x Speed' },
                      { value: 200, label: '1x Speed' },
                      { value: 100, label: '2x Speed' },
                      { value: 50,  label: '4x Speed' },
                    ]}
                  />
                  <Button size="small" type="text"
                    onClick={() => { setPlayIdx(0); setPlaying(false); clearInterval(playRef.current); }}>
                    ↺
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Spin>
      )}

      {/* ══════════════════════════════════════════════════════
         VEHICLE INFO
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'vehicle-info' && selectedReg && (
        <Card style={{ borderRadius: 12, marginBottom: 12 }}
          title={<><CarOutlined style={{ marginRight: 6 }} />Vehicle Information — {selectedReg}</>}>
          <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
            <Descriptions.Item label="Registration">{selectedReg}</Descriptions.Item>
            <Descriptions.Item label="Make / Model">{liveCur?.vehicleMake || selDev?.vehicleMake || '—'}</Descriptions.Item>
            <Descriptions.Item label="Type">{liveCur?.vehicleType || selDev?.vehicleType || '—'}</Descriptions.Item>
            <Descriptions.Item label="Engine Status">
              <Tag color={selDev?.engineStatus === 'on' ? 'green' : 'default'}>
                Engine {selDev?.engineStatus === 'on' ? 'ON' : 'OFF'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Current Speed">{liveCur ? `${liveCur.speed} km/h` : '—'}</Descriptions.Item>
            <Descriptions.Item label="Heading">{liveCur?.heading || '—'}</Descriptions.Item>
            <Descriptions.Item label="Current Location" span={2}>{liveCur?.location || '—'}</Descriptions.Item>
            <Descriptions.Item label="Active Route" span={2}>{liveCur?.route || 'Not on a trip'}</Descriptions.Item>
            <Descriptions.Item label="Trip Progress">
              {liveCur ? <Progress percent={liveCur.progress} size="small" strokeColor="#1677ff" style={{ maxWidth: 200 }} /> : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Distance">{liveCur ? `${liveCur.elapsedKm} / ${liveCur.distance} km` : '—'}</Descriptions.Item>
            <Descriptions.Item label="Fuel">
              {liveCur
                ? <Progress percent={liveCur.fuel} size="small"
                    strokeColor={liveCur.fuel > 50 ? '#52c41a' : liveCur.fuel > 20 ? '#fa8c16' : '#ff4d4f'}
                    style={{ maxWidth: 200 }} />
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Engine Temp">
              <Tag color={liveCur?.temp === 'High' ? 'red' : 'green'}>{liveCur?.temp || 'Normal'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Driver" span={2}>{liveCur?.driver || '—'}</Descriptions.Item>
            <Descriptions.Item label="Purpose" span={2}>{liveCur?.purpose || '—'}</Descriptions.Item>
            <Descriptions.Item label="Dispatch No">{liveCur?.dispatchNo || '—'}</Descriptions.Item>
            <Descriptions.Item label="Approved By">{liveCur?.approvedBy || '—'}</Descriptions.Item>
            <Descriptions.Item label="Coordinates" span={2}>
              {liveCur ? `${liveCur.lat}°N, ${liveCur.lng}°E` : '—'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════
         DEVICE INFO
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'device-info' && selectedReg && selDev && (
        <Card style={{ borderRadius: 12, marginBottom: 12 }}
          title={<><MobileOutlined style={{ marginRight: 6 }} />GPS Device Info — {selectedReg}</>}>
          <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
            <Descriptions.Item label="Vehicle Reg">{selDev.vehicleReg}</Descriptions.Item>
            <Descriptions.Item label="Device Model">{selDev.deviceModel}</Descriptions.Item>
            <Descriptions.Item label="IMEI">{selDev.imei}</Descriptions.Item>
            <Descriptions.Item label="VTS SIM (MSISDN)">{selDev.msisdn}</Descriptions.Item>
            <Descriptions.Item label="Client Mobile">{selDev.clientMobile || '—'}</Descriptions.Item>
            <Descriptions.Item label="Client ID">{selDev.clientId}</Descriptions.Item>
            <Descriptions.Item label="Engine">
              <Badge status={selDev.engineStatus === 'on' ? 'success' : 'default'} />
              Engine {selDev.engineStatus === 'on' ? 'ON' : 'OFF'}
            </Descriptions.Item>
            <Descriptions.Item label="Tracking">
              <Tag color={selDev.isActive ? 'green' : 'orange'}>
                {selDev.isActive ? 'Active / Tracking' : 'Parked'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Speed" span={2}>{selDev.speed} km/h</Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════
         LIVE: vehicle cards + info strip + table
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'live' && !selectedReg && (
        <Row gutter={[10, 10]} style={{ marginBottom: 12 }}>
          {liveAll.map(v => (
            <Col key={v.key} xs={24} sm={12} md={8} lg={6} xl={4}>
              <Card size="small" hoverable onClick={() => onSelect(v.vehicle)}
                style={{ borderRadius: 10, cursor: 'pointer',
                  borderColor: VEH_COLOR[v.status] ?? '#52c41a',
                  boxShadow: `0 0 8px ${VEH_COLOR[v.status] ?? '#52c41a'}25`,
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <Text strong style={{ fontSize: 13 }}>{v.vehicle}</Text>
                  <Tag color="green" style={{ margin: 0, fontSize: 10 }}>MOVING</Tag>
                </div>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{v.driver}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>{v.speed} km/h · ⛽ {v.fuel}%</Text>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {activeTab === 'live' && selectedReg && liveCur && (
        <Card size="small" style={{ borderRadius: 12, marginBottom: 12, borderColor: '#52c41a' }}
          styles={{ body: { padding: '10px 16px' } }}>
          <Row gutter={16} align="middle" wrap>
            <Col><Badge status="processing" /><Text strong>{liveCur.vehicle}</Text></Col>
            <Col><Text type="secondary" style={{ fontSize: 11 }}>Driver</Text><br /><Text style={{ fontSize: 13 }}>{liveCur.driver}</Text></Col>
            <Col><Text type="secondary" style={{ fontSize: 11 }}>Speed</Text><br /><Text strong style={{ color: '#1677ff', fontSize: 16 }}>{liveCur.speed} km/h</Text></Col>
            <Col><Text type="secondary" style={{ fontSize: 11 }}>Fuel</Text><br />
              <Progress percent={liveCur.fuel} size="small"
                strokeColor={liveCur.fuel > 50 ? '#52c41a' : liveCur.fuel > 20 ? '#fa8c16' : '#ff4d4f'}
                style={{ width: 80 }} /></Col>
            <Col flex="auto"><Text type="secondary" style={{ fontSize: 11 }}>Location</Text><br />
              <Text style={{ fontSize: 12 }}>{liveCur.location}</Text></Col>
            <Col><Text type="secondary" style={{ fontSize: 11 }}>Progress</Text><br />
              <Progress percent={liveCur.progress} size="small" strokeColor="#1677ff" style={{ width: 110 }} /></Col>
          </Row>
        </Card>
      )}

      {activeTab === 'live' && !selectedReg && (
        <Card size="small" style={{ borderRadius: 12 }}
          title={<Text strong>Live Vehicle List</Text>} styles={{ body: { padding: 0 } }}>
          <Table dataSource={liveAll} rowKey="key" size="small" pagination={false}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: 'No active trips — run vts_live_demo.sql to populate live vehicles' }}
            onRow={r => ({ onClick: () => onSelect(r.vehicle), style: { cursor: 'pointer' } })}
            columns={[
              { title: 'Vehicle',  dataIndex: 'vehicle',  render: v => <Text strong style={{ color: '#1677ff' }}>{v}</Text> },
              { title: 'Driver',   dataIndex: 'driver' },
              { title: 'Speed',    dataIndex: 'speed',    render: v => `${v} km/h` },
              { title: 'Fuel',     dataIndex: 'fuel',     render: v => <span style={{ color: v > 50 ? '#52c41a' : v > 20 ? '#fa8c16' : '#ff4d4f', fontWeight: 600 }}>{v}%</span> },
              { title: 'Route',    dataIndex: 'route',    ellipsis: true },
              { title: 'Progress', dataIndex: 'progress', render: v => `${v}%` },
              { title: 'Location', dataIndex: 'location', ellipsis: true },
              { title: '',         render: (_, r) => <Button type="link" size="small" onClick={e => { e.stopPropagation(); onSelect(r.vehicle); }}>Track →</Button> },
            ]}
          />
        </Card>
      )}
    </div>
  );
}
