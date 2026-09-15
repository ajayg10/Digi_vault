import { useState, useEffect, useCallback } from 'react';
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
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function Trash() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const loadTrash = useCallback(async () => {
    try {
      const { data } = await filesAPI.listTrash();
      setFiles(data);
    } catch {
      toast.error('Failed to load trash');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  const handleRestore = async (fileId) => {
    try {
      await filesAPI.restore(fileId);
      toast.success('File restored to vault!');
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
      toast.error('Permanent delete failed');
    }
  };

  return (
    <div className="trash-page animate-fade-in">
      <div className="trash-header">
        <div>
          <h1 className="page-title">Trash</h1>
          <p className="page-subtitle">
            Deleted items remain safely recoverable until permanently expunged.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="trash-loading">
          <div className="spinner" />
        </div>
      ) : files.length === 0 ? (
        <EmptyState
          icon={<HiOutlineTrash />}
          title="Trash is clean"
          description="There are no deleted files in your vault. Deleted items will be held here."
        />
      ) : (
        <Card className="trash-table-card">
          <div className="table-wrapper">
            <table className="vault-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }} />
                  <th>Filename</th>
                  <th>Original Size</th>
                  <th>Deleted On</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id} className="vault-row">
                    <td>
                      <div className="trash-icon-wrap">
                        <HiOutlineDocument />
                      </div>
                    </td>
                    <td>
                      <span className="file-cell-title truncate" title={file.original_filename}>
                        {file.original_filename}
                      </span>
                    </td>
                    <td className="meta-cell">{formatSize(file.size_bytes)}</td>
                    <td className="meta-cell">
                      {format(new Date(file.deleted_at || file.created_at), 'MMM d, yyyy · h:mm a')}
                    </td>
                    <td>
                      <div className="row-actions">
                        <Button
                          variant="secondary"
                          size="xs"
                          icon={<HiOutlineRefresh />}
                          onClick={() => handleRestore(file.id)}
                        >
                          Restore
                        </Button>
                        <Button
                          variant="danger"
                          size="xs"
                          icon={<HiOutlineTrash />}
                          onClick={() => setDeleteConfirm(file)}
                        >
                          Delete Forever
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handlePermanentDelete}
        title="Permanently Delete File"
        message={`This will irrevocably destroy "${deleteConfirm?.original_filename}" from your vault storage. This action cannot be reversed.`}
        confirmText="Delete Forever"
        variant="danger"
      />
    </div>
  );
}
