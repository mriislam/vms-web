import apiClient from './apiClient';

export const vtsService = {
  getLive: () => apiClient.get('/vts/live'),
};
