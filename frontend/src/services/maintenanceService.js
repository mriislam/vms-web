import apiClient from './apiClient';

const BASE = '/maintenance';
export const maintenanceService = {
  getAll:   ()       => apiClient.get(BASE),
  getById:  (id)     => apiClient.get(`${BASE}/${id}`),
  create:   (data)   => apiClient.post(BASE, data),
  update:   (id, data) => apiClient.put(`${BASE}/${id}`, data),
  remove:   (id)     => apiClient.delete(`${BASE}/${id}`),
  advance:  (id)     => apiClient.patch(`${BASE}/${id}/advance`),
};
