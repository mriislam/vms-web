import client from './client';

// ── Auth ───────────────────────────────────────────────────────────────────
export const authApi = {
  login:  (data) => client.post('/auth/login', data),
  health: ()     => client.get('/health'),
};

// ── Employee / Requisition ─────────────────────────────────────────────────
export const requisitionApi = {
  getAll:    ()         => client.get('/requisitions'),
  getById:   (id)       => client.get(`/requisitions/${id}`),
  create:    (data)     => client.post('/requisitions', data),
  update:    (id, data) => client.put(`/requisitions/${id}`, data),
  remove:    (id)       => client.delete(`/requisitions/${id}`),
  setStatus: (id, body) => client.patch(`/requisitions/${id}/status`, body),
};

// ── Admin / Dispatch (vehicle_requisition) ─────────────────────────────────
export const dispatchApi = {
  getAll:   ()         => client.get('/vehicle-requisition'),
  getById:  (id)       => client.get(`/vehicle-requisition/${id}`),
  create:   (data)     => client.post('/vehicle-requisition', data),
  update:   (id, data) => client.put(`/vehicle-requisition/${id}`, data),
  advance:  (id)       => client.patch(`/vehicle-requisition/${id}/advance`),
};

// ── Driver ─────────────────────────────────────────────────────────────────
export const driverApi = {
  me:             ()         => client.get('/driver/me'),
  myTrips:        (params)   => client.get('/driver/trips', { params }),
  todayTrips:     ()         => client.get('/driver/trips/today'),
  tripDetail:     (id)       => client.get(`/driver/trips/${id}`),
  tripGeofence:   (id)       => client.get(`/driver/trips/${id}/geofence`),
  startTrip:      (id)       => client.post(`/driver/trips/${id}/start`),
  endTrip:        (id, body) => client.post(`/driver/trips/${id}/end`, body ?? {}),
  myDispatches:   (params)   => client.get('/driver/dispatches', { params }),
  todayDispatches:()         => client.get('/driver/dispatches/today'),
  dispatchDetail: (id)       => client.get(`/driver/dispatches/${id}`),
  startDispatch:  (id)       => client.post(`/driver/dispatches/${id}/start`),
  endDispatch:    (id, body) => client.post(`/driver/dispatches/${id}/end`, body ?? {}),
  updateLocation: (data)     => client.post('/driver/location', data),
  registerFcm:    (token)    => client.post('/driver/fcm-token', { token }),
};

// ── Lookup ─────────────────────────────────────────────────────────────────
export const lookupApi = {
  vehicles: () => client.get('/vehicles'),
  drivers:  () => client.get('/drivers'),
  users:    () => client.get('/users'),
};
