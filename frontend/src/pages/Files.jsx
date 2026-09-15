import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  HiOutlineSearch,
  HiOutlineStar,
  HiStar,
  HiOutlineDownload,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineFolder,
  HiOutlineFolderAdd,
  HiOutlineDocument,
  HiOutlinePhotograph,
  HiOutlineFilm,
  HiOutlineMusicNote,
  HiOutlineCode,
  HiOutlineDocumentText,
  HiOutlineViewGrid,
  HiOutlineViewList,
  HiOutlineCloudUpload,
  HiOutlineX,
  HiOutlineChevronRight,
  HiOutlineAdjustments,
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
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const CATEGORIES = [
  { id: 'all', label: 'All Files' },
  { id: 'documents', label: 'Documents' },
  { id: 'images', label: 'Images' },
  { id: 'media', label: 'Audio & Video' },
  { id: 'code', label: 'Code & Data' },
];

export default function Files() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearchQuery = searchParams.get('q') || '';

  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [quota, setQuota] = useState(null);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery);
  const [searchResults, setSearchResults] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // View & Filter states
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc'); // 'date-desc', 'date-asc', 'name-asc', 'size-desc'
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Modals
  const [folderModal, setFolderModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [folderDeleteConfirm, setFolderDeleteConfirm] = useState(null);
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState('#C6533D');
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

  const performSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const { data } = await filesAPI.search(q.trim());
      setSearchResults(data);
    } catch {
      toast.error('Search failed');
    }
  }, []);

  // If query in URL, perform search
  useEffect(() => {
    if (urlSearchQuery) {
      setSearchQuery(urlSearchQuery);
      performSearch(urlSearchQuery);
    }
  }, [urlSearchQuery, performSearch]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    performSearch(searchQuery);
    if (searchQuery) {
      setSearchParams({ q: searchQuery });
    } else {
      setSearchParams({});
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setSearchParams({});
  };

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      await filesAPI.upload(file, currentFolder);
      toast.success('File stored in vault!');
      setShowUploadModal(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
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
      await filesAPI.createFolder(folderName.trim(), currentFolder, folderColor);
      toast.success('Folder created!');
      setFolderModal(false);
      setFolderName('');
      loadData();
    } catch {
      toast.error('Failed to create folder');
    }
  };

  const handleDeleteFolder = async () => {
    if (!folderDeleteConfirm) return;
    try {
      await filesAPI.deleteFolder(folderDeleteConfirm.id);
      toast.success('Folder deleted');
      setFolderDeleteConfirm(null);
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

  // Filter & Sort Logic
  const displayFiles = useMemo(() => {
    let source = searchResults !== null ? searchResults : files;

    // Filter by category
    if (categoryFilter === 'documents') {
      source = source.filter(
        (f) =>
          f.mime_type?.includes('pdf') ||
          f.mime_type?.includes('word') ||
          f.mime_type?.includes('text') ||
          f.mime_type?.includes('document')
      );
    } else if (categoryFilter === 'images') {
      source = source.filter((f) => f.mime_type?.startsWith('image/'));
    } else if (categoryFilter === 'media') {
      source = source.filter(
        (f) => f.mime_type?.startsWith('video/') || f.mime_type?.startsWith('audio/')
      );
    } else if (categoryFilter === 'code') {
      source = source.filter(
        (f) =>
          f.mime_type?.includes('json') ||
          f.mime_type?.includes('javascript') ||
          f.mime_type?.includes('html') ||
          f.mime_type?.includes('code') ||
          f.mime_type?.includes('zip') ||
          f.mime_type?.includes('tar')
      );
    }

    // Sort
    return [...source].sort((a, b) => {
      if (sortBy === 'name-asc') {
        return a.original_filename.localeCompare(b.original_filename);
      }
      if (sortBy === 'name-desc') {
        return b.original_filename.localeCompare(a.original_filename);
      }
      if (sortBy === 'size-desc') {
        return (b.size_bytes || 0) - (a.size_bytes || 0);
      }
      if (sortBy === 'size-asc') {
        return (a.size_bytes || 0) - (b.size_bytes || 0);
      }
      if (sortBy === 'date-asc') {
        return new Date(a.created_at) - new Date(b.created_at);
      }
      // default: date-desc
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [files, searchResults, categoryFilter, sortBy]);

  // Current folder name lookup
  const currentFolderName = folders.find((f) => f.id === currentFolder)?.name || 'Folder';

  return (
    <div className="vault-page animate-fade-in">
      {/* Centerpiece Header */}
      <div className="vault-header">
        <div>
          <h1 className="page-title">My Vault</h1>
          <p className="page-subtitle">Securely store, organize, and find your files.</p>
        </div>
        <div className="vault-header-actions">
          <Button
            variant="secondary"
            icon={<HiOutlineFolderAdd />}
            onClick={() => setFolderModal(true)}
            size="md"
          >
            New Folder
          </Button>
          <Button
            variant="primary"
            icon={<HiOutlineCloudUpload />}
            onClick={() => setShowUploadModal(true)}
            size="md"
          >
            Upload Files
          </Button>
        </div>
      </div>

      {/* Storage Quota Bar */}
      {quota && (
        <Card className="vault-quota-card">
          <StorageQuotaBar quota={quota} />
        </Card>
      )}

      {/* Toolbar: Search, Filters, Sort, View Toggle */}
      <div className="vault-toolbar">
        {/* Search */}
        <form className="vault-search-form" onSubmit={handleSearchSubmit}>
          <HiOutlineSearch className="vault-search-icon" />
          <input
            type="search"
            className="vault-search-input"
            placeholder="Search files, folders or tags..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!e.target.value) setSearchResults(null);
            }}
          />
          {searchResults !== null && (
            <button
              type="button"
              className="vault-search-clear"
              onClick={handleClearSearch}
              title="Clear search"
            >
              <HiOutlineX />
            </button>
          )}
        </form>

        {/* Categories / Type Filters */}
        <div className="vault-categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`cat-chip ${categoryFilter === cat.id ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sort & View Controls */}
        <div className="vault-controls">
          <div className="vault-sort-wrap">
            <HiOutlineAdjustments className="vault-sort-icon" />
            <select
              className="vault-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort files"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name-asc">Name (A–Z)</option>
              <option value="name-desc">Name (Z–A)</option>
              <option value="size-desc">Largest Size</option>
              <option value="size-asc">Smallest Size</option>
            </select>
          </div>

          <div className="view-toggle-wrap">
            <button
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Table View"
              aria-label="Table view"
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
      </div>

      {/* Active Search Result Pill */}
      {searchResults !== null && (
        <div className="search-result-banner">
          <span>Found {searchResults.length} matching file(s) for &ldquo;{searchQuery}&rdquo;</span>
          <button className="search-banner-clear" onClick={handleClearSearch}>
            Reset search
          </button>
        </div>
      )}

      {/* Folder Breadcrumb */}
      {currentFolder && (
        <div className="vault-breadcrumb">
          <button onClick={() => setCurrentFolder(null)} className="v-bread-link">
            Root Vault
          </button>
          <HiOutlineChevronRight className="v-bread-sep" />
          <span className="v-bread-current">{currentFolderName}</span>
        </div>
      )}

      {/* Folders Section */}
      {!searchResults && folders.length > 0 && (
        <div className="vault-folders-section">
          <div className="folders-header">
            <h2 className="section-title">Folders ({folders.length})</h2>
          </div>
          <div className="folders-grid">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="folder-card"
                onClick={() => setCurrentFolder(folder.id)}
              >
                <div
                  className="folder-icon-circle"
                  style={{
                    backgroundColor: folder.color ? `${folder.color}15` : 'var(--bg-secondary)',
                    color: folder.color || 'var(--accent)',
                  }}
                >
                  <HiOutlineFolder />
                </div>
                <div className="folder-details">
                  <span className="folder-name truncate" title={folder.name}>
                    {folder.name}
                  </span>
                  <span className="folder-file-count">{folder.file_count || 0} files</span>
                </div>
                <button
                  className="folder-del-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFolderDeleteConfirm(folder);
                  }}
                  title="Delete folder"
                  aria-label="Delete folder"
                >
                  <HiOutlineTrash />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files Section */}
      <div className="vault-files-section">
        <div className="files-section-header">
          <h2 className="section-title">
            Files ({displayFiles.length})
          </h2>
        </div>

        {loading ? (
          <div className="vault-loading">
            <div className="spinner" />
          </div>
        ) : displayFiles.length === 0 ? (
          <EmptyState
            icon={<HiOutlineDocument />}
            title={searchResults !== null ? 'No matching files found' : 'No files in this location'}
            description={
              searchResults !== null
                ? 'Try adjusting your search keywords or clearing filters.'
                : 'Upload your first file to begin building your private vault.'
            }
            action={
              searchResults === null && (
                <Button
                  variant="primary"
                  icon={<HiOutlineCloudUpload />}
                  onClick={() => setShowUploadModal(true)}
                  size="sm"
                >
                  Upload File
                </Button>
              )
            }
          />
        ) : viewMode === 'list' ? (
          /* Table View */
          <Card className="vault-table-card">
            <div className="table-wrapper">
              <table className="vault-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }} />
                    <th>Name</th>
                    <th>Tags</th>
                    <th>Modified</th>
                    <th>Size</th>
                    <th style={{ textAlign: 'right', width: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayFiles.map((file) => (
                    <tr key={file.id} className="vault-row">
                      <td>
                        <button
                          className={`star-btn ${file.is_favorite ? 'star-btn-active' : ''}`}
                          onClick={() => handleToggleFavorite(file)}
                          title={file.is_favorite ? 'Remove favorite' : 'Add to favorites'}
                        >
                          {file.is_favorite ? <HiStar /> : <HiOutlineStar />}
                        </button>
                      </td>
                      <td>
                        <div className="file-name-cell">
                          <div className="file-cell-icon">
                            {getFileIcon(file.mime_type)}
                          </div>
                          <div className="file-cell-text">
                            <span className="file-cell-title truncate" title={file.original_filename}>
                              {file.original_filename}
                            </span>
                            {file.description && (
                              <span className="file-cell-desc truncate">
                                {file.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="tags-cell">
                          {file.tags && file.tags.length > 0 ? (
                            file.tags.slice(0, 3).map((tag, i) => (
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
                            title="Download file"
                          >
                            <HiOutlineDownload />
                          </button>
                          <button
                            className="table-action-btn"
                            onClick={() => openEdit(file)}
                            title="Edit tags and description"
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
          <div className="vault-grid stagger-children">
            {displayFiles.map((file) => (
              <Card key={file.id} className="vault-grid-card" hover>
                <div className="grid-card-top">
                  <div className="grid-card-icon-wrap">
                    {getFileIcon(file.mime_type)}
                  </div>
                  <button
                    className={`star-btn ${file.is_favorite ? 'star-btn-active' : ''}`}
                    onClick={() => handleToggleFavorite(file)}
                    title={file.is_favorite ? 'Remove favorite' : 'Add to favorites'}
                  >
                    {file.is_favorite ? <HiStar /> : <HiOutlineStar />}
                  </button>
                </div>
                <div className="grid-card-body">
                  <span className="grid-card-name truncate" title={file.original_filename}>
                    {file.original_filename}
                  </span>
                  <span className="grid-card-meta">
                    {formatSize(file.size_bytes)} · {format(new Date(file.created_at), 'MMM d, yyyy')}
                  </span>
                  {file.tags?.length > 0 && (
                    <div className="grid-card-tags">
                      {file.tags.slice(0, 2).map((t, i) => (
                        <Badge key={i} variant="default" size="sm">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid-card-actions">
                  <button onClick={() => handleDownload(file)} title="Download file">
                    <HiOutlineDownload />
                  </button>
                  <button onClick={() => openEdit(file)} title="Edit file">
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
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Files to Vault"
        size="md"
      >
        <FileUploadZone onUpload={handleUpload} uploading={uploading} />
      </Modal>

      {/* Create Folder Modal */}
      <Modal
        isOpen={folderModal}
        onClose={() => setFolderModal(false)}
        title="Create New Folder"
        size="sm"
      >
        <form onSubmit={handleCreateFolder} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            id="folder-name-input"
            label="Folder Name"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="e.g. Work, Financials, Taxes"
            autoFocus
          />
          <div className="input-group">
            <label className="input-label">Folder Accent Color</label>
            <div className="color-choices">
              {['#C6533D', '#D98A55', '#547A67', '#B9823D', '#4A6B82', '#7E6B8F'].map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch ${folderColor === c ? 'selected' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setFolderColor(c)}
                />
              ))}
            </div>
          </div>
          <Button type="submit" fullWidth>
            Create Folder
          </Button>
        </form>
      </Modal>

      {/* Edit File Modal */}
      <Modal
        isOpen={!!editModal}
        onClose={() => setEditModal(null)}
        title="Edit File Metadata"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            id="edit-file-tags"
            label="Tags (comma separated)"
            value={editData.tags}
            onChange={(e) => setEditData({ ...editData, tags: e.target.value })}
            placeholder="reports, tax2026, contracts"
          />
          <Input
            id="edit-file-desc"
            label="Description"
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            placeholder="Brief note or context..."
          />
          <Button fullWidth onClick={handleEditSave}>
            Save Changes
          </Button>
        </div>
      </Modal>

      {/* Delete File Confirm */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Move to Trash"
        message={`Move "${deleteConfirm?.original_filename}" to trash? You can restore it anytime.`}
        confirmText="Move to Trash"
      />

      {/* Delete Folder Confirm */}
      <ConfirmDialog
        isOpen={!!folderDeleteConfirm}
        onClose={() => setFolderDeleteConfirm(null)}
        onConfirm={handleDeleteFolder}
        title="Delete Folder"
        message={`Delete folder "${folderDeleteConfirm?.name}"? Files inside will be detached.`}
        confirmText="Delete Folder"
      />
    </div>
  );
}
