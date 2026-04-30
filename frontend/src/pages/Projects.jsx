import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../api/projects';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { HiOutlinePlus, HiOutlineCollection, HiOutlineTrash } from 'react-icons/hi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './Projects.css';

const STATUS_BADGES = {
  active: { variant: 'success', label: 'Active' },
  archived: { variant: 'default', label: 'Archived' },
  completed: { variant: 'primary', label: 'Completed' },
};

const STATUS_FILTERS = [
  { value: null, label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '', color: '#6366f1', icon: '📁' });
  const navigate = useNavigate();

  const loadProjects = async () => {
    try {
      const { data } = await projectsAPI.list(statusFilter);
      setProjects(data);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProjects(); }, [statusFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return toast.error('Title is required');
    try {
      await projectsAPI.create(formData);
      toast.success('Project created!');
      setCreateModal(false);
      setFormData({ title: '', description: '', color: '#6366f1', icon: '📁' });
      loadProjects();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await projectsAPI.delete(deleteConfirm.id);
      toast.success('Project deleted');
      setDeleteConfirm(null);
      loadProjects();
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="projects-page animate-fade-in">
      <div className="files-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Organize your work into projects</p>
        </div>
        <Button icon={<HiOutlinePlus />} onClick={() => setCreateModal(true)} size="sm">
          New Project
        </Button>
      </div>

      {/* Status Filters */}
      <div className="project-filters">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            className={`filter-btn ${statusFilter === f.value ? 'filter-active' : ''}`}
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="files-loading"><div className="spinner" /></div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<HiOutlineCollection />}
          title="No projects yet"
          description="Create your first project to start organizing"
          action={
            <Button icon={<HiOutlinePlus />} onClick={() => setCreateModal(true)} size="sm">
              Create Project
            </Button>
          }
        />
      ) : (
        <div className="projects-grid stagger-children">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="project-card"
              hover
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <div className="project-card-top">
                <div
                  className="project-color-bar"
                  style={{ background: project.color }}
                />
                <button
                  className="project-delete"
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirm(project); }}
                >
                  <HiOutlineTrash />
                </button>
              </div>
              <div className="project-icon">{project.icon || '📁'}</div>
              <h3 className="project-title truncate">{project.title}</h3>
              {project.description && (
                <p className="project-desc">{project.description}</p>
              )}
              <div className="project-card-footer">
                <Badge variant={STATUS_BADGES[project.status]?.variant || 'default'} dot>
                  {STATUS_BADGES[project.status]?.label || project.status}
                </Badge>
                <span className="project-note-count">{project.note_count} notes</span>
              </div>
              <span className="project-date">
                {format(new Date(project.created_at), 'MMM d, yyyy')}
              </span>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="New Project">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            id="project-title"
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="My Project"
            autoFocus
          />
          <Input
            id="project-desc"
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description..."
          />
          <div style={{ display: 'flex', gap: 16 }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Icon (emoji)</label>
              <input
                className="input-field"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                maxLength={2}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Color</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="color-picker"
              />
            </div>
          </div>
          <Button type="submit" fullWidth>Create Project</Button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Project"
        message={`Delete "${deleteConfirm?.title}" and all its notes? This cannot be undone.`}
      />
    </div>
  );
}
