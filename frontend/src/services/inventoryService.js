import apiClient from './apiClient';

const BASE = '/inventory';
export const inventoryService = {
  getAll:   ()       => apiClient.get(BASE),
  getById:  (id)     => apiClient.get(`${BASE}/${id}`),
  create:   (data)   => apiClient.post(BASE, data),
  update:   (id, data) => apiClient.put(`${BASE}/${id}`, data),
  remove:   (id)     => apiClient.delete(`${BASE}/${id}`),
};
