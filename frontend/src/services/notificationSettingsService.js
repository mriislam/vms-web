import apiClient from './apiClient';

export const notificationSettingsService = {
  getAll: () => apiClient.get('/notification-settings'),

  save: (channel, payload) =>
    apiClient.put(`/notification-settings/${channel}`, payload),

  test: (channel, target) =>
    apiClient.post(`/notification-settings/${channel}/test`, { target }),
};
