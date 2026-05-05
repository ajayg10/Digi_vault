import api from './axios';

export const subscriptionAPI = {
  getPlans: () =>
    api.get('/subscription/plans'),

  getStatus: () =>
    api.get('/subscription/status'),

  createOrder: (plan, billing_cycle) =>
    api.post('/subscription/create-order', { plan, billing_cycle }),

  verifyPayment: (data) =>
    api.post('/subscription/verify-payment', data),

  cancel: () =>
    api.post('/subscription/cancel'),
};
