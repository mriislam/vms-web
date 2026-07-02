import apiClient from './apiClient';

export const tenantService = {
  // Public — no auth needed
  resolve:    (slug)       => apiClient.get(`/tenants/resolve/${slug}`),

  // Super-admin endpoints
  getAll:     ()           => apiClient.get('/tenants'),
  getById:    (id)         => apiClient.get(`/tenants/${id}`),
  create:     (data)       => apiClient.post('/tenants', data),
  update:     (id, data)   => apiClient.put(`/tenants/${id}`, data),
  remove:     (id)         => apiClient.delete(`/tenants/${id}`),
  provision:  (id, data)   => apiClient.post(`/tenants/${id}/provision`, data),
  stats:      (id)         => apiClient.get(`/tenants/${id}/stats`),
};
