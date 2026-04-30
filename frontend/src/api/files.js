import api from './axios';

export const filesAPI = {
  // ─── Files ───
  upload: (file, folderId = null, tags = '', description = '') => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) formData.append('folder_id', folderId);
    if (tags) formData.append('tags', tags);
    if (description) formData.append('description', description);

    return api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  list: (folderId = null, favoritesOnly = false) => {
    const params = {};
    if (folderId) params.folder_id = folderId;
    if (favoritesOnly) params.favorites_only = true;
    return api.get('/files/', { params });
  },

  search: (query) =>
    api.get('/files/search', { params: { q: query } }),

  get: (fileId) =>
    api.get(`/files/${fileId}`),

  download: (fileId) =>
    api.get(`/files/${fileId}/download`, { responseType: 'blob' }),

  update: (fileId, data) =>
    api.put(`/files/${fileId}`, data),

  delete: (fileId, permanent = false) =>
    api.delete(`/files/${fileId}`, { params: { permanent } }),

  // ─── Trash ───
  listTrash: () =>
    api.get('/files/trash/list'),

  restore: (fileId) =>
    api.post(`/files/${fileId}/restore`),

  // ─── Folders ───
  createFolder: (name, parentFolderId = null, color = '#6366f1') =>
    api.post('/files/folders', { name, parent_folder_id: parentFolderId, color }),

  listFolders: (parentId = null) => {
    const params = {};
    if (parentId) params.parent_id = parentId;
    return api.get('/files/folders', { params });
  },

  updateFolder: (folderId, data) =>
    api.put(`/files/folders/${folderId}`, data),

  deleteFolder: (folderId) =>
    api.delete(`/files/folders/${folderId}`),

  // ─── Quota ───
  getQuota: () =>
    api.get('/files/quota/status'),
};
