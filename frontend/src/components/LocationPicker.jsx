import { EnvironmentOutlined, LoadingOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import { useEffect, useRef, useState } from 'react';

// Load Google Maps JS API once (singleton promise)
let _mapsPromise = null;
function loadGoogleMaps(apiKey) {
  if (window.google?.maps?.places) return Promise.resolve();
  if (_mapsPromise) return _mapsPromise;
  _mapsPromise = new Promise((resolve, reject) => {
    const cb = `__gm_${Date.now()}`;
    window[cb] = () => { delete window[cb]; resolve(); };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${cb}`;
    s.async = true;
    s.onerror = () => { _mapsPromise = null; reject(); };
    document.head.appendChild(s);
  });
  return _mapsPromise;
}

/**
 * Google Places Autocomplete wrapped in an Ant Design Input.
 * Props: value { address, lat, lng } | null, onChange(loc | null)
 */
export default function LocationPicker({ value, onChange, placeholder, disabled, size }) {
  const inputRef = useRef(null);
  const acRef    = useRef(null);
  const [loading, setLoading] = useState(false);
  const [text,    setText]    = useState(value?.address ?? '');

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;

  useEffect(() => { setText(value?.address ?? ''); }, [value?.address]);

  useEffect(() => {
    if (!apiKey || disabled) return;
    setLoading(true);
    loadGoogleMaps(apiKey)
      .then(() => {
        setLoading(false);
        const native = inputRef.current?.input;
        if (!native || acRef.current) return;
        acRef.current = new window.google.maps.places.Autocomplete(native, {
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

  const confirmed = !!value?.lat;

  return (
    <Input
      ref={inputRef}
      size={size}
      value={text}
      disabled={disabled}
      placeholder={placeholder ?? 'Search location…'}
      prefix={
        loading
          ? <LoadingOutlined style={{ color: '#6366f1' }} />
          : <EnvironmentOutlined style={{ color: confirmed ? '#10b981' : '#6366f1', transition: 'color 0.2s' }} />
      }
      allowClear
      onChange={(e) => {
        setText(e.target.value);
        if (!e.target.value) onChange?.(null);
      }}
      style={{
        borderRadius: 10,
        borderColor: confirmed ? '#10b981' : undefined,
        boxShadow: confirmed ? '0 0 0 2px rgba(16,185,129,0.12)' : undefined,
      }}
    />
  );
}
