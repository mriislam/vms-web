import apiClient from './apiClient';

export const dashboardService = {
  getStats: () => apiClient.get('/dashboard/stats'),
};
