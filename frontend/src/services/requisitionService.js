import apiClient from './apiClient';

const BASE = '/requisitions';
export const requisitionService = {
  getAll:    ()         => apiClient.get(BASE),
  getById:   (id)       => apiClient.get(`${BASE}/${id}`),
  create:    (data)     => apiClient.post(BASE, data),
  update:    (id, data) => apiClient.put(`${BASE}/${id}`, data),
  remove:    (id)       => apiClient.delete(`${BASE}/${id}`),
  setStatus: (id, body) => apiClient.patch(`${BASE}/${id}/status`, body),
};
