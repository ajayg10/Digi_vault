import api from './axios';

export const authAPI = {
  signup: (email, password) =>
    api.post('/signup', { email, password }),

  login: (email, password) =>
    api.post('/login', { email, password }),

  refresh: (refresh_token) =>
    api.post('/refresh', { refresh_token }),

  logout: () =>
    api.post('/logout'),

  logoutAll: () =>
    api.post('/logout-all'),

  getProfile: () =>
    api.get('/me'),

  // ─── 2FA ───
  setup2FA: () =>
    api.post('/2fa/setup'),

  enable2FA: (totp_code) =>
    api.post('/2fa/enable', { totp_code }),

  verifyLogin2FA: (pre_auth_token, totp_code) =>
    api.post('/2fa/verify-login', { pre_auth_token, totp_code }),

  disable2FA: (password, totp_code) =>
    api.post('/2fa/disable', { password, totp_code }),

  regenerateBackupCodes: (totp_code) =>
    api.post('/2fa/regenerate-backup-codes', { totp_code }),
};
