import apiClient from './apiClient';

const BASE = '/service-centers';
export const serviceCenterService = {
  getAll:     ()         => apiClient.get(BASE),
  getActive:  ()         => apiClient.get(`${BASE}/active`),
  getById:    (id)       => apiClient.get(`${BASE}/${id}`),
  create:     (data)     => apiClient.post(BASE, data),
  update:     (id, data) => apiClient.put(`${BASE}/${id}`, data),
  remove:     (id)       => apiClient.delete(`${BASE}/${id}`),

  // Parts
  getParts:   (maintId)         => apiClient.get(`${BASE}/maintenance/${maintId}/parts`),
  saveParts:  (maintId, parts)  => apiClient.post(`${BASE}/maintenance/${maintId}/parts`, parts),

  // Workflow
  workflow:   (maintId, body)   => apiClient.patch(`${BASE}/maintenance/${maintId}/workflow`, body),
  getInvoice: (maintId)         => apiClient.get(`${BASE}/maintenance/${maintId}/invoice`),
};
