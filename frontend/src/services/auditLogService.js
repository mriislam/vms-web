import apiClient from './apiClient';

export const auditLogService = {
  getAll:    ()              => apiClient.get('/audit-log'),
  getRecent: (limit = 20)   => apiClient.get(`/audit-log/recent?limit=${limit}`),
};
