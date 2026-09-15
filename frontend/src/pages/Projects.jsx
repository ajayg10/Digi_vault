import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../api/projects';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { HiOutlinePlus, HiOutlineCollection, HiOutlineTrash, HiOutlineCalendar } from 'react-icons/hi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './Projects.css';

const STATUS_BADGES = {
  active: { variant: 'success', label: 'Active' },
  archived: { variant: 'default', label: 'Archived' },
  completed: { variant: 'primary', label: 'Completed' },
};

const STATUS_FILTERS = [
  { value: null, label: 'All Projects' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const PRESET_COLORS = ['#C6533D', '#D98A55', '#547A67', '#B9823D', '#3E5C76', '#5C5449'];

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    color: '#C6533D',
    icon: '📁',
  });
  const navigate = useNavigate();

  const loadProjects = useCallback(async () => {
    try {
      const { data } = await projectsAPI.list(statusFilter);
      setProjects(data);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return toast.error('Project title is required');
    try {
      await projectsAPI.create(formData);
      toast.success('Project created!');
      setCreateModal(false);
      setFormData({ title: '', description: '', color: '#C6533D', icon: '📁' });
      loadProjects();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create project');
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
      <div className="projects-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Organize documents, tasks, and ideas into focused workspaces.</p>
        </div>
        <Button icon={<HiOutlinePlus />} onClick={() => setCreateModal(true)} size="md">
          New Project
        </Button>
      </div>

      {/* Filters */}
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
        <div className="projects-loading">
          <div className="spinner" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<HiOutlineCollection />}
          title="No projects found"
          description="Create a project to structure your files, tasks, and notes together."
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
              <div
                className="project-color-bar"
                style={{ background: project.color || 'var(--accent)' }}
              />
              <div className="project-card-header">
                <div className="project-icon-badge">
                  {project.icon || '📁'}
                </div>
                <button
                  className="project-del-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm(project);
                  }}
                  title="Delete project"
                  aria-label="Delete project"
                >
                  <HiOutlineTrash />
                </button>
              </div>

              <div className="project-card-body">
                <h3 className="project-title truncate" title={project.title}>
                  {project.title}
                </h3>
                {project.description && (
                  <p className="project-desc">{project.description}</p>
                )}
              </div>

              <div className="project-card-footer">
                <div className="project-footer-left">
                  <Badge variant={STATUS_BADGES[project.status]?.variant || 'default'} dot size="sm">
                    {STATUS_BADGES[project.status]?.label || project.status}
                  </Badge>
                  <span className="project-note-count">
                    {project.note_count || 0} note(s)
                  </span>
                </div>
                <span className="project-date">
                  <HiOutlineCalendar />
                  {format(new Date(project.created_at), 'MMM d, yyyy')}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create New Project">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            id="project-title-input"
            label="Project Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Q4 Strategy, Legal Documents"
            autoFocus
          />
          <Input
            id="project-desc-input"
            label="Description (optional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="What is this workspace focused on?"
          />
          <div style={{ display: 'flex', gap: 14 }}>
            <div className="input-group" style={{ width: '90px' }}>
              <label className="input-label">Icon</label>
              <input
                className="input-field"
                style={{ textAlign: 'center', fontSize: '1.2rem' }}
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                maxLength={2}
              />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Accent Color</label>
              <div className="color-choices">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-swatch ${formData.color === c ? 'selected' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setFormData({ ...formData, color: c })}
                  />
                ))}
              </div>
            </div>
          </div>
          <Button type="submit" fullWidth>
            Create Project
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Project"
        message={`Delete "${deleteConfirm?.title}" and all its notes? This action cannot be undone.`}
        confirmText="Delete Project"
      />
    </div>
  );
}
