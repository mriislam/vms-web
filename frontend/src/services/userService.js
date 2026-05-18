import apiClient from './apiClient';

const BASE = '/users';
export const userService = {
  getAll:        ()       => apiClient.get(BASE),
  getById:       (id)     => apiClient.get(`${BASE}/${id}`),
  create:        (data)   => apiClient.post(BASE, data),
  update:        (id, data) => apiClient.put(`${BASE}/${id}`, data),
  remove:        (id)     => apiClient.delete(`${BASE}/${id}`),
  resetPassword: (id, body) => apiClient.patch(`${BASE}/${id}/reset-password`, body),
  toggleStatus:  (id)     => apiClient.patch(`${BASE}/${id}/toggle-status`),
};
