export const C = {
  // Primary palette
  primary:   '#6366f1',  // Electric Indigo
  primary2:  '#4f46e5',
  primaryBg: '#eef1ff',

  // Accent colors
  emerald:   '#10b981',
  emeraldBg: '#f0fdf4',
  cyan:      '#06b6d4',
  cyanBg:    '#ecfeff',
  amber:     '#f59e0b',
  amberBg:   '#fffbeb',
  rose:      '#f43f5e',
  roseBg:    '#fff1f2',
  violet:    '#8b5cf6',
  orange:    '#f97316',
  pink:      '#ec4899',

  // Neutral
  white:     '#ffffff',
  bg:        '#f8faff',
  border:    '#e2e8f0',
  borderLight: 'rgba(99,102,241,0.12)',

  // Text
  text:      '#1e293b',
  textSub:   '#475569',
  textMuted: '#94a3b8',

  // Dark
  dark:      '#0f172a',
  dark2:     '#1e293b',

  // Status
  statusColor: (status) => {
    switch (status) {
      case 'pending':     return '#f59e0b';
      case 'approved':    return '#10b981';
      case 'in_progress': return '#6366f1';
      case 'completed':   return '#64748b';
      case 'rejected':    return '#f43f5e';
      default:            return '#94a3b8';
    }
  },
  statusBg: (status) => {
    switch (status) {
      case 'pending':     return '#fffbeb';
      case 'approved':    return '#f0fdf4';
      case 'in_progress': return '#eef1ff';
      case 'completed':   return '#f1f5f9';
      case 'rejected':    return '#fff1f2';
      default:            return '#f1f5f9';
    }
  },
};
