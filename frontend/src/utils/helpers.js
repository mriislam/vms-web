import dayjs from 'dayjs';

export const formatDate = (date, fmt = 'DD MMM YYYY') =>
  date ? dayjs(date).format(fmt) : '—';

export const formatDateTime = (date) =>
  date ? dayjs(date).format('DD MMM YYYY, HH:mm') : '—';

export const formatCurrency = (amount, currency = 'BDT') =>
  new Intl.NumberFormat('en-BD', { style: 'currency', currency }).format(amount ?? 0);

export const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';

export const statusColor = (status) => {
  const map = {
    active: 'green',
    inactive: 'red',
    pending: 'orange',
    approved: 'green',
    rejected: 'red',
    in_progress: 'blue',
    completed: 'cyan',
  };
  return map[status?.toLowerCase()] ?? 'default';
};
