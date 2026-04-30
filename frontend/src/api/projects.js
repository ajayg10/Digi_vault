import api from './axios';

export const projectsAPI = {
  // ─── Projects ───
  create: (data) =>
    api.post('/projects/', data),

  list: (statusFilter = null) => {
    const params = {};
    if (statusFilter) params.status_filter = statusFilter;
    return api.get('/projects/', { params });
  },

  get: (projectId) =>
    api.get(`/projects/${projectId}`),

  update: (projectId, data) =>
    api.put(`/projects/${projectId}`, data),

  delete: (projectId) =>
    api.delete(`/projects/${projectId}`),

  // ─── Notes ───
  createNote: (projectId, data) =>
    api.post(`/projects/${projectId}/notes`, data),

  listNotes: (projectId, noteType = null) => {
    const params = {};
    if (noteType) params.note_type = noteType;
    return api.get(`/projects/${projectId}/notes`, { params });
  },

  updateNote: (projectId, noteId, data) =>
    api.put(`/projects/${projectId}/notes/${noteId}`, data),

  deleteNote: (projectId, noteId) =>
    api.delete(`/projects/${projectId}/notes/${noteId}`),
};
