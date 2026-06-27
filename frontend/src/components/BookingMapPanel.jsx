import { EnvironmentOutlined, SwapRightOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Spin, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';

const { Text } = Typography;

// Wait until Google Maps DirectionsService is loaded by LocationPicker
function waitForGoogleMaps() {
  if (window.google?.maps?.DirectionsService) return Promise.resolve();
  return new Promise((resolve) => {
    const t = setInterval(() => {
      if (window.google?.maps?.DirectionsService) { clearInterval(t); resolve(); }
    }, 120);
  });
}

// Custom SVG pin icon
function mkIcon(color, letter) {
  return {
    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2.5,
    scale: 2.2,
    anchor: new window.google.maps.Point(12, 22),
    labelOrigin: new window.google.maps.Point(12, 9),
  };
}

// Night-mode map style for Google Maps
const MAP_STYLES_LIGHT = [
  { featureType: 'poi.business',    stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',         elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road',            elementType: 'geometry', stylers: [{ color: '#f8f8f8' }] },
  { featureType: 'road.highway',    elementType: 'geometry', stylers: [{ color: '#e8e8e8' }] },
  { featureType: 'water',           elementType: 'geometry', stylers: [{ color: '#c8ddf0' }] },
  { featureType: 'landscape',       elementType: 'geometry', stylers: [{ color: '#f5f5f0' }] },
];

export default function BookingMapPanel({ fromLoc, toLoc, onRouteInfo }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const rendererRef  = useRef(null);
  const markerA      = useRef(null);
  const markerB      = useRef(null);
  const [ready,     setReady]     = useState(!!window.google?.maps?.DirectionsService);
  const [routing,   setRouting]   = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);

  // Wait for Google Maps to load
  useEffect(() => { waitForGoogleMaps().then(() => setReady(true)); }, []);

  // Init map once
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    mapRef.current = new window.google.maps.Map(containerRef.current, {
      center: { lat: 23.8103, lng: 90.4125 },
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_TOP },
      fullscreenControlOptions: { position: window.google.maps.ControlPosition.RIGHT_TOP },
      styles: MAP_STYLES_LIGHT,
    });
    rendererRef.current = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#6366f1',
        strokeWeight: 5,
        strokeOpacity: 0.88,
      },
    });
    rendererRef.current.setMap(mapRef.current);
  }, [ready]);

  // Update markers + route when locations change
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    markerA.current?.setMap(null); markerA.current = null;
    markerB.current?.setMap(null); markerB.current = null;
    setRouteInfo(null);

    if (fromLoc?.lat) {
      markerA.current = new window.google.maps.Marker({
        position: { lat: fromLoc.lat, lng: fromLoc.lng },
        map: mapRef.current,
        title: fromLoc.address,
        icon: mkIcon('#6366f1', 'A'),
        label: { text: 'A', color: '#fff', fontWeight: '800', fontSize: '12px' },
        zIndex: 10,
      });
    }

    if (toLoc?.lat) {
      markerB.current = new window.google.maps.Marker({
        position: { lat: toLoc.lat, lng: toLoc.lng },
        map: mapRef.current,
        title: toLoc.address,
        icon: mkIcon('#10b981', 'B'),
        label: { text: 'B', color: '#fff', fontWeight: '800', fontSize: '12px' },
        zIndex: 10,
      });
    }

    if (fromLoc?.lat && toLoc?.lat) {
      setRouting(true);
      try { rendererRef.current?.setDirections({ routes: [] }); } catch (_) {}

      new window.google.maps.DirectionsService().route(
        {
          origin:      { lat: fromLoc.lat, lng: fromLoc.lng },
          destination: { lat: toLoc.lat,   lng: toLoc.lng   },
          travelMode:  window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          setRouting(false);
          if (status === 'OK') {
            rendererRef.current.setDirections(result);
            const leg = result.routes[0]?.legs[0];
            if (leg) {
              const info = {
                distance:     Math.round(leg.distance.value / 1000),
                distanceText: leg.distance.text,
                duration:     leg.duration.text,
                durationSecs: leg.duration.value,
              };
              setRouteInfo(info);
              onRouteInfo?.(info);
            }
          } else {
            try { rendererRef.current?.setDirections({ routes: [] }); } catch (_) {}
          }
        }
      );
    } else {
      try { rendererRef.current?.setDirections({ routes: [] }); } catch (_) {}
      const loc = fromLoc ?? toLoc;
      if (loc?.lat) {
        mapRef.current.panTo({ lat: loc.lat, lng: loc.lng });
        mapRef.current.setZoom(14);
      }
    }
  }, [ready, fromLoc?.lat, fromLoc?.lng, toLoc?.lat, toLoc?.lng]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Google Map container */}
      <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: 14, overflow: 'hidden' }} />

      {/* Loading spinner when Google Maps isn't ready yet */}
      {!ready && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 14,
          background: '#eef1ff',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
        }}>
          <Spin size="large" />
          <Text type="secondary" style={{ fontSize: 13 }}>Loading Google Maps…</Text>
        </div>
      )}

      {/* Empty state */}
      {ready && !fromLoc?.lat && !toLoc?.lat && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.93)', backdropFilter: 'blur(12px)',
            borderRadius: 18, padding: '24px 32px', textAlign: 'center',
            boxShadow: '0 12px 40px rgba(99,102,241,0.18)',
            border: '1px solid rgba(99,102,241,0.15)',
          }}>
            <EnvironmentOutlined style={{ fontSize: 42, color: '#6366f1', display: 'block', marginBottom: 10 }} />
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, color: '#1e293b' }}>Live Route Preview</div>
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
              Enter pickup & destination<br />to see the driving route
            </div>
          </div>
        </div>
      )}

      {/* Routing spinner */}
      {routing && (
        <div style={{
          position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255,255,255,0.95)', borderRadius: 24, padding: '8px 18px',
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 4px 20px rgba(99,102,241,0.2)', backdropFilter: 'blur(8px)',
          zIndex: 10,
        }}>
          <Spin size="small" />
          <Text style={{ fontSize: 13, fontWeight: 600, color: '#6366f1' }}>Calculating route…</Text>
        </div>
      )}

      {/* Route info card — from → to + distance + time */}
      {routeInfo && !routing && (
        <div style={{
          position: 'absolute', bottom: 14, left: 14, right: 14,
          background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)',
          borderRadius: 16, padding: '14px 18px',
          boxShadow: '0 8px 32px rgba(99,102,241,0.2)',
          border: '1px solid rgba(99,102,241,0.18)',
          display: 'flex', alignItems: 'center', gap: 0,
          zIndex: 10,
        }}>
          {/* From → To */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, paddingRight: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 0 3px rgba(99,102,241,0.2)' }} />
              <div style={{ width: 1.5, height: 14, background: 'linear-gradient(#6366f1,#10b981)' }} />
              <div style={{ width: 10, height: 10, borderRadius: 3, background: '#10b981', boxShadow: '0 0 0 3px rgba(16,185,129,0.2)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#6366f1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {fromLoc?.address?.split(',')[0]}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', margin: '1px 0' }}>to</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#10b981', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {toLoc?.address?.split(',')[0]}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(99,102,241,0.12)', margin: '0 18px' }} />

          {/* Distance */}
          <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 80 }}>
            <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, color: '#6366f1', letterSpacing: '-0.02em' }}>
              {routeInfo.distanceText}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Route distance</div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(99,102,241,0.12)', margin: '0 18px' }} />

          {/* Duration */}
          <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 72 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <ClockCircleOutlined style={{ color: '#f59e0b', fontSize: 14 }} />
              <span style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b', letterSpacing: '-0.01em' }}>
                {routeInfo.duration}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Drive time</div>
          </div>
        </div>
      )}
    </div>
  );
}
