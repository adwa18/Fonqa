// src/services/api.js
import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: BASE, timeout: 15000 });

api.interceptors.request.use((config) => {
  // Ensure headers object always exists before we write to it
  config.headers = config.headers || {};

  const initData = window.Telegram?.WebApp?.initData || '';
  if (initData) {
    config.headers['x-telegram-init-data'] = initData;
  }

  const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param || '';
  if (startParam?.startsWith('ref_')) {
    config.headers['x-referral-code'] = startParam.replace('ref_', '');
  }

  // For FormData let the browser set Content-Type (with boundary).
  // Delete any manually set value so axios does not override it.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  return config;
});

api.interceptors.response.use(
  r => r.data,
  err => Promise.reject(new Error(
    err.response?.data?.error || err.response?.data?.message || err.message || 'Error'
  ))
);

export const authAPI = {
  login: ()   => api.post('/auth/login'),
  me:    ()   => api.get('/auth/me'),
};

export const profileAPI = {
  create:            (data)   => api.post('/profiles', data),
  me:                ()       => api.get('/profiles/me'),
  getById:           (id)     => api.get(`/profiles/${id}`),
  updatePreferences: (data)   => api.patch('/profiles/preferences', data),
  deleteAccount:     ()       => api.delete('/profiles/me'),
};

export const swipeAPI = {
  getCandidates: ()                       => api.get('/swipes/candidates'),
  swipe:         (receiverId, direction)  => api.post('/swipes', { receiverId, direction }),
  getLikedMe:    ()                       => api.get('/swipes/liked-me'),
};

export const matchAPI = {
  list:    ()        => api.get('/matches'),
  unmatch: (matchId) => api.delete(`/matches/${matchId}`),
};

export const messageAPI = {
  history: (matchId, cursor) => api.get(`/messages/${matchId}`, { params: { cursor, limit: 30 } }),
  send:    (matchId, content) => api.post(`/messages/${matchId}`, { content }),
};

export const uploadAPI = {
  uploadPhoto: (file, onProgress) => {
    const fd = new FormData();
    fd.append('photo', file);
    // Do NOT set Content-Type manually — axios/browser must set it
    // so the multipart boundary is included correctly.
    // The request interceptor still adds x-telegram-init-data.
    return api.post('/uploads/photo', fd, {
      onUploadProgress: e => onProgress?.(Math.round(e.loaded * 100 / e.total)),
    });
  },
  deletePhoto:  (photoId) => api.delete(`/uploads/photo/${photoId}`),
  setMainPhoto: (photoId) => api.patch(`/uploads/photo/${photoId}/main`),
};

export const premiumAPI = {
  status:        ()   => api.get('/premium/status'),
  submitPayment: (fd) => api.post('/premium/request', fd),
  // fd must be a FormData object — do not set Content-Type header
};

export const verifyAPI = {
  status:       () => api.get('/verify/status'),
  submitSelfie: (file) => {
    const fd = new FormData();
    fd.append('selfie', file);
    return api.post('/verify/selfie', fd);
  },
};

export const referralAPI = {
  me: () => api.get('/referrals/me'),
};

export const reportAPI = {
  report: (data)   => api.post('/reports', data),
  block:  (userId) => api.post(`/reports/block/${userId}`),
};

export const adminAPI = {
  stats:               ()         => api.get('/admin/stats'),
  users:               (p, s)     => api.get('/admin/users', { params: { page: p, search: s } }),
  banUser:             (id, r)    => api.post(`/admin/users/${id}/ban`, { reason: r }),
  unbanUser:           (id)       => api.post(`/admin/users/${id}/unban`),
  reports:             (status)   => api.get('/admin/reports', { params: { status } }),
  updateReport:        (id, data) => api.patch(`/admin/reports/${id}`, data),
  payments:            (status)   => api.get('/admin/payments', { params: { status } }),
  approvePayment:      (id)       => api.post(`/admin/payments/${id}/approve`),
  rejectPayment:       (id, r)    => api.post(`/admin/payments/${id}/reject`, { reason: r }),
  verifications:       ()         => api.get('/admin/verifications'),
  approveVerification: (id)       => api.post(`/admin/verifications/${id}/approve`),
  rejectVerification:  (id, r)    => api.post(`/admin/verifications/${id}/reject`, { reason: r }),
};

export default api;
