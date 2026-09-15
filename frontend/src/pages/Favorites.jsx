import { useState, useEffect, useCallback } from 'react';
import { filesAPI } from '../api/files';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import {
  HiStar,
  HiOutlineDownload,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineDocument,
  HiOutlinePhotograph,
  HiOutlineFilm,
  HiOutlineMusicNote,
  HiOutlineCode,
  HiOutlineDocumentText,
  HiOutlineViewGrid,
  HiOutlineViewList,
} from 'react-icons/hi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './Favorites.css';

function getFileIcon(mimeType) {
  if (!mimeType) return <HiOutlineDocument />;
  if (mimeType.startsWith('image/')) return <HiOutlinePhotograph />;
  if (mimeType.startsWith('video/')) return <HiOutlineFilm />;
  if (mimeType.startsWith('audio/')) return <HiOutlineMusicNote />;
  if (mimeType.includes('pdf')) return <HiOutlineDocumentText />;
  if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('html'))
    return <HiOutlineCode />;
  return <HiOutlineDocument />;
}

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function Favorites() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [editModal, setEditModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editData, setEditData] = useState({ tags: '', description: '' });

  const loadFavorites = useCallback(async () => {
    try {
      const { data } = await filesAPI.list(null, true);
      setFiles(data);
    } catch {
      toast.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handleToggleFavorite = async (file) => {
    try {
      await filesAPI.update(file.id, { is_favorite: !file.is_favorite });
      toast.success('Removed from favorites');
      loadFavorites();
    } catch {
      toast.error('Failed to update favorite status');
    }
  };

  const handleDownload = async (file) => {
    try {
      const { data } = await filesAPI.download(file.id);
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = file.original_filename;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await filesAPI.delete(deleteConfirm.id, false);
      toast.success('File moved to trash');
      setDeleteConfirm(null);
      loadFavorites();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleEditSave = async () => {
    if (!editModal) return;
    try {
      const tags = editData.tags
        ? editData.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];
      await filesAPI.update(editModal.id, {
        tags,
        description: editData.description,
      });
      toast.success('File updated');
      setEditModal(null);
      loadFavorites();
    } catch {
      toast.error('Update failed');
    }
  };

  const openEdit = (file) => {
    setEditData({
      tags: file.tags?.join(', ') || '',
      description: file.description || '',
    });
    setEditModal(file);
  };

  return (
    <div className="favorites-page animate-fade-in">
      <div className="favorites-header">
        <div>
          <h1 className="page-title">Favorites</h1>
          <p className="page-subtitle">Quick access to starred files across your entire vault</p>
        </div>
        <div className="view-toggle-wrap">
          <button
            className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List View"
            aria-label="List view"
          >
            <HiOutlineViewList />
          </button>
          <button
            className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid View"
            aria-label="Grid view"
          >
            <HiOutlineViewGrid />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="fav-loading">
          <div className="spinner" />
        </div>
      ) : files.length === 0 ? (
        <EmptyState
          icon={<HiStar style={{ color: 'var(--warning)' }} />}
          title="No favorite files yet"
          description="Star your most important files in My Vault for instant access here."
        />
      ) : viewMode === 'list' ? (
        /* List / Table View */
        <Card className="fav-table-card">
          <div className="table-wrapper">
            <table className="vault-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }} />
                  <th>Name</th>
                  <th>Tags</th>
                  <th>Modified</th>
                  <th>Size</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id} className="vault-row">
                    <td>
                      <button
                        className="star-btn-active"
                        onClick={() => handleToggleFavorite(file)}
                        title="Remove from favorites"
                      >
                        <HiStar />
                      </button>
                    </td>
                    <td>
                      <div className="file-name-cell">
                        <div className="file-cell-icon">
                          {getFileIcon(file.mime_type)}
                        </div>
                        <span className="file-cell-title truncate" title={file.original_filename}>
                          {file.original_filename}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="tags-cell">
                        {file.tags && file.tags.length > 0 ? (
                          file.tags.slice(0, 2).map((tag, i) => (
                            <Badge key={i} variant="default" size="sm">
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="empty-meta">—</span>
                        )}
                      </div>
                    </td>
                    <td className="meta-cell">
                      {format(new Date(file.updated_at || file.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="meta-cell">{formatSize(file.size_bytes)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="table-action-btn"
                          onClick={() => handleDownload(file)}
                          title="Download"
                        >
                          <HiOutlineDownload />
                        </button>
                        <button
                          className="table-action-btn"
                          onClick={() => openEdit(file)}
                          title="Edit"
                        >
                          <HiOutlinePencil />
                        </button>
                        <button
                          className="table-action-btn action-delete"
                          onClick={() => setDeleteConfirm(file)}
                          title="Move to trash"
                        >
                          <HiOutlineTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Grid View */
        <div className="fav-grid stagger-children">
          {files.map((file) => (
            <Card key={file.id} className="fav-grid-card" hover>
              <div className="fav-card-top">
                <div className="fav-card-icon-wrap">
                  {getFileIcon(file.mime_type)}
                </div>
                <button
                  className="star-btn-active"
                  onClick={() => handleToggleFavorite(file)}
                  title="Remove from favorites"
                >
                  <HiStar />
                </button>
              </div>
              <div className="fav-card-body">
                <span className="fav-card-name truncate" title={file.original_filename}>
                  {file.original_filename}
                </span>
                <span className="fav-card-meta">
                  {formatSize(file.size_bytes)} · {format(new Date(file.created_at), 'MMM d, yyyy')}
                </span>
                {file.tags?.length > 0 && (
                  <div className="fav-card-tags">
                    {file.tags.slice(0, 2).map((t, i) => (
                      <Badge key={i} variant="default" size="sm">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="fav-card-actions">
                <button onClick={() => handleDownload(file)} title="Download">
                  <HiOutlineDownload />
                </button>
                <button onClick={() => openEdit(file)} title="Edit">
                  <HiOutlinePencil />
                </button>
                <button onClick={() => setDeleteConfirm(file)} title="Move to trash">
                  <HiOutlineTrash />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit File Modal */}
      <Modal isOpen={!!editModal} onClose={() => setEditModal(null)} title="Edit File Details" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            id="edit-fav-tags"
            label="Tags (comma separated)"
            value={editData.tags}
            onChange={(e) => setEditData({ ...editData, tags: e.target.value })}
            placeholder="work, personal, finance"
          />
          <Input
            id="edit-fav-desc"
            label="Description"
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            placeholder="Optional notes or context..."
          />
          <Button fullWidth onClick={handleEditSave}>
            Save Changes
          </Button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Move to Trash"
        message={`Move "${deleteConfirm?.original_filename}" to trash? You can restore it anytime.`}
      />
    </div>
  );
}
