import {
  AimOutlined, CarOutlined, CloseOutlined, CopyOutlined,
  DashboardOutlined, EnvironmentOutlined, HistoryOutlined,
  MobileOutlined, PauseOutlined, PlayCircleOutlined,
  ReloadOutlined, SearchOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { Button, DatePicker, Input, Progress, Select, Segmented, Spin, Tag, Typography, message } from 'antd';
import dayjs from 'dayjs';
import L from 'leaflet';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { vtsService } from '../services/vtsService';
import { makeMapMarker } from '../utils/vehicleIcons';

const { Text } = Typography;

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/* ── Bearing from last 2 trail points ───────────────────────────── */
function trailBearing(trail) {
  if (!trail || trail.length < 2) return 0;
  const n = trail.length;
  return calcBearing(trail[n - 2][0], trail[n - 2][1], trail[n - 1][0], trail[n - 1][1]);
}

const TILES = {
  osm:       { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',    label: 'Street' },
  google:    { url: 'https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}',   label: 'Google' },
  satellite: { url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',   label: 'Satellite' },
  dark:      { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', label: 'Dark' },
};

const STATUS_COLOR = { moving: '#52c41a', parked: '#fa8c16', idle: '#1677ff' };

/* ── Popup card — module scope, theme-aware ──────────────────────── */
function DarkPopup({ v, onCopy, dark = true }) {
  const [copied, setCopied] = useState(false);
  const [now, setNow]       = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  function handleCopy() {
    onCopy?.(v?.lat, v?.lng);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const speed  = typeof v?.speed === 'number' ? Math.round(v.speed) : (v?.speed ?? '0');
  const status = v?.status ?? 'moving';
  const statusColor = { moving: '#52c41a', running: '#52c41a', parked: '#fa8c16', idle: '#1677ff' }[status] ?? '#52c41a';
  const statusLabel = { moving: 'Running', running: 'Running', parked: 'Parked', idle: 'Idle' }[status] ?? 'Running';

  const textPri = dark ? '#e6edf3' : '#1f2937';
  const textSec = dark ? '#8b949e' : '#6b7280';
  const bg      = dark ? '#0d1117' : '#ffffff';
  const divLine = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';

  const latStr = typeof v?.lat === 'number' ? v.lat : (v?.lat ?? '—');
  const lngStr = typeof v?.lng === 'number' ? v.lng : (v?.lng ?? '—');

  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const timestamp = `${dd}-${mm}-${yyyy} ${timeStr}`;

  return (
    <div style={{ minWidth: 460, fontFamily: 'system-ui,-apple-system,sans-serif', color: textPri, background: bg, borderRadius: 14 }}>

      {/* Header */}
      <div style={{
        padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: `1px solid ${divLine}`, gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', minWidth: 0 }}>
          <span style={{ fontSize: 10, color: '#1677ff', fontWeight: 700, letterSpacing: '0.12em', flexShrink: 0 }}>VEHICLE</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: textPri, flexShrink: 0 }}>{v?.vehicle}</span>
          <span style={{ fontSize: 11, color: textSec, whiteSpace: 'nowrap' }}>({timestamp})</span>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
          background: `${statusColor}18`, border: `1px solid ${statusColor}50`,
          borderRadius: 20, padding: '3px 10px',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%', background: statusColor,
            animation: (status === 'moving' || status === 'running') ? 'vtsPulse 1.5s ease-out infinite' : 'none',
          }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: statusColor }}>{statusLabel}</span>
        </div>
      </div>

      {/* Body: Speed (left) + Position & Location (right) */}
      <div style={{ display: 'flex' }}>

        {/* Speed column */}
        <div style={{
          padding: '14px 16px', width: 120, flexShrink: 0, textAlign: 'center',
          borderRight: `1px solid ${divLine}`,
          background: `linear-gradient(180deg,${statusColor}12 0%,transparent 100%)`,
        }}>
          <div style={{ fontSize: 9, color: statusColor, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>SPEED</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: statusColor, lineHeight: 1 }}>{speed}</div>
          <div style={{ fontSize: 11, color: textSec, marginTop: 2 }}>km/h</div>
          <div style={{ fontSize: 10, color: textSec, marginTop: 8 }}>
            Limit: <span style={{ color: '#ff4d4f', fontWeight: 700 }}>100.0 km/h</span>
          </div>
        </div>

        {/* Position + Location column */}
        <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
          {/* POSITION row */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: 9, color: textSec, fontWeight: 700, letterSpacing: '0.08em' }}>POSITION</div>
              <button onClick={handleCopy} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px',
                color: copied ? '#52c41a' : '#58a6ff', fontSize: 14, lineHeight: 1,
                display: 'flex', alignItems: 'center',
              }} title="Copy coordinates">
                {copied ? '✓' : '⧉'}
              </button>
            </div>
            <div style={{ fontSize: 12, color: textPri, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
              {latStr}, {lngStr}
            </div>
          </div>

          {/* LOCATION row */}
          {v?.location && (
            <div>
              <div style={{ fontSize: 9, color: textSec, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>LOCATION</div>
              <div style={{ fontSize: 12, color: textPri, lineHeight: 1.5 }}>{v.location}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FlyTo({ lat, lng, zoom = 14 }) {
  const map = useMap();
  useEffect(() => { if (lat && lng) map.flyTo([lat, lng], zoom, { duration: 1 }); }, [lat, lng]); // eslint-disable-line
  return null;
}
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points?.length > 1) map.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng])), { padding: [50, 50] });
  }, [points]); // eslint-disable-line
  return null;
}
function ResizeHandler({ trigger }) {
  const map = useMap();
  useEffect(() => { const t = setTimeout(() => map.invalidateSize(), 100); return () => clearTimeout(t); }, [trigger]); // eslint-disable-line
  return null;
}

/* ── History point popup — module scope to avoid reconciler crash ── */
function HistoryPointPopup({ p, i, dark = true }) {
  const textPri  = dark ? '#e6edf3' : '#1f2937';
  const textSec  = dark ? '#8b949e' : '#6b7280';
  const bg       = dark ? '#0d1117' : '#ffffff';
  const divLine  = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
  const engineOn = p.engineStatus === 'running';
  const engColor = engineOn ? '#52c41a' : '#fa8c16';
  const spd      = parseFloat(p.speed) || 0;
  const spdColor = spd > 80 ? '#ff4d4f' : spd > 40 ? '#fa8c16' : '#52c41a';

  return (
    <div style={{ minWidth: 300, fontFamily: 'system-ui,-apple-system,sans-serif', color: textPri, background: bg, borderRadius: 12 }}>

      {/* Header */}
      <div style={{
        padding: '10px 14px 8px', borderBottom: `1px solid ${divLine}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 9, color: '#58a6ff', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 2 }}>POINT #{i + 1}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: textPri }}>{p.timestamp}</div>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
          background: `${engColor}18`, border: `1px solid ${engColor}50`,
          borderRadius: 20, padding: '3px 8px',
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: engColor }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: engColor }}>{engineOn ? 'ENGINE ON' : 'ENGINE OFF'}</span>
        </div>
      </div>

      {/* Body: speed (left) + position & location (right) */}
      <div style={{ display: 'flex' }}>
        <div style={{
          padding: '12px 14px', width: 90, flexShrink: 0, textAlign: 'center',
          borderRight: `1px solid ${divLine}`,
          background: `linear-gradient(180deg,${spdColor}15 0%,transparent 100%)`,
        }}>
          <div style={{ fontSize: 8, color: spdColor, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 3 }}>SPEED</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: spdColor, lineHeight: 1 }}>{p.speed}</div>
          <div style={{ fontSize: 10, color: textSec, marginTop: 2 }}>km/h</div>
        </div>
        <div style={{ flex: 1, padding: '12px 14px', minWidth: 0 }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 8, color: textSec, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 3 }}>POSITION</div>
            <div style={{ fontSize: 11, color: textPri, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
              {p.lat?.toFixed(6)}, {p.lng?.toFixed(6)}
            </div>
          </div>
          {p.location && (
            <div>
              <div style={{ fontSize: 8, color: textSec, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 3 }}>LOCATION</div>
              <div style={{ fontSize: 11, color: textPri, lineHeight: 1.4 }}>{p.location}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Bearing calculation (degrees, 0 = north, clockwise) ─────────── */
function calcBearing(lat1, lng1, lat2, lng2) {
  const R = Math.PI / 180;
  const dLon = (lng2 - lng1) * R;
  const φ1 = lat1 * R, φ2 = lat2 * R;
  const y = Math.sin(dLon) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

/* ── Smooth animated marker (Google-Maps-style movement) ──────────── */
function SmoothMarker({ position, heading = 0, icon, duration = 800, eventHandlers, children }) {
  const markerRef  = useRef(null);
  const animRef    = useRef(null);
  const fromPos    = useRef(null);   // null = not yet initialised
  const fromHead   = useRef(0);

  /* Rotate the icon's inner div via CSS — decoupled from Leaflet's own transform */
  function applyRotation(marker, angle) {
    const el    = marker.getElement?.();
    const inner = el?.firstElementChild; // the <div style="position:relative...">
    if (inner) inner.style.transform = `rotate(${(((angle % 360) + 360) % 360).toFixed(1)}deg)`;
  }

  /* When icon prop changes (color / type), swap icon and re-apply current heading */
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || !icon) return;
    marker.setIcon(icon);
    // Icon swap resets DOM — re-apply stored heading in next frame
    requestAnimationFrame(() => applyRotation(marker, fromHead.current));
  }, [icon]); // eslint-disable-line

  /* Animate position + heading whenever either changes */
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const [tLat, tLng] = position;

    /* First mount: just record state and set initial rotation */
    if (fromPos.current === null) {
      fromPos.current = [tLat, tLng];
      fromHead.current = heading;
      requestAnimationFrame(() => applyRotation(marker, heading));
      return;
    }

    const [fLat, fLng] = fromPos.current;
    const fh            = fromHead.current;

    fromPos.current  = [tLat, tLng];
    fromHead.current = heading;

    cancelAnimationFrame(animRef.current);

    /* No position change — just snap heading */
    if (fLat === tLat && fLng === tLng) {
      applyRotation(marker, heading);
      return;
    }

    marker.setLatLng([fLat, fLng]); // reset to start so rAF controls position
    const hDiff = ((heading - fh + 540) % 360) - 180; // shortest-arc rotation
    const start = performance.now();

    function step(ts) {
      const t = Math.min((ts - start) / duration, 1);
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; // easeInOutQuad
      marker.setLatLng([fLat + (tLat - fLat) * e, fLng + (tLng - fLng) * e]);
      applyRotation(marker, fh + hDiff * e);
      if (t < 1) animRef.current = requestAnimationFrame(step);
    }
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position[0], position[1], heading, duration]);

  return (
    <Marker ref={markerRef} position={position} icon={icon} eventHandlers={eventHandlers}>
      {children}
    </Marker>
  );
}

/* ── Popup CSS for both themes ───────────────────────────────────── */
const POPUP_CSS = `
  @keyframes vtsPulse {
    0%   { opacity: 1; transform: scale(1); }
    50%  { opacity: 0.5; transform: scale(1.5); }
    100% { opacity: 1; transform: scale(1); }
  }

  .dark-popup .leaflet-popup-content-wrapper {
    background: #0d1117; border: 1px solid rgba(255,255,255,0.12);
    border-radius: 14px; padding: 0; box-shadow: 0 10px 40px rgba(0,0,0,0.65);
  }
  .dark-popup .leaflet-popup-content { margin: 0; }
  .dark-popup .leaflet-popup-tip { background: #0d1117; }
  .dark-popup .leaflet-popup-close-button { color: rgba(255,255,255,0.5) !important; top: 6px !important; right: 6px !important; }

  .light-popup .leaflet-popup-content-wrapper {
    background: #ffffff; border: 1px solid rgba(0,0,0,0.1);
    border-radius: 14px; padding: 0; box-shadow: 0 8px 32px rgba(0,0,0,0.14);
  }
  .light-popup .leaflet-popup-content { margin: 0; }
  .light-popup .leaflet-popup-tip { background: #ffffff; }
  .light-popup .leaflet-popup-close-button { color: rgba(0,0,0,0.45) !important; top: 6px !important; right: 6px !important; }
`;

/* ── Captures map instance for external controls ─────────────────── */
function MapCapture({ onMap }) {
  const map = useMap();
  useEffect(() => { onMap(map); return () => onMap(null); }, [map, onMap]);
  return null;
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
export default function VTSMap() {
  const [devices,     setDevices]     = useState([]);
  const [liveAll,     setLiveAll]     = useState([]);
  const [selectedReg, setSelectedReg] = useState(null);
  const [liveOne,     setLiveOne]     = useState(null);
  const [activeTab,   setActiveTab]   = useState('live');
  const [mapLayer,    setMapLayer]    = useState('osm');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');

  const [histPeriod,  setHistPeriod]  = useState('today');
  const [histDate,    setHistDate]    = useState(null);
  const [histFrom,    setHistFrom]    = useState(null);
  const [histTo,      setHistTo]      = useState(null);
  const [histData,    setHistData]    = useState(null);
  const [histLoading, setHistLoading] = useState(false);
  const [playIdx,     setPlayIdx]     = useState(0);
  const [playing,     setPlaying]     = useState(false);
  const [playSpeed,   setPlaySpeed]   = useState(400);
  const [dispMode,    setDispMode]    = useState('Markers');

  const [liveBearing, setLiveBearing] = useState(0);

  const timerRef       = useRef(null);
  const playRef        = useRef(null);
  const prevLivePosRef = useRef(null);
  const livePosHistRef = useRef([]);   // rolling buffer of last 5 GPS positions

  const [leafletMap, setLeafletMap] = useState(null);

  /* inject popup CSS once */
  useEffect(() => {
    if (!document.getElementById('vts-popup-css')) {
      const s = document.createElement('style');
      s.id = 'vts-popup-css';
      s.textContent = POPUP_CSS;
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => {
    vtsService.getDevices().then(r => setDevices(r.data.data ?? [])).catch(() => {});
  }, []);

  const fetchAll = useCallback(async () => {
    try { const r = await vtsService.getLive(); setLiveAll(r.data.data ?? []); }
    catch {} finally { setLoading(false); }
  }, []);

  const fetchOne = useCallback(async (reg) => {
    try {
      const r = await vtsService.getLiveOne(reg);
      const d = r.data.data;
      if (d) {
        const hist = livePosHistRef.current;
        const last = hist[hist.length - 1];
        if (!last || last.lat !== d.lat || last.lng !== d.lng) {
          hist.push({ lat: d.lat, lng: d.lng });
          if (hist.length > 5) hist.shift();
          /* Bearing from oldest buffered point → newest for stable direction */
          if (hist.length >= 2) {
            setLiveBearing(calcBearing(hist[0].lat, hist[0].lng, hist[hist.length - 1].lat, hist[hist.length - 1].lng));
          }
        }
        prevLivePosRef.current = { lat: d.lat, lng: d.lng };
      }
      setLiveOne(d);
    } catch {}
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (autoRefresh && activeTab === 'live') {
      timerRef.current = setInterval(() => {
        fetchAll();
        if (selectedReg) fetchOne(selectedReg);
      }, 5000);
    }
    return () => clearInterval(timerRef.current);
  }, [autoRefresh, activeTab, selectedReg, fetchAll, fetchOne]);

  function onSelect(reg) {
    setSelectedReg(reg);
    setActiveTab('live');
    setHistData(null);
    setPlaying(false);
    setPlayIdx(0);
    setLiveBearing(0);
    prevLivePosRef.current = null;
    livePosHistRef.current = [];
    clearInterval(playRef.current);
    if (reg) fetchOne(reg);
    else setLiveOne(null);
  }

  async function fetchHistory() {
    if (!selectedReg) return;
    setHistLoading(true); setPlaying(false); setPlayIdx(0); clearInterval(playRef.current);
    try {
      const p = { period: histPeriod };
      if (histPeriod === 'specific' && histDate) p.date = histDate.format('YYYY-MM-DD');
      if (histPeriod === 'range') {
        if (histFrom) p.from = histFrom.format('YYYY-MM-DD');
        if (histTo)   p.to   = histTo.format('YYYY-MM-DD');
      }
      const r = await vtsService.getHistory(selectedReg, p);
      setHistData(r.data.data);
    } catch {} finally { setHistLoading(false); }
  }

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

  function copyCoords(lat, lng) {
    navigator.clipboard?.writeText(`${lat}, ${lng}`);
    message.success('Coordinates copied');
  }

  /* derived */
  const selDev   = devices.find(d => d.vehicleReg === selectedReg);
  const liveCur  = liveOne ?? liveAll.find(v => v.vehicle === selectedReg);
  const trackPts = histData?.trackPoints ?? [];
  const curPt    = trackPts[playIdx];
  const moving   = liveAll.filter(v => v.status === 'moving').length;
  const totalVeh = devices.length;

  const histBearing = useMemo(() => {
    if (trackPts.length < 2) return 0;
    /* Wide window (±4 points) for a stable, smooth bearing */
    const behind = Math.max(0, playIdx - 2);
    const ahead  = Math.min(trackPts.length - 1, playIdx + 4);
    if (behind === ahead) return 0;
    return calcBearing(
      trackPts[behind].lat, trackPts[behind].lng,
      trackPts[ahead].lat,  trackPts[ahead].lng
    );
  }, [trackPts, playIdx]);

  /* Engine-off stop points (capped at 40 for performance) */
  const stopMarkers = useMemo(() => {
    if (trackPts.length < 2) return [];
    return trackPts
      .map((p, i) => ({ ...p, origIdx: i }))
      .filter(p => p.engineStatus !== 'running' && p.origIdx > 0 && p.origIdx < trackPts.length - 1)
      .slice(0, 40);
  }, [trackPts]);

  const filteredDevices = devices.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return d.vehicleReg?.toLowerCase().includes(q)
      || d.vehicleMake?.toLowerCase().includes(q)
      || d.imei?.includes(q) || d.msisdn?.includes(q);
  });

  const showHistory = activeTab === 'history' && !!selectedReg;

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  const isDark   = mapLayer === 'dark';
  const panelBg  = isDark ? '#0d1117' : '#ffffff';
  const panelBg2 = isDark ? '#161b22' : '#f4f6f8';
  const border   = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
  const textPri  = isDark ? '#e6edf3' : '#1f2937';
  const textSec  = isDark ? '#8b949e' : '#6b7280';
  const accent   = '#1677ff';

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 72px)',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      background: panelBg,
      border: `1px solid ${border}`,
    }}>

      {/* ══════════════════════════════════════════════════════════
         LEFT PANEL — Fleet Commander
      ══════════════════════════════════════════════════════════ */}
      <div style={{
        width: 288, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: panelBg, borderRight: `1px solid ${border}`,
      }}>

        {/* ── Panel Header ──────────────────────────────────────── */}
        <div style={{
          padding: '14px 16px 12px',
          borderBottom: `1px solid ${border}`,
          background: isDark ? 'linear-gradient(180deg, #0d1320 0%, #0d1117 100%)' : 'linear-gradient(180deg, #f0f4ff 0%, #ffffff 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #1677ff 0%, #0050b3 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(22,119,255,0.4)',
            }}>
              <EnvironmentOutlined style={{ fontSize: 17, color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: textPri, letterSpacing: '-0.02em' }}>VTS Command</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#52c41a', boxShadow: '0 0 6px #52c41a' }} />
                <span style={{ fontSize: 10, color: '#52c41a', fontWeight: 600 }}>LIVE TRACKING</span>
              </div>
            </div>
            {autoRefresh && (
              <div style={{ marginLeft: 'auto', fontSize: 10, color: textSec }}>⟳ 5s</div>
            )}
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { label: 'Total',   value: totalVeh, color: '#58a6ff', bg: 'rgba(88,166,255,0.1)' },
              { label: 'Moving',  value: moving,   color: '#52c41a', bg: 'rgba(82,196,26,0.1)' },
              { label: 'Tracked', value: liveAll.length, color: '#fa8c16', bg: 'rgba(250,140,22,0.1)' },
            ].map(s => (
              <div key={s.label} style={{
                flex: 1, background: s.bg, border: `1px solid ${s.color}25`,
                borderRadius: 8, padding: '5px 0', textAlign: 'center',
              }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 9, color: textSec, marginTop: 2, letterSpacing: '0.06em' }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Search ────────────────────────────────────────────── */}
        <div style={{ padding: '10px 12px', borderBottom: `1px solid ${border}` }}>
          <Input
            placeholder="Search vehicle, IMEI, SIM..."
            prefix={<SearchOutlined style={{ color: textSec, fontSize: 13 }} />}
            value={search} onChange={e => setSearch(e.target.value)}
            size="small"
            style={{
              background: panelBg2, border: `1px solid ${border}`,
              borderRadius: 8, color: textPri, fontSize: 12,
            }}
            allowClear
          />
        </div>

        {/* ── Vehicle List / Selected Details ───────────────────── */}
        {!selectedReg ? (
          /* Fleet List */
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <Spin size="default" />
              </div>
            )}
            {filteredDevices.map((d) => {
              const live = liveAll.find(v => v.vehicle === d.vehicleReg);
              const speed = live?.speed ?? 0;
              const spStr = typeof speed === 'number' ? speed.toFixed(1) : speed;
              return (
                <div key={d.vehicleReg}
                  onClick={() => onSelect(d.vehicleReg)}
                  style={{
                    padding: '10px 14px', borderBottom: `1px solid ${border}`,
                    cursor: 'pointer', transition: 'background 0.15s',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(22,119,255,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Live dot */}
                  <div style={{ position: 'relative', width: 10, height: 10, flexShrink: 0 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#52c41a', boxShadow: '0 0 6px #52c41a' }} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: textPri }}>{d.vehicleReg}</div>
                    <div style={{ fontSize: 10, color: textSec, marginTop: 1 }}>
                      {d.vehicleMake || 'GPS Device'}{live?.driver ? ` · ${live.driver}` : ''}
                    </div>
                  </div>

                  {/* Speed + Live tag */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: '#52c41a', fontWeight: 700 }}>● LIVE</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: spStr > 0 ? '#52c41a' : textSec, marginTop: 1 }}>
                      {spStr} <span style={{ fontSize: 9, fontWeight: 400 }}>km/h</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div style={{ color: textSec, fontSize: 12, flexShrink: 0 }}>›</div>
                </div>
              );
            })}
            {filteredDevices.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: textSec }}>
                <EnvironmentOutlined style={{ fontSize: 32, marginBottom: 10, opacity: 0.3 }} />
                <div style={{ fontSize: 12 }}>No vehicles found</div>
              </div>
            )}
          </div>
        ) : (
          /* Selected Vehicle Details */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Back + Vehicle header */}
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${border}` }}>
              <button onClick={() => onSelect(null)}
                style={{ background: 'none', border: 'none', color: textSec, cursor: 'pointer',
                  fontSize: 11, padding: 0, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                ‹ All Vehicles
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: 'linear-gradient(135deg, #52c41a22, #52c41a44)',
                  border: '1px solid rgba(82,196,26,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CarOutlined style={{ fontSize: 18, color: '#52c41a' }} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: textPri }}>{selectedReg}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#52c41a' }} />
                    <span style={{ fontSize: 10, color: '#52c41a', fontWeight: 600 }}>LIVE · ENGINE ON</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab bar */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${border}`, background: panelBg2 }}>
              {[
                { key: 'live',         icon: <ThunderboltOutlined />, label: 'Live' },
                { key: 'history',      icon: <HistoryOutlined />,     label: 'History' },
                { key: 'vehicle-info', icon: <CarOutlined />,         label: 'Vehicle' },
                { key: 'device-info',  icon: <MobileOutlined />,      label: 'Device' },
              ].map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  style={{
                    flex: 1, background: 'none', border: 'none',
                    borderBottom: activeTab === t.key ? `2px solid ${accent}` : '2px solid transparent',
                    color: activeTab === t.key ? accent : textSec,
                    cursor: 'pointer', padding: '8px 4px', fontSize: 10, fontWeight: 600,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    transition: 'all 0.2s',
                  }}>
                  <span style={{ fontSize: 14 }}>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>

              {activeTab === 'live' && liveCur && (
                <div>
                  {/* Speed Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(82,196,26,0.12) 0%, rgba(82,196,26,0.06) 100%)',
                    border: '1px solid rgba(82,196,26,0.3)', borderRadius: 12,
                    padding: '14px 16px', marginBottom: 10, textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 10, color: '#52c41a', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>CURRENT SPEED</div>
                    <div style={{ fontSize: 42, fontWeight: 900, color: '#52c41a', lineHeight: 1 }}>
                      {typeof liveCur.speed === 'number' ? liveCur.speed.toFixed(2) : liveCur.speed}
                    </div>
                    <div style={{ fontSize: 13, color: '#8b949e', marginTop: 2 }}>km/h</div>
                    <div style={{ marginTop: 8 }}>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min((liveCur.speed / 100) * 100, 100)}%`,
                          background: 'linear-gradient(90deg, #52c41a, #95de64)', borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: 9, color: textSec, marginTop: 3 }}>Speed limit: 100 km/h</div>
                    </div>
                  </div>

                  {/* Info grid */}
                  {[
                    { label: 'Driver',   value: liveCur.driver || '—' },
                    { label: 'Position', value: `${liveCur.lat}, ${liveCur.lng}`, mono: true },
                    { label: 'Location', value: liveCur.location || '—' },
                    { label: 'Route',    value: liveCur.route || 'On Trip' },
                    { label: 'Progress', value: null, progress: liveCur.progress },
                    { label: 'Fuel',     value: null, fuel: liveCur.fuel },
                    { label: 'Updated',  value: liveCur.positionTime || '—' },
                  ].map(item => (
                    <div key={item.label} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 9, color: textSec, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 3 }}>{item.label.toUpperCase()}</div>
                      {item.value !== null && item.value !== undefined && (
                        <div style={{ fontSize: 12, color: textPri, fontFamily: item.mono ? 'monospace' : 'inherit',
                          background: panelBg2, borderRadius: 6, padding: '5px 8px', lineHeight: 1.5 }}>
                          {item.value}
                        </div>
                      )}
                      {item.progress !== undefined && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
                            <div style={{ height: '100%', width: `${item.progress}%`, background: accent, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, color: accent, fontWeight: 700, minWidth: 30 }}>{item.progress}%</span>
                        </div>
                      )}
                      {item.fuel !== undefined && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
                            <div style={{ height: '100%', width: `${item.fuel}%`,
                              background: item.fuel > 50 ? '#52c41a' : item.fuel > 20 ? '#fa8c16' : '#ff4d4f',
                              borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, color: item.fuel > 50 ? '#52c41a' : item.fuel > 20 ? '#fa8c16' : '#ff4d4f',
                            fontWeight: 700, minWidth: 30 }}>{item.fuel}%</span>
                        </div>
                      )}
                    </div>
                  ))}

                  <button onClick={() => copyCoords(liveCur.lat, liveCur.lng)}
                    style={{
                      width: '100%', background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.25)',
                      borderRadius: 8, padding: '7px 12px', cursor: 'pointer', color: '#58a6ff', fontSize: 11,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6,
                    }}>
                    <CopyOutlined /> Copy Coordinates
                  </button>
                </div>
              )}

              {activeTab === 'live' && !liveCur && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: textSec }}>
                  <ThunderboltOutlined style={{ fontSize: 36, opacity: 0.3, display: 'block', marginBottom: 10 }} />
                  <div style={{ fontSize: 12 }}>Fetching live data...</div>
                </div>
              )}

              {activeTab === 'history' && (
                <div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9, color: textSec, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>PERIOD</div>
                    <Select value={histPeriod} onChange={setHistPeriod} size="small"
                      style={{ width: '100%', marginBottom: 6 }}
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
                      <DatePicker size="small" value={histDate} onChange={setHistDate} style={{ width: '100%', marginBottom: 6 }} />
                    )}
                    {histPeriod === 'range' && (
                      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                        <DatePicker size="small" value={histFrom} onChange={setHistFrom} placeholder="From"
                          style={{ flex: 1 }} disabledDate={d => d && d.isAfter(dayjs())} />
                        <DatePicker size="small" value={histTo} onChange={setHistTo} placeholder="To"
                          style={{ flex: 1 }} disabledDate={d => {
                            if (!d || d.isAfter(dayjs())) return true;
                            return histFrom ? d.diff(histFrom, 'day') > 7 : false;
                          }} />
                      </div>
                    )}
                    <button onClick={fetchHistory}
                      style={{
                        width: '100%', background: 'linear-gradient(135deg, #1677ff, #0050b3)',
                        border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
                        color: '#fff', fontSize: 12, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        opacity: histLoading ? 0.7 : 1,
                      }}
                      disabled={histLoading}>
                      <HistoryOutlined /> {histLoading ? 'Loading...' : 'Show History'}
                    </button>
                  </div>

                  {histData && (
                    <div style={{ background: panelBg2, borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div>
                          <div style={{ fontSize: 9, color: textSec, letterSpacing: '0.08em' }}>TOTAL DISTANCE</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: accent }}>{histData.totalKm} km</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 9, color: textSec, letterSpacing: '0.08em' }}>DATA POINTS</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: '#fa8c16' }}>{trackPts.length}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Playback controls */}
                  {trackPts.length > 0 && (
                    <div style={{
                      background: panelBg2, borderRadius: 10, padding: '10px 12px',
                      border: `1px solid ${border}`, marginBottom: 10,
                    }}>
                      <div style={{ fontSize: 9, color: textSec, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>PLAYBACK</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <button onClick={togglePlay}
                          style={{
                            width: 34, height: 34, borderRadius: '50%', cursor: 'pointer',
                            background: playing ? 'rgba(255,77,79,0.2)' : 'rgba(22,119,255,0.2)',
                            border: `1px solid ${playing ? 'rgba(255,77,79,0.5)' : 'rgba(22,119,255,0.5)'}`,
                            color: playing ? '#ff4d4f' : accent, fontSize: 16, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                          {playing ? <PauseOutlined /> : <PlayCircleOutlined />}
                        </button>
                        <div style={{ flex: 1 }}>
                          <input type="range" min={0} max={trackPts.length - 1} value={playIdx}
                            onChange={e => setPlayIdx(Number(e.target.value))}
                            style={{ width: '100%', accentColor: accent }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: textSec }}>{playIdx + 1} / {trackPts.length}</span>
                        <Select size="small" value={playSpeed} onChange={setPlaySpeed} style={{ width: 100 }}
                          options={[
                            { value: 800, label: '0.5× Speed' },
                            { value: 400, label: '1× Speed' },
                            { value: 200, label: '2× Speed' },
                            { value: 80,  label: '4× Speed' },
                          ]}
                        />
                        <button onClick={() => { setPlayIdx(0); setPlaying(false); clearInterval(playRef.current); }}
                          style={{ background: 'none', border: 'none', color: textSec, cursor: 'pointer', fontSize: 14 }}>↺</button>
                        <button
                          onClick={() => {
                            if (leafletMap && trackPts.length > 1) {
                              leafletMap.fitBounds(
                                L.latLngBounds(trackPts.map(p => [p.lat, p.lng])),
                                { padding: [50, 50], animate: true }
                              );
                            }
                          }}
                          title="Fit full route"
                          style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                          ⛶
                        </button>
                      </div>
                    </div>
                  )}

                  {/* History point list */}
                  {!histLoading && trackPts.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: textSec }}>
                      <HistoryOutlined style={{ fontSize: 28, opacity: 0.3, display: 'block', marginBottom: 8 }} />
                      <div style={{ fontSize: 11 }}>Select period and click Show History</div>
                    </div>
                  )}
                  {trackPts.map((p, i) => (
                    <div key={i} onClick={() => setPlayIdx(i)}
                      style={{
                        padding: '7px 10px', borderRadius: 8, marginBottom: 3, cursor: 'pointer',
                        background: i === playIdx ? 'rgba(22,119,255,0.15)' : 'transparent',
                        border: `1px solid ${i === playIdx ? 'rgba(22,119,255,0.4)' : 'transparent'}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { if (i !== playIdx) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                      onMouseLeave={e => { if (i !== playIdx) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: textPri }}>{p.timestamp}</div>
                        <div style={{ fontSize: 9, color: textSec, fontFamily: 'monospace' }}>
                          {p.lat.toFixed(6)}, {p.lng.toFixed(6)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: accent }}>{p.speed}</div>
                        <div style={{ fontSize: 9, color: textSec }}>km/h</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'vehicle-info' && (
                <div>
                  {[
                    { label: 'Registration No', value: selectedReg },
                    { label: 'Make / Model',    value: `${selDev?.vehicleMake || '—'}` },
                    { label: 'Current Speed',   value: liveCur ? `${liveCur.speed} km/h` : '—' },
                    { label: 'Heading',         value: liveCur?.heading || '—' },
                    { label: 'Current Location', value: liveCur?.location || '—' },
                    { label: 'Active Route',    value: liveCur?.route || 'On Trip' },
                    { label: 'Driver',          value: liveCur?.driver || '—' },
                    { label: 'Purpose',         value: liveCur?.purpose || '—' },
                    { label: 'Dispatch No',     value: liveCur?.dispatchNo || '—' },
                    { label: 'Approved By',     value: liveCur?.approvedBy || '—' },
                    { label: 'Coordinates',     value: liveCur ? `${liveCur.lat}°N, ${liveCur.lng}°E` : '—' },
                  ].map(item => (
                    <div key={item.label} style={{ marginBottom: 8, background: panelBg2, borderRadius: 8, padding: '7px 10px' }}>
                      <div style={{ fontSize: 9, color: textSec, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 2 }}>{item.label.toUpperCase()}</div>
                      <div style={{ fontSize: 12, color: textPri }}>{item.value}</div>
                    </div>
                  ))}
                  {liveCur && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1, background: panelBg2, borderRadius: 8, padding: '7px 10px' }}>
                        <div style={{ fontSize: 9, color: textSec, letterSpacing: '0.08em', marginBottom: 4 }}>TRIP PROGRESS</div>
                        <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
                          <div style={{ height: '100%', width: `${liveCur.progress}%`, background: accent, borderRadius: 3 }} />
                        </div>
                        <div style={{ fontSize: 11, color: accent, fontWeight: 700, marginTop: 4 }}>{liveCur.progress}%</div>
                      </div>
                      <div style={{ flex: 1, background: panelBg2, borderRadius: 8, padding: '7px 10px' }}>
                        <div style={{ fontSize: 9, color: textSec, letterSpacing: '0.08em', marginBottom: 4 }}>FUEL LEVEL</div>
                        <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
                          <div style={{ height: '100%', width: `${liveCur.fuel}%`,
                            background: liveCur.fuel > 50 ? '#52c41a' : liveCur.fuel > 20 ? '#fa8c16' : '#ff4d4f',
                            borderRadius: 3 }} />
                        </div>
                        <div style={{ fontSize: 11, color: liveCur.fuel > 50 ? '#52c41a' : '#fa8c16', fontWeight: 700, marginTop: 4 }}>{liveCur.fuel}%</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'device-info' && selDev && (
                <div>
                  {[
                    { label: 'Device Model',   value: selDev.deviceModel || '—' },
                    { label: 'IMEI',           value: selDev.imei, mono: true },
                    { label: 'VTS SIM (MSISDN)', value: selDev.msisdn, mono: true },
                    { label: 'Client Mobile',  value: selDev.clientMobile || '—' },
                    { label: 'Client ID',      value: selDev.clientId, mono: true },
                    { label: 'Engine Status',  value: 'ON', color: '#52c41a' },
                    { label: 'Tracking Status', value: 'Active / LIVE', color: '#52c41a' },
                    { label: 'Current Speed',  value: `${selDev.speed ?? 0} km/h` },
                  ].map(item => (
                    <div key={item.label} style={{ marginBottom: 8, background: panelBg2, borderRadius: 8, padding: '7px 10px' }}>
                      <div style={{ fontSize: 9, color: textSec, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 2 }}>{item.label.toUpperCase()}</div>
                      <div style={{ fontSize: 12, color: item.color || textPri, fontFamily: item.mono ? 'monospace' : 'inherit', fontWeight: item.color ? 700 : 400 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Bottom refresh bar ────────────────────────────────── */}
        <div style={{
          padding: '8px 14px', borderTop: `1px solid ${border}`,
          display: 'flex', alignItems: 'center', gap: 8, background: panelBg2,
        }}>
          <button
            onClick={() => setAutoRefresh(v => !v)}
            style={{
              background: autoRefresh ? 'rgba(82,196,26,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${autoRefresh ? 'rgba(82,196,26,0.4)' : border}`,
              borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
              color: autoRefresh ? '#52c41a' : textSec, fontSize: 11, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
            {autoRefresh ? <PauseOutlined /> : <PlayCircleOutlined />}
            {autoRefresh ? 'Auto ON' : 'Paused'}
          </button>
          <button
            onClick={() => { fetchAll(); if (selectedReg) fetchOne(selectedReg); }}
            style={{
              background: 'rgba(22,119,255,0.12)', border: `1px solid rgba(22,119,255,0.3)`,
              borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
              color: accent, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5,
            }}>
            <ReloadOutlined /> Refresh
          </button>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: textSec }}>5s</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
         MAP AREA
      ══════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>

        {/* Layer switcher + zoom buttons (stacked in top-right) */}
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{
            background: 'rgba(13,17,23,0.88)', backdropFilter: 'blur(8px)',
            border: `1px solid ${border}`, borderRadius: 10, padding: '3px 4px',
            display: 'flex', gap: 2,
          }}>
            {Object.entries(TILES).map(([k, v]) => (
              <button key={k} onClick={() => setMapLayer(k)}
                style={{
                  background: mapLayer === k ? accent : 'transparent',
                  border: 'none', borderRadius: 7, padding: '4px 10px', cursor: 'pointer',
                  color: mapLayer === k ? '#fff' : '#e6edf3', fontSize: 10, fontWeight: 600,
                  transition: 'all 0.2s',
                }}>
                {v.label}
              </button>
            ))}
          </div>
          {/* Zoom controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[{ label: '+', fn: () => leafletMap?.zoomIn() }, { label: '−', fn: () => leafletMap?.zoomOut() }].map(z => (
              <button key={z.label} onClick={z.fn}
                style={{
                  width: 34, height: 34, background: 'rgba(13,17,23,0.88)', backdropFilter: 'blur(8px)',
                  border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer',
                  color: '#e6edf3', fontSize: 18, fontWeight: 300, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = accent; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(13,17,23,0.88)'; }}
              >{z.label}</button>
            ))}
          </div>
        </div>

        {/* Live status overlay */}
        <div style={{
          position: 'absolute', top: 12, left: 12, zIndex: 1000,
          background: 'rgba(13,17,23,0.88)', backdropFilter: 'blur(8px)',
          border: `1px solid ${border}`, borderRadius: 10, padding: '6px 12px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#52c41a', boxShadow: '0 0 8px #52c41a' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#52c41a' }}>
            {selectedReg ? `Tracking ${selectedReg}` : `${liveAll.length} vehicles live`}
          </span>
          {selectedReg && activeTab === 'live' && liveCur && (
            <>
              <span style={{ color: border, fontSize: 10 }}>|</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#52c41a' }}>
                {typeof liveCur.speed === 'number' ? liveCur.speed.toFixed(1) : liveCur.speed} km/h
              </span>
            </>
          )}
        </div>

        {/* History stats overlay */}
        {activeTab === 'history' && histData && (
          <div style={{
            position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
            zIndex: 1000, display: 'flex', gap: 0, overflow: 'hidden',
            background: 'rgba(13,17,23,0.92)', backdropFilter: 'blur(8px)',
            border: `1px solid ${border}`, borderRadius: 12,
          }}>
            {[
              { label: 'TOTAL',   value: `${histData.totalKm} km`,              color: accent },
              { label: 'TRAVELED', value: `${histData.traveledKm} km`,           color: '#52c41a' },
              { label: 'SPEED',   value: curPt ? `${curPt.speed} km/h` : '—',   color: curPt && curPt.speed > 0 ? '#52c41a' : textSec },
              { label: 'POINTS',  value: trackPts.length,                        color: '#fa8c16' },
              { label: 'POINT',   value: `${playIdx + 1} / ${trackPts.length}`,  color: textSec },
            ].map((s, i) => (
              <div key={s.label} style={{
                padding: '8px 16px', textAlign: 'center',
                borderRight: i < 4 ? `1px solid ${border}` : 'none',
              }}>
                <div style={{ fontSize: 9, color: textSec, letterSpacing: '0.1em', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        <MapContainer
          center={[23.8, 90.4]} zoom={7}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
          zoomControl={false}
        >
          <TileLayer key={mapLayer} url={TILES[mapLayer].url}
            attribution={TILES[mapLayer].attribution ?? ''}
            subdomains={mapLayer === 'dark' ? 'abcd' : 'abc'} />
          <ResizeHandler trigger={selectedReg} />
          <MapCapture onMap={setLeafletMap} />

          {/* Fly to selected vehicle */}
          {activeTab === 'live' && liveCur && <FlyTo lat={liveCur.lat} lng={liveCur.lng} zoom={13} />}
          {activeTab === 'history' && trackPts.length > 1 && <FitBounds points={trackPts} key={histData} />}

          {/* Live: single selected vehicle — smooth GPS-style movement */}
          {activeTab === 'live' && selectedReg && liveCur && (<>
            {/* Planned route — full origin→destination path (blue dashed) */}
            {liveCur.routeWaypoints?.length > 1 && (
              <Polyline
                positions={liveCur.routeWaypoints}
                pathOptions={{ color: '#1677ff', weight: 3, opacity: 0.35, dashArray: '12 8' }} />
            )}
            {/* Traveled trail — solid green, up to current position */}
            {liveCur.trail?.length >= 2 && (
              <Polyline
                positions={liveCur.trail.length >= 3 ? liveCur.trail.slice(0, -1) : liveCur.trail}
                pathOptions={{ color: '#52c41a', weight: 5, opacity: 0.9 }} />
            )}
            <SmoothMarker
              key={`live-${selectedReg}`}
              position={[liveCur.lat, liveCur.lng]}
              heading={liveBearing}
              icon={makeMapMarker(liveCur.vehicleIcon ?? selDev?.vehicleIcon ?? 'car', '#52c41a', true)}
              duration={4500}
            >
              <Popup className={isDark ? 'dark-popup' : 'light-popup'} minWidth={460} maxWidth={560}>
                <DarkPopup v={liveCur} onCopy={copyCoords} dark={isDark} />
              </Popup>
            </SmoothMarker>
          </>)}

          {/* Live: all vehicles */}
          {activeTab === 'live' && !selectedReg && (<>
            {liveAll.filter(v => v.trail?.length >= 2).map(v => (
              <Polyline key={`trail-${v.key}`}
                positions={v.trail.length >= 3 ? v.trail.slice(0, -1) : v.trail}
                pathOptions={{ color: STATUS_COLOR[v.status] ?? '#52c41a', weight: 3, opacity: 0.65 }} />
            ))}
            {liveAll.map(v => (
              <SmoothMarker
                key={v.key}
                position={[v.lat, v.lng]}
                heading={trailBearing(v.trail)}
                icon={makeMapMarker(v.vehicleIcon ?? 'car', STATUS_COLOR[v.status] ?? '#52c41a', false)}
                duration={4500}
                eventHandlers={{ click: () => onSelect(v.vehicle) }}
              >
                <Popup className={isDark ? 'dark-popup' : 'light-popup'} minWidth={460} maxWidth={560}>
                  <DarkPopup v={v} onCopy={copyCoords} dark={isDark} />
                </Popup>
              </SmoothMarker>
            ))}
          </>)}

          {/* History route */}
          {activeTab === 'history' && trackPts.length > 0 && (<>

            {/* Remaining path — blue dashed */}
            <Polyline
              key={`hist-remain-${selectedReg}`}
              positions={trackPts.slice(Math.max(0, playIdx)).map(p => [p.lat, p.lng])}
              pathOptions={{ color: '#1677ff', weight: 3, opacity: 0.45, dashArray: '10 7' }} />

            {/* Traveled path — green solid (only after first move) */}
            {playIdx > 0 && (
              <Polyline
                key={`hist-traveled-${selectedReg}`}
                positions={trackPts.slice(0, playIdx + 1).map(p => [p.lat, p.lng])}
                pathOptions={{ color: '#52c41a', weight: 4, opacity: 0.9 }} />
            )}

            {/* Start marker — green circle */}
            <CircleMarker center={[trackPts[0].lat, trackPts[0].lng]} radius={8}
              pathOptions={{ color: '#fff', fillColor: '#52c41a', fillOpacity: 1, weight: 2 }}>
              <Popup className={isDark ? 'dark-popup' : 'light-popup'} minWidth={300}>
                <div style={{
                  minWidth: 300, fontFamily: 'system-ui,-apple-system,sans-serif',
                  background: isDark ? '#0d1117' : '#ffffff', borderRadius: 12,
                }}>
                  <div style={{
                    padding: '10px 14px 8px',
                    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#52c41a', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 9, color: '#52c41a', fontWeight: 700, letterSpacing: '0.1em' }}>JOURNEY START</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#e6edf3' : '#1f2937', marginTop: 1 }}>{trackPts[0].timestamp}</div>
                    </div>
                  </div>
                  <div style={{ padding: '10px 14px' }}>
                    <div style={{ fontSize: 8, color: isDark ? '#8b949e' : '#6b7280', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 3 }}>POSITION</div>
                    <div style={{ fontSize: 11, color: isDark ? '#e6edf3' : '#1f2937', fontFamily: 'monospace', marginBottom: 8, whiteSpace: 'nowrap' }}>
                      {trackPts[0].lat?.toFixed(6)}, {trackPts[0].lng?.toFixed(6)}
                    </div>
                    {trackPts[0].location && (<>
                      <div style={{ fontSize: 8, color: isDark ? '#8b949e' : '#6b7280', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 3 }}>LOCATION</div>
                      <div style={{ fontSize: 11, color: isDark ? '#e6edf3' : '#1f2937', lineHeight: 1.4 }}>{trackPts[0].location}</div>
                    </>)}
                  </div>
                </div>
              </Popup>
            </CircleMarker>

            {/* End marker — red circle */}
            {trackPts.length > 1 && (
              <CircleMarker center={[trackPts[trackPts.length - 1].lat, trackPts[trackPts.length - 1].lng]} radius={8}
                pathOptions={{ color: '#fff', fillColor: '#ff4d4f', fillOpacity: 1, weight: 2 }}>
                <Popup className={isDark ? 'dark-popup' : 'light-popup'} minWidth={300}>
                  <div style={{
                    minWidth: 300, fontFamily: 'system-ui,-apple-system,sans-serif',
                    background: isDark ? '#0d1117' : '#ffffff', borderRadius: 12,
                  }}>
                    <div style={{
                      padding: '10px 14px 8px',
                      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff4d4f', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 9, color: '#ff4d4f', fontWeight: 700, letterSpacing: '0.1em' }}>JOURNEY END</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#e6edf3' : '#1f2937', marginTop: 1 }}>{trackPts[trackPts.length - 1].timestamp}</div>
                      </div>
                    </div>
                    <div style={{ padding: '10px 14px' }}>
                      <div style={{ fontSize: 8, color: isDark ? '#8b949e' : '#6b7280', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 3 }}>POSITION</div>
                      <div style={{ fontSize: 11, color: isDark ? '#e6edf3' : '#1f2937', fontFamily: 'monospace', marginBottom: 8, whiteSpace: 'nowrap' }}>
                        {trackPts[trackPts.length - 1].lat?.toFixed(6)}, {trackPts[trackPts.length - 1].lng?.toFixed(6)}
                      </div>
                      {trackPts[trackPts.length - 1].location && (<>
                        <div style={{ fontSize: 8, color: isDark ? '#8b949e' : '#6b7280', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 3 }}>LOCATION</div>
                        <div style={{ fontSize: 11, color: isDark ? '#e6edf3' : '#1f2937', lineHeight: 1.4 }}>{trackPts[trackPts.length - 1].location}</div>
                      </>)}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            )}

            {/* Engine-off stop markers (sparse, capped at 40) */}
            {stopMarkers.map((p, i) => (
              <CircleMarker key={`stop-${i}`} center={[p.lat, p.lng]} radius={4}
                pathOptions={{ color: '#fa8c16', fillColor: '#fa8c16', fillOpacity: 0.85, weight: 1 }}>
                <Popup className={isDark ? 'dark-popup' : 'light-popup'} minWidth={300}>
                  <HistoryPointPopup p={p} i={p.origIdx} dark={isDark} />
                </Popup>
              </CircleMarker>
            ))}

            {/* Vehicle icon at current playback position */}
            {curPt && (
              <SmoothMarker
                key={`hist-${selectedReg}`}
                position={[curPt.lat, curPt.lng]}
                heading={histBearing}
                icon={makeMapMarker(
                  selDev?.vehicleIcon ?? 'car',
                  curPt.engineStatus === 'running' ? '#52c41a' : '#fa8c16',
                  true
                )}
                duration={Math.max(playSpeed - 30, 80)}
              >
                <Popup className={isDark ? 'dark-popup' : 'light-popup'} minWidth={300}>
                  <HistoryPointPopup p={curPt} i={playIdx} dark={isDark} />
                </Popup>
              </SmoothMarker>
            )}
          </>)}
        </MapContainer>
      </div>
    </div>
  );
}
