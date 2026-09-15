import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI } from '../api/projects';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input, { TextArea } from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import {
  HiOutlinePlus,
  HiOutlineArrowLeft,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineLightBulb,
  HiOutlineCheckCircle,
  HiOutlineLink,
  HiOutlineDocumentText,
  HiCheckCircle,
} from 'react-icons/hi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './ProjectDetail.css';

const NOTE_TYPES = [
  { value: null, label: 'All Items', icon: null },
  { value: 'note', label: 'Notes', icon: <HiOutlineDocumentText /> },
  { value: 'idea', label: 'Ideas', icon: <HiOutlineLightBulb /> },
  { value: 'task', label: 'Tasks', icon: <HiOutlineCheckCircle /> },
  { value: 'link', label: 'Links', icon: <HiOutlineLink /> },
];

const PRIORITY_LABELS = ['None', 'Low', 'Medium', 'High'];
const PRIORITY_VARIANTS = ['default', 'info', 'warning', 'danger'];
const PRESET_COLORS = ['#C6533D', '#D98A55', '#547A67', '#B9823D', '#3E5C76', '#5C5449'];

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noteFilter, setNoteFilter] = useState(null);
  const [noteModal, setNoteModal] = useState(false);
  const [editNote, setEditNote] = useState(null);
  const [deleteNote, setDeleteNote] = useState(null);
  const [editProject, setEditProject] = useState(false);
  const [noteForm, setNoteForm] = useState({
    title: '',
    content: '',
    note_type: 'note',
    priority: 0,
    due_date: '',
  });
  const [projectForm, setProjectForm] = useState({});

  const loadProject = useCallback(async () => {
    try {
      const { data } = await projectsAPI.get(id);
      setProject(data);
      setProjectForm({
        title: data.title,
        description: data.description || '',
        status: data.status,
        color: data.color,
        icon: data.icon || '📁',
      });
    } catch {
      toast.error('Project not found');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const loadNotes = useCallback(async () => {
    try {
      const { data } = await projectsAPI.listNotes(id, noteFilter);
      setNotes(data);
    } catch {
      toast.error('Failed to load notes');
    }
  }, [id, noteFilter]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  useEffect(() => {
    if (project) loadNotes();
  }, [project, loadNotes]);

  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!noteForm.content.trim()) return toast.error('Content is required');
    try {
      const payload = { ...noteForm };
      if (!payload.due_date) delete payload.due_date;
      if (!payload.title) delete payload.title;
      await projectsAPI.createNote(id, payload);
      toast.success('Note added!');
      setNoteModal(false);
      setNoteForm({ title: '', content: '', note_type: 'note', priority: 0, due_date: '' });
      loadNotes();
      loadProject();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create note');
    }
  };

  const handleUpdateNote = async (e) => {
    e.preventDefault();
    if (!editNote) return;
    try {
      await projectsAPI.updateNote(id, editNote.id, noteForm);
      toast.success('Note updated');
      setEditNote(null);
      loadNotes();
    } catch {
      toast.error('Update failed');
    }
  };

  const handleToggleComplete = async (note) => {
    try {
      await projectsAPI.updateNote(id, note.id, { completed: !note.completed });
      loadNotes();
    } catch {
      toast.error('Update failed');
    }
  };

  const handleDeleteNote = async () => {
    if (!deleteNote) return;
    try {
      await projectsAPI.deleteNote(id, deleteNote.id);
      toast.success('Note deleted');
      setDeleteNote(null);
      loadNotes();
      loadProject();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    try {
      await projectsAPI.update(id, projectForm);
      toast.success('Project updated');
      setEditProject(false);
      loadProject();
    } catch {
      toast.error('Update failed');
    }
  };

  const openEditNote = (note) => {
    setNoteForm({
      title: note.title || '',
      content: note.content,
      note_type: note.note_type,
      priority: note.priority,
      due_date: note.due_date || '',
    });
    setEditNote(note);
  };

  if (loading) {
    return (
      <div className="pd-loading">
        <div className="spinner" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="project-detail animate-fade-in">
      {/* Header */}
      <div className="pd-header">
        <button className="pd-back" onClick={() => navigate('/projects')}>
          <HiOutlineArrowLeft /> Back to Projects
        </button>
        <div className="pd-header-row">
          <div className="pd-header-info">
            <div
              className="pd-icon"
              style={{
                backgroundColor: project.color ? `${project.color}18` : 'var(--bg-secondary)',
                color: project.color || 'var(--accent)',
              }}
            >
              {project.icon || '📁'}
            </div>
            <div>
              <h1 className="page-title">{project.title}</h1>
              {project.description && (
                <p className="page-subtitle">{project.description}</p>
              )}
            </div>
          </div>
          <div className="pd-header-actions">
            <Badge
              variant={
                project.status === 'active'
                  ? 'success'
                  : project.status === 'completed'
                  ? 'primary'
                  : 'default'
              }
              dot
              size="md"
            >
              {project.status}
            </Badge>
            <Button
              variant="secondary"
              size="sm"
              icon={<HiOutlinePencil />}
              onClick={() => setEditProject(true)}
            >
              Edit Project
            </Button>
          </div>
        </div>
      </div>

      {/* Notes Section Toolbar */}
      <div className="pd-notes-header">
        <h2 className="section-title">Workspace Notes & Tasks ({notes.length})</h2>
        <Button icon={<HiOutlinePlus />} size="sm" onClick={() => setNoteModal(true)}>
          Add Item
        </Button>
      </div>

      {/* Type Filter */}
      <div className="project-filters" style={{ marginBottom: 18 }}>
        {NOTE_TYPES.map((t) => (
          <button
            key={t.label}
            className={`filter-btn ${noteFilter === t.value ? 'filter-active' : ''}`}
            onClick={() => setNoteFilter(t.value)}
          >
            {t.icon && <span style={{ marginRight: 5, verticalAlign: 'middle' }}>{t.icon}</span>}
            {t.label}
          </button>
        ))}
      </div>

      {/* Notes List */}
      {notes.length === 0 ? (
        <EmptyState
          icon={<HiOutlineDocumentText />}
          title="No items in this category"
          description="Capture thoughts, task checklists, or research links for this project."
          action={
            <Button icon={<HiOutlinePlus />} size="sm" onClick={() => setNoteModal(true)}>
              Add First Item
            </Button>
          }
        />
      ) : (
        <div className="notes-list stagger-children">
          {notes.map((note) => (
            <Card key={note.id} className="note-card" hover>
              <div className="note-card-left">
                {note.note_type === 'task' && (
                  <button
                    className={`note-check ${note.completed ? 'note-checked' : ''}`}
                    onClick={() => handleToggleComplete(note)}
                    title={note.completed ? 'Mark incomplete' : 'Mark complete'}
                    aria-label="Toggle task completion"
                  >
                    {note.completed ? <HiCheckCircle /> : <HiOutlineCheckCircle />}
                  </button>
                )}
                <div className="note-content-area">
                  {note.title && (
                    <span className={`note-title ${note.completed ? 'note-completed' : ''}`}>
                      {note.title}
                    </span>
                  )}
                  <p className={`note-content ${note.completed ? 'note-completed' : ''}`}>
                    {note.content}
                  </p>
                  <div className="note-meta">
                    <Badge
                      variant={
                        note.note_type === 'task'
                          ? 'warning'
                          : note.note_type === 'idea'
                          ? 'info'
                          : note.note_type === 'link'
                          ? 'primary'
                          : 'default'
                      }
                      size="sm"
                    >
                      {note.note_type}
                    </Badge>
                    {note.priority > 0 && (
                      <Badge variant={PRIORITY_VARIANTS[note.priority]} size="sm">
                        {PRIORITY_LABELS[note.priority]} Priority
                      </Badge>
                    )}
                    {note.due_date && (
                      <span className="note-due">Due {note.due_date}</span>
                    )}
                    <span className="note-date">
                      {format(new Date(note.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="note-actions">
                <button onClick={() => openEditNote(note)} title="Edit note">
                  <HiOutlinePencil />
                </button>
                <button onClick={() => setDeleteNote(note)} title="Delete note">
                  <HiOutlineTrash />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Note Modal */}
      <Modal isOpen={noteModal} onClose={() => setNoteModal(false)} title="Add Workspace Item">
        <form onSubmit={handleCreateNote} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            id="note-title-input"
            label="Title (optional)"
            value={noteForm.title}
            onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
            placeholder="e.g. Contract review findings"
          />
          <TextArea
            id="note-content-input"
            label="Content"
            value={noteForm.content}
            onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
            placeholder="Write notes, checklist points, or URL links..."
            required
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Type</label>
              <select
                className="input-field"
                value={noteForm.note_type}
                onChange={(e) => setNoteForm({ ...noteForm, note_type: e.target.value })}
              >
                <option value="note">Note</option>
                <option value="idea">Idea</option>
                <option value="task">Task</option>
                <option value="link">Link</option>
              </select>
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Priority</label>
              <select
                className="input-field"
                value={noteForm.priority}
                onChange={(e) => setNoteForm({ ...noteForm, priority: parseInt(e.target.value) })}
              >
                <option value={0}>None</option>
                <option value={1}>Low</option>
                <option value={2}>Medium</option>
                <option value={3}>High</option>
              </select>
            </div>
          </div>
          <Input
            id="note-due-input"
            label="Due Date (optional)"
            type="date"
            value={noteForm.due_date}
            onChange={(e) => setNoteForm({ ...noteForm, due_date: e.target.value })}
          />
          <Button type="submit" fullWidth>
            Save Item
          </Button>
        </form>
      </Modal>

      {/* Edit Note Modal */}
      <Modal isOpen={!!editNote} onClose={() => setEditNote(null)} title="Edit Item">
        <form onSubmit={handleUpdateNote} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            id="edit-note-title-input"
            label="Title"
            value={noteForm.title}
            onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
          />
          <TextArea
            id="edit-note-content-input"
            label="Content"
            value={noteForm.content}
            onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Type</label>
              <select
                className="input-field"
                value={noteForm.note_type}
                onChange={(e) => setNoteForm({ ...noteForm, note_type: e.target.value })}
              >
                <option value="note">Note</option>
                <option value="idea">Idea</option>
                <option value="task">Task</option>
                <option value="link">Link</option>
              </select>
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Priority</label>
              <select
                className="input-field"
                value={noteForm.priority}
                onChange={(e) => setNoteForm({ ...noteForm, priority: parseInt(e.target.value) })}
              >
                <option value={0}>None</option>
                <option value={1}>Low</option>
                <option value={2}>Medium</option>
                <option value={3}>High</option>
              </select>
            </div>
          </div>
          <Button type="submit" fullWidth>
            Save Changes
          </Button>
        </form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal isOpen={editProject} onClose={() => setEditProject(false)} title="Edit Project Details">
        <form onSubmit={handleUpdateProject} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            id="ep-title-input"
            label="Title"
            value={projectForm.title || ''}
            onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
          />
          <Input
            id="ep-desc-input"
            label="Description"
            value={projectForm.description || ''}
            onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Status</label>
              <select
                className="input-field"
                value={projectForm.status || 'active'}
                onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Accent Color</label>
              <div className="color-choices">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-swatch ${projectForm.color === c ? 'selected' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setProjectForm({ ...projectForm, color: c })}
                  />
                ))}
              </div>
            </div>
          </div>
          <Button type="submit" fullWidth>
            Save Project
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteNote}
        onClose={() => setDeleteNote(null)}
        onConfirm={handleDeleteNote}
        title="Delete Item"
        message="Are you sure you want to delete this workspace item?"
        confirmText="Delete"
      />
    </div>
  );
}
