import L from 'leaflet';

/* ── All supported vehicle icon types ─────────────────────────── */
export const VEHICLE_ICONS = [
  { key: 'car',        label: 'Car'         },
  { key: 'suv',        label: 'SUV'         },
  { key: 'pickup',     label: 'Pickup'      },
  { key: 'truck',      label: 'Truck'       },
  { key: 'bus',        label: 'Bus'         },
  { key: 'minibus',    label: 'Minibus'     },
  { key: 'van',        label: 'Van'         },
  { key: 'motorcycle', label: 'Motorcycle'  },
  { key: 'bicycle',    label: 'Bicycle'     },
  { key: 'ambulance',  label: 'Ambulance'   },
  { key: 'police',     label: 'Police'      },
  { key: 'boat',       label: 'Boat'        },
  { key: 'airplane',   label: 'Airplane'    },
  { key: 'helicopter', label: 'Helicopter'  },
  { key: 'tractor',    label: 'Tractor'     },
  { key: 'forklift',   label: 'Forklift'    },
];

/* ── SVG inner paths per icon type (32×32 viewBox, white-filled) ── */
function iconPaths(key, c) {
  switch (key) {
    case 'bus':
      return `<rect fill="white" x="9" y="6" width="14" height="21" rx="2.5"/>
        <rect fill="${c}" opacity="0.5" x="11" y="8" width="10" height="6" rx="1.5"/>
        <rect fill="${c}" opacity="0.5" x="11" y="17" width="10" height="5" rx="1.5"/>
        <circle fill="${c}" opacity="0.8" cx="12.5" cy="27.5" r="1.5"/>
        <circle fill="${c}" opacity="0.8" cx="19.5" cy="27.5" r="1.5"/>`;
    case 'truck':
      return `<rect fill="white" x="9" y="5" width="14" height="10" rx="2"/>
        <rect fill="white" x="8" y="14" width="16" height="13" rx="1.5"/>
        <rect fill="${c}" opacity="0.5" x="11" y="7" width="10" height="6" rx="1"/>
        <line stroke="${c}" stroke-width="1.5" x1="8" y1="15.5" x2="24" y2="15.5"/>`;
    case 'pickup':
      return `<rect fill="white" x="9" y="7" width="14" height="9" rx="2"/>
        <rect fill="white" x="8" y="15" width="16" height="11" rx="1.5"/>
        <rect fill="${c}" opacity="0.5" x="11" y="9" width="10" height="5" rx="1"/>`;
    case 'motorcycle':
      return `<ellipse fill="white" cx="16" cy="16" rx="3.5" ry="10"/>
        <circle fill="none" stroke="white" stroke-width="2" cx="16" cy="7" r="3"/>
        <circle fill="none" stroke="white" stroke-width="2" cx="16" cy="25" r="3"/>
        <rect fill="${c}" opacity="0.5" x="13.5" y="14" width="5" height="4" rx="1"/>`;
    case 'bicycle':
      return `<circle fill="none" stroke="white" stroke-width="2" cx="11" cy="21" r="5"/>
        <circle fill="none" stroke="white" stroke-width="2" cx="21" cy="21" r="5"/>
        <path fill="none" stroke="white" stroke-width="1.5" d="M11 21 L16 11 L21 21 M16 11 L18 8"/>
        <line stroke="white" stroke-width="1.5" x1="14" y1="11" x2="18" y2="11"/>`;
    case 'ambulance':
      return `<path fill="white" d="M21 9Q22.5 9 23 11L24 15.5L24 23Q24 24.5 22.5 24.5L9.5 24.5Q8 24.5 8 23L8 15.5L9 11Q9.5 9 11 9Z"/>
        <rect fill="#ff4d4f" x="14.5" y="12" width="3" height="8" rx="1.2"/>
        <rect fill="#ff4d4f" x="11.5" y="14.5" width="9" height="3" rx="1.2"/>`;
    case 'police':
      return `<path fill="white" d="M21 9Q22.5 9 23 11L24 15.5L24 23Q24 24.5 22.5 24.5L9.5 24.5Q8 24.5 8 23L8 15.5L9 11Q9.5 9 11 9Z"/>
        <path fill="${c}" opacity="0.7" d="M16 12L20 13.5V17.5C20 19.5 18 21 16 21.5C14 21 12 19.5 12 17.5V13.5Z"/>
        <rect fill="white" x="14.5" y="14" width="3" height="5" rx="0.8"/>
        <rect fill="white" x="13" y="15.5" width="6" height="2" rx="0.8"/>`;
    case 'boat':
      return `<path fill="white" d="M7 20 L16 6 L25 20 Q22 27 16 27 Q10 27 7 20Z"/>
        <path fill="${c}" opacity="0.4" d="M12 18 L16 10 L20 18 Z"/>
        <line stroke="${c}" stroke-width="1.5" x1="16" y1="10" x2="16" y2="22"/>`;
    case 'airplane':
      return `<path fill="white" d="M16 5L18 13L28 16L18 19L16 27L14 19L4 16L14 13Z"/>`;
    case 'helicopter':
      return `<ellipse fill="white" cx="16" cy="18" rx="6" ry="4"/>
        <rect fill="white" x="5" y="17.5" width="22" height="2" rx="1"/>
        <rect fill="white" x="15.2" y="9" width="1.6" height="10" rx="0.8"/>
        <circle fill="${c}" opacity="0.6" cx="16" cy="18" r="2.5"/>`;
    case 'suv':
      return `<path fill="white" d="M22 10Q23.5 10 24 12L24.5 16L24.5 23.5Q24.5 25 23 25L9 25Q7.5 25 7.5 23.5L7.5 16L8 12Q8.5 10 10 10Z"/>
        <rect fill="${c}" opacity="0.5" x="9.5" y="11.5" width="13" height="5" rx="1.5"/>
        <rect fill="${c}" opacity="0.5" x="9.5" y="21" width="13" height="3" rx="1.5"/>`;
    case 'van':
      return `<rect fill="white" x="8.5" y="7" width="15" height="19" rx="2.5"/>
        <rect fill="${c}" opacity="0.5" x="10.5" y="9" width="11" height="7.5" rx="1.5"/>
        <rect fill="${c}" opacity="0.5" x="10.5" y="19.5" width="11" height="4" rx="1.5"/>`;
    case 'minibus':
      return `<rect fill="white" x="8" y="7.5" width="16" height="18" rx="2.5"/>
        <rect fill="${c}" opacity="0.5" x="10" y="9.5" width="12" height="5" rx="1.5"/>
        <rect fill="${c}" opacity="0.5" x="10" y="17" width="12" height="5" rx="1.5"/>
        <circle fill="${c}" opacity="0.8" cx="12" cy="26" r="1.5"/>
        <circle fill="${c}" opacity="0.8" cx="20" cy="26" r="1.5"/>`;
    case 'tractor':
      return `<circle fill="none" stroke="white" stroke-width="2" cx="13" cy="22" r="5"/>
        <circle fill="none" stroke="white" stroke-width="1.5" cx="21" cy="20" r="3"/>
        <rect fill="white" x="10" y="10" width="13" height="8" rx="2"/>
        <rect fill="${c}" opacity="0.5" x="12" y="12" width="9" height="5" rx="1"/>`;
    case 'forklift':
      return `<rect fill="white" x="8" y="12" width="14" height="14" rx="2"/>
        <rect fill="white" x="22" y="8" width="2" height="14" rx="1"/>
        <rect fill="white" x="22" y="8" width="6" height="2" rx="1"/>
        <circle fill="${c}" opacity="0.7" cx="12" cy="27" r="2"/>
        <circle fill="${c}" opacity="0.7" cx="19" cy="27" r="2"/>`;
    case 'car':
    default:
      return `<path fill="white" d="M21 9Q22.5 9 23 11L24 15.5L24 23Q24 24.5 22.5 24.5L9.5 24.5Q8 24.5 8 23L8 15.5L9 11Q9.5 9 11 9Z"/>
        <rect fill="${c}" opacity="0.55" x="10" y="11" width="12" height="4.5" rx="1.5"/>
        <rect fill="${c}" opacity="0.55" x="10" y="20.5" width="12" height="3" rx="1.5"/>`;
  }
}

/* ── Leaflet divIcon map marker ────────────────────────────────── */
export function makeMapMarker(iconKey = 'car', color = '#52c41a', selected = false) {
  const sz   = selected ? 42 : 34;
  const half = sz / 2;
  const shadow = selected
    ? `drop-shadow(0 4px 14px rgba(0,0,0,0.65)) drop-shadow(0 1px 4px rgba(0,0,0,0.35))`
    : `drop-shadow(0 2px 6px rgba(0,0,0,.50))`;
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${sz}px;height:${sz}px;will-change:transform;transform-origin:center center">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"
           width="${sz}" height="${sz}"
           style="filter:${shadow};display:block">
        <circle cx="16" cy="16" r="15" fill="${color}" stroke="rgba(255,255,255,0.92)" stroke-width="1.8"/>
        ${iconPaths(iconKey, color)}
        <polygon points="16,2 19,7.5 16,6 13,7.5" fill="white" opacity="0.96"/>
      </svg>
    </div>`,
    iconSize:    [sz, sz],
    iconAnchor:  [half, half],
    popupAnchor: [0, -(half + 6)],
  });
}

/* ── Small SVG preview for icon picker (no Leaflet) ───────────── */
export function iconPickerSvg(iconKey, color = '#52c41a') {
  return `<circle cx="16" cy="16" r="15" fill="${color}" stroke="rgba(255,255,255,0.5)" stroke-width="1.2"/>
    ${iconPaths(iconKey, color)}
    <polygon points="16,1.5 19.5,8 16,6 12.5,8" fill="white" opacity="0.9"/>`;
}
