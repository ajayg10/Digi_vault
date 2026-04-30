import { useState, useEffect } from 'react';
import { filesAPI } from '../api/files';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { HiOutlineTrash, HiOutlineRefresh, HiOutlineDocument } from 'react-icons/hi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './Trash.css';

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function Trash() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const loadTrash = async () => {
    try {
      const { data } = await filesAPI.listTrash();
      setFiles(data);
    } catch {
      toast.error('Failed to load trash');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTrash(); }, []);

  const handleRestore = async (fileId) => {
    try {
      await filesAPI.restore(fileId);
      toast.success('File restored!');
      loadTrash();
    } catch {
      toast.error('Restore failed');
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await filesAPI.delete(deleteConfirm.id, true);
      toast.success('File permanently deleted');
      setDeleteConfirm(null);
      loadTrash();
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="trash-page animate-fade-in">
      <div className="files-header">
        <div>
          <h1 className="page-title">Trash</h1>
          <p className="page-subtitle">Deleted files can be restored or permanently removed</p>
        </div>
      </div>

      {loading ? (
        <div className="files-loading"><div className="spinner" /></div>
      ) : files.length === 0 ? (
        <EmptyState
          icon={<HiOutlineTrash />}
          title="Trash is empty"
          description="Deleted files will appear here"
        />
      ) : (
        <div className="trash-list">
          {files.map((file) => (
            <Card key={file.id} className="trash-item" hover>
              <div className="trash-item-icon">
                <HiOutlineDocument />
              </div>
              <div className="trash-item-info">
                <span className="file-name truncate">{file.original_filename}</span>
                <span className="file-meta">
                  {formatSize(file.size_bytes)} · Deleted {format(new Date(file.deleted_at || file.created_at), 'MMM d, yyyy')}
                </span>
              </div>
              <div className="trash-item-actions">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<HiOutlineRefresh />}
                  onClick={() => handleRestore(file.id)}
                >
                  Restore
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={<HiOutlineTrash />}
                  onClick={() => setDeleteConfirm(file)}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handlePermanentDelete}
        title="Permanently Delete"
        message={`This will permanently delete "${deleteConfirm?.original_filename}". This action cannot be undone.`}
        confirmText="Delete Forever"
      />
    </div>
  );
}
