import apiClient from './apiClient';

const BASE = '/notices';
export const noticeService = {
  getAll:   ()           => apiClient.get(BASE),
  getById:  (id)         => apiClient.get(`${BASE}/${id}`),
  create:   (data)       => apiClient.post(BASE, data),
  update:   (id, data)   => apiClient.put(`${BASE}/${id}`, data),
  remove:   (id)         => apiClient.delete(`${BASE}/${id}`),
  markRead: (id)         => apiClient.post(`${BASE}/${id}/read`),
  getReads: (id)         => apiClient.get(`${BASE}/${id}/reads`),

  uploadAttachment: (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post(`${BASE}/${id}/attachment`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  removeAttachment: (id) => apiClient.delete(`${BASE}/${id}/attachment`),

  downloadAttachment: async (id, filename) => {
    const res = await apiClient.get(`${BASE}/${id}/attachment`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
