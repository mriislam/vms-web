import { EnvironmentOutlined, SwapRightOutlined } from '@ant-design/icons';
import { Spin, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';

const { Text } = Typography;

// Polls until window.google.maps.DirectionsService is available
function waitForMaps() {
  if (window.google?.maps?.DirectionsService) return Promise.resolve();
  return new Promise((resolve) => {
    const t = setInterval(() => {
      if (window.google?.maps?.DirectionsService) { clearInterval(t); resolve(); }
    }, 150);
  });
}

export default function BookingMapPanel({ fromLoc, toLoc, onRouteInfo, isDark }) {
  const containerRef  = useRef(null);
  const mapRef        = useRef(null);
  const rendererRef   = useRef(null);
  const markerARef    = useRef(null);
  const markerBRef    = useRef(null);
  const [ready,     setReady]     = useState(!!window.google?.maps?.DirectionsService);
  const [routing,   setRouting]   = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);

  // Wait for Maps API (loaded by LocationPicker)
  useEffect(() => { waitForMaps().then(() => setReady(true)); }, []);

  // Init map once ready
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    mapRef.current = new window.google.maps.Map(containerRef.current, {
      center: { lat: 23.8103, lng: 90.4125 },
      zoom: 11,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_TOP },
      styles: [
        { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit',      elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
      ],
    });
    rendererRef.current = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: { strokeColor: '#1677ff', strokeWeight: 5, strokeOpacity: 0.85 },
    });
    rendererRef.current.setMap(mapRef.current);
  }, [ready]);

  // Update route when locations change
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    markerARef.current?.setMap(null);
    markerBRef.current?.setMap(null);
    markerARef.current = null;
    markerBRef.current = null;

    const mkIcon = (color, letter) => ({
      path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#fff',
      strokeWeight: 2,
      scale: 1.7,
      anchor: new window.google.maps.Point(12, 22),
      labelOrigin: new window.google.maps.Point(12, 9),
    });

    if (fromLoc?.lat) {
      markerARef.current = new window.google.maps.Marker({
        position: { lat: fromLoc.lat, lng: fromLoc.lng },
        map: mapRef.current,
        title: fromLoc.address,
        icon: mkIcon('#1677ff', 'A'),
        label: { text: 'A', color: '#fff', fontWeight: '700', fontSize: '11px' },
        zIndex: 10,
      });
    }

    if (toLoc?.lat) {
      markerBRef.current = new window.google.maps.Marker({
        position: { lat: toLoc.lat, lng: toLoc.lng },
        map: mapRef.current,
        title: toLoc.address,
        icon: mkIcon('#52c41a', 'B'),
        label: { text: 'B', color: '#fff', fontWeight: '700', fontSize: '11px' },
        zIndex: 10,
      });
    }

    if (fromLoc?.lat && toLoc?.lat) {
      setRouting(true);
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
              };
              setRouteInfo(info);
              onRouteInfo?.(info);
            }
          }
        }
      );
    } else {
      try { rendererRef.current?.setDirections({ routes: [] }); } catch (_) {}
      setRouteInfo(null);
      const loc = fromLoc ?? toLoc;
      if (loc?.lat) {
        mapRef.current.setCenter({ lat: loc.lat, lng: loc.lng });
        mapRef.current.setZoom(14);
      }
    }
  }, [ready, fromLoc?.lat, fromLoc?.lng, toLoc?.lat, toLoc?.lng]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Map container */}
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', borderRadius: 14, overflow: 'hidden' }}
      />

      {/* Not-ready spinner */}
      {!ready && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 14,
          background: isDark ? '#1a1a2e' : '#f0f5ff',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
        }}>
          <Spin size="large" />
          <Text type="secondary" style={{ fontSize: 12 }}>Loading map…</Text>
        </div>
      )}

      {/* Empty state hint */}
      {ready && !fromLoc?.lat && !toLoc?.lat && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            background: isDark ? 'rgba(30,30,50,0.88)' : 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(10px)',
            borderRadius: 16, padding: '24px 32px', textAlign: 'center',
            boxShadow: '0 8px 32px rgba(22,119,255,0.15)',
            border: '1px solid rgba(22,119,255,0.15)',
          }}>
            <EnvironmentOutlined style={{ fontSize: 40, color: '#1677ff', display: 'block', marginBottom: 10 }} />
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Route will appear here</div>
            <div style={{ fontSize: 12, color: '#888' }}>Search From & To locations to see<br />the driving route on the map</div>
          </div>
        </div>
      )}

      {/* Routing spinner */}
      {routing && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255,255,255,0.92)', borderRadius: 20, padding: '6px 16px',
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          backdropFilter: 'blur(8px)',
        }}>
          <Spin size="small" />
          <Text style={{ fontSize: 12, fontWeight: 600 }}>Calculating route…</Text>
        </div>
      )}

      {/* Route info card */}
      {routeInfo && !routing && (
        <div style={{
          position: 'absolute', bottom: 12, left: 12, right: 12,
          background: isDark ? 'rgba(20,20,40,0.92)' : 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(12px)',
          borderRadius: 14, padding: '12px 16px',
          boxShadow: '0 6px 24px rgba(0,0,0,0.15)',
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(22,119,255,0.12)',
          display: 'flex', alignItems: 'stretch', gap: 0,
        }}>
          {/* From → To summary */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, paddingRight: 16 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: '#1677ff', flexShrink: 0,
              boxShadow: '0 0 0 3px rgba(22,119,255,0.2)',
            }} />
            <Text style={{ fontSize: 11, flex: 1 }} ellipsis={{ tooltip: fromLoc?.address }}>
              {fromLoc?.address?.split(',')[0]}
            </Text>
            <SwapRightOutlined style={{ color: '#999', fontSize: 12 }} />
            <Text style={{ fontSize: 11, flex: 1 }} ellipsis={{ tooltip: toLoc?.address }}>
              {toLoc?.address?.split(',')[0]}
            </Text>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: '#52c41a', flexShrink: 0,
              boxShadow: '0 0 0 3px rgba(82,196,26,0.2)',
            }} />
          </div>

          {/* Divider */}
          <div style={{ width: 1, background: 'rgba(128,128,128,0.2)', margin: '0 16px' }} />

          {/* Distance only */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              <EnvironmentOutlined style={{ color: '#1677ff', fontSize: 14 }} />
              <span style={{ fontWeight: 800, fontSize: 18, color: '#1677ff' }}>{routeInfo.distanceText}</span>
            </div>
            <div style={{ fontSize: 10, color: '#888', marginTop: 1 }}>Route Distance</div>
          </div>
        </div>
      )}
    </div>
  );
}
