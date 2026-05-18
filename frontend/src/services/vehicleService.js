import apiClient from './apiClient';

const BASE = '/vehicles';
export const vehicleService = {
  getAll:   ()       => apiClient.get(BASE),
  getById:  (id)     => apiClient.get(`${BASE}/${id}`),
  create:   (data)   => apiClient.post(BASE, data),
  update:   (id, data) => apiClient.put(`${BASE}/${id}`, data),
  remove:   (id)     => apiClient.delete(`${BASE}/${id}`),
};
