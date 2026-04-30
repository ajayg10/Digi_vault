import { useState, useEffect, useCallback } from 'react';
import { filesAPI } from '../api/files';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import FileUploadZone from '../components/FileUploadZone';
import StorageQuotaBar from '../components/StorageQuotaBar';
import {
  HiOutlineSearch, HiOutlineStar, HiStar, HiOutlineDownload,
  HiOutlineTrash, HiOutlinePencil, HiOutlineFolder, HiOutlineFolderAdd,
  HiOutlineDocument, HiOutlinePhotograph, HiOutlineFilm,
  HiOutlineMusicNote, HiOutlineCode, HiOutlineDocumentText,
} from 'react-icons/hi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './Files.css';

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
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function Files() {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [quota, setQuota] = useState(null);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modals
  const [folderModal, setFolderModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState('#6366f1');
  const [editData, setEditData] = useState({ tags: '', description: '' });

  const loadData = useCallback(async () => {
    try {
      const [filesRes, foldersRes, quotaRes] = await Promise.all([
        filesAPI.list(currentFolder),
        filesAPI.listFolders(currentFolder),
        filesAPI.getQuota(),
      ]);
      setFiles(filesRes.data);
      setFolders(foldersRes.data);
      setQuota(quotaRes.data);
    } catch {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [currentFolder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      await filesAPI.upload(file, currentFolder);
      toast.success('File uploaded!');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const { data } = await filesAPI.search(searchQuery);
      setSearchResults(data);
    } catch {
      toast.error('Search failed');
    }
  };

  const handleToggleFavorite = async (file) => {
    try {
      await filesAPI.update(file.id, { is_favorite: !file.is_favorite });
      loadData();
    } catch {
      toast.error('Failed to update');
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
      loadData();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    try {
      await filesAPI.createFolder(folderName, currentFolder, folderColor);
      toast.success('Folder created!');
      setFolderModal(false);
      setFolderName('');
      loadData();
    } catch {
      toast.error('Failed to create folder');
    }
  };

  const handleDeleteFolder = async (folderId) => {
    try {
      await filesAPI.deleteFolder(folderId);
      toast.success('Folder deleted');
      loadData();
    } catch {
      toast.error('Failed to delete folder');
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
      loadData();
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

  const displayFiles = searchResults !== null ? searchResults : files;

  return (
    <div className="files-page animate-fade-in">
      <div className="files-header">
        <div>
          <h1 className="page-title">Files</h1>
          <p className="page-subtitle">Manage your secure vault storage</p>
        </div>
        <div className="files-actions">
          <Button
            variant="secondary"
            icon={<HiOutlineFolderAdd />}
            onClick={() => setFolderModal(true)}
            size="sm"
          >
            New Folder
          </Button>
        </div>
      </div>

      {/* Quota */}
      {quota && (
        <Card className="files-quota">
          <StorageQuotaBar quota={quota} />
        </Card>
      )}

      {/* Search */}
      <div className="files-search">
        <Input
          id="file-search"
          placeholder="Search files by name, tags, or description..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!e.target.value) setSearchResults(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          icon={<HiOutlineSearch />}
        />
        {searchResults !== null && (
          <button className="search-clear" onClick={() => { setSearchQuery(''); setSearchResults(null); }}>
            Clear search ({searchResults.length} results)
          </button>
        )}
      </div>

      {/* Upload zone */}
      <FileUploadZone onUpload={handleUpload} uploading={uploading} />

      {/* Breadcrumb */}
      {currentFolder && (
        <div className="files-breadcrumb">
          <button onClick={() => setCurrentFolder(null)} className="breadcrumb-link">
            Root
          </button>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">Folder</span>
        </div>
      )}

      {/* Folders */}
      {!searchResults && folders.length > 0 && (
        <div className="folders-grid">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="folder-card"
              onClick={() => setCurrentFolder(folder.id)}
            >
              <HiOutlineFolder
                className="folder-icon"
                style={{ color: folder.color }}
              />
              <div className="folder-info">
                <span className="folder-name truncate">{folder.name}</span>
                <span className="folder-count">{folder.file_count} files</span>
              </div>
              <button
                className="folder-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFolder(folder.id);
                }}
                title="Delete folder"
              >
                <HiOutlineTrash />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Files Grid */}
      {loading ? (
        <div className="files-loading"><div className="spinner" /></div>
      ) : displayFiles.length === 0 ? (
        <EmptyState
          icon={<HiOutlineDocument />}
          title="No files here"
          description="Upload your first file using the drop zone above"
        />
      ) : (
        <div className="files-grid">
          {displayFiles.map((file) => (
            <Card key={file.id} className="file-card" hover>
              <div className="file-card-top">
                <div className="file-icon-wrap">
                  {getFileIcon(file.mime_type)}
                </div>
                <button
                  className="file-fav"
                  onClick={() => handleToggleFavorite(file)}
                  title={file.is_favorite ? 'Unfavorite' : 'Favorite'}
                >
                  {file.is_favorite ? <HiStar className="fav-active" /> : <HiOutlineStar />}
                </button>
              </div>
              <div className="file-card-body">
                <span className="file-name truncate">{file.original_filename}</span>
                <span className="file-meta">
                  {formatSize(file.size_bytes)} · {format(new Date(file.created_at), 'MMM d, yyyy')}
                </span>
                {file.tags?.length > 0 && (
                  <div className="file-tags">
                    {file.tags.slice(0, 3).map((tag, i) => (
                      <Badge key={i} variant="primary" size="sm">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="file-card-actions">
                <button onClick={() => handleDownload(file)} title="Download">
                  <HiOutlineDownload />
                </button>
                <button onClick={() => openEdit(file)} title="Edit">
                  <HiOutlinePencil />
                </button>
                <button onClick={() => setDeleteConfirm(file)} title="Delete">
                  <HiOutlineTrash />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Folder Modal */}
      <Modal isOpen={folderModal} onClose={() => setFolderModal(false)} title="New Folder" size="sm">
        <form onSubmit={handleCreateFolder} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            id="folder-name"
            label="Folder Name"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="My Folder"
            autoFocus
          />
          <div className="input-group">
            <label className="input-label">Color</label>
            <input
              type="color"
              value={folderColor}
              onChange={(e) => setFolderColor(e.target.value)}
              className="color-picker"
            />
          </div>
          <Button type="submit" fullWidth>Create Folder</Button>
        </form>
      </Modal>

      {/* Edit File Modal */}
      <Modal isOpen={!!editModal} onClose={() => setEditModal(null)} title="Edit File" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            id="edit-tags"
            label="Tags (comma separated)"
            value={editData.tags}
            onChange={(e) => setEditData({ ...editData, tags: e.target.value })}
            placeholder="work, report, 2024"
          />
          <Input
            id="edit-desc"
            label="Description"
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            placeholder="Optional description..."
          />
          <Button fullWidth onClick={handleEditSave}>Save Changes</Button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete File"
        message={`Move "${deleteConfirm?.original_filename}" to trash?`}
      />
    </div>
  );
}
