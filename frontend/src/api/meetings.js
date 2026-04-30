import api from './axios';

export const meetingsAPI = {
  create: (data) =>
    api.post('/meetings/', data),

  list: (upcoming = null, limit = 50) => {
    const params = { limit };
    if (upcoming !== null) params.upcoming = upcoming;
    return api.get('/meetings/', { params });
  },

  get: (meetingId) =>
    api.get(`/meetings/${meetingId}`),

  update: (meetingId, data) =>
    api.put(`/meetings/${meetingId}`, data),

  delete: (meetingId) =>
    api.delete(`/meetings/${meetingId}`),

  getCallToken: (meetingId) =>
    api.get(`/meetings/${meetingId}/call-token`),

  getParticipants: (meetingId) =>
    api.get(`/meetings/${meetingId}/participants`),

  saveRecording: (meetingId, data) =>
    api.post(`/meetings/${meetingId}/recording`, data),
};
