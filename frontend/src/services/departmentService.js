import apiClient from './apiClient';

const BASE = '/departments';
export const departmentService = {
  getAll:   ()         => apiClient.get(BASE),
  getActive:()         => apiClient.get(`${BASE}/active`),
  getById:  (id)       => apiClient.get(`${BASE}/${id}`),
  create:   (data)     => apiClient.post(BASE, data),
  update:   (id, data) => apiClient.put(`${BASE}/${id}`, data),
  remove:   (id)       => apiClient.delete(`${BASE}/${id}`),
  seed:     ()         => apiClient.post(`${BASE}/seed`),
};
