import apiClient from './apiClient';

export const vtsService = {
  getLive:       ()                    => apiClient.get('/vts/live'),
  getLiveOne:    (vehicleReg)          => apiClient.get(`/vts/live/${vehicleReg}`),
  getDevices:    ()                    => apiClient.get('/vts/devices'),
  getHistory:    (vehicleReg, params)  => apiClient.get('/vts/history', { params: { vehicleReg, ...params } }),
};
