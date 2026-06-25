import { useEffect, useRef, useState } from 'react';
import { Input, Spin, Typography } from 'antd';
import { EnvironmentOutlined, LoadingOutlined } from '@ant-design/icons';

const { Text } = Typography;

// Load Google Maps JS API once per page lifetime
let _mapsPromise = null;
function loadGoogleMaps(apiKey) {
  if (window.google?.maps?.places) return Promise.resolve();
  if (_mapsPromise) return _mapsPromise;
  _mapsPromise = new Promise((resolve, reject) => {
    const cbName = `__gm_init_${Date.now()}`;
    window[cbName] = () => { delete window[cbName]; resolve(); };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${cbName}`;
    s.async = true;
    s.onerror = () => { _mapsPromise = null; reject(new Error('Google Maps failed to load')); };
    document.head.appendChild(s);
  });
  return _mapsPromise;
}

/**
 * LocationPicker — wraps Google Maps Places Autocomplete in an Ant Design Input.
 *
 * Props:
 *   value    : { address, lat, lng } | null
 *   onChange : (value) => void  — called with { address, lat, lng } or null
 *   placeholder, disabled, size
 */
export default function LocationPicker({ value, onChange, placeholder, disabled, size }) {
  const antRef  = useRef(null);   // Ant Design Input ref
  const acRef   = useRef(null);   // Autocomplete instance
  const [loading, setLoading] = useState(false);
  const [text, setText]       = useState(value?.address ?? '');

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;

  // Keep display text in sync when value is set externally (e.g. edit mode)
  useEffect(() => {
    setText(value?.address ?? '');
  }, [value?.address]);

  useEffect(() => {
    if (!apiKey || disabled) return;
    setLoading(true);

    loadGoogleMaps(apiKey)
      .then(() => {
        setLoading(false);
        const nativeInput = antRef.current?.input;
        if (!nativeInput || acRef.current) return;

        acRef.current = new window.google.maps.places.Autocomplete(nativeInput, {
          fields: ['formatted_address', 'geometry', 'name'],
        });

        acRef.current.addListener('place_changed', () => {
          const place = acRef.current.getPlace();
          if (!place?.geometry?.location) return;
          const loc = {
            address: place.formatted_address || place.name,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };
          setText(loc.address);
          onChange?.(loc);
        });
      })
      .catch(() => setLoading(false));

    return () => {
      if (acRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(acRef.current);
        acRef.current = null;
      }
    };
  }, [apiKey, disabled]);

  const coords = value?.lat != null
    ? `${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}`
    : null;

  return (
    <div>
      <Input
        ref={antRef}
        size={size}
        value={text}
        disabled={disabled}
        placeholder={placeholder ?? 'Search location on map…'}
        prefix={
          loading
            ? <LoadingOutlined style={{ color: '#1677ff' }} />
            : <EnvironmentOutlined style={{ color: value?.lat ? '#52c41a' : '#1677ff' }} />
        }
        onChange={(e) => {
          setText(e.target.value);
          if (!e.target.value) onChange?.(null);
        }}
        style={{ borderColor: value?.lat ? '#52c41a' : undefined }}
      />
      {coords && (
        <Text type="secondary" style={{ fontSize: 11, marginTop: 2, display: 'block' }}>
          📍 {coords}
        </Text>
      )}
    </div>
  );
}
