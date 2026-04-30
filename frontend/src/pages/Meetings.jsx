import { useState, useEffect } from 'react';
import { meetingsAPI } from '../api/meetings';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input, { TextArea } from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import VideoCall from '../components/VideoCall';
import {
  HiOutlinePlus, HiOutlineCalendar, HiOutlineTrash,
  HiOutlinePencil, HiOutlinePhone, HiOutlineLocationMarker,
  HiOutlineUserGroup, HiOutlineClock, HiOutlineClipboardCopy,
  HiOutlineLink,
} from 'react-icons/hi';
import { format, isPast } from 'date-fns';
import toast from 'react-hot-toast';
import './Meetings.css';

export default function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [callMeetingId, setCallMeetingId] = useState(null);
  const [joinModal, setJoinModal] = useState(false);
  const [joinLink, setJoinLink] = useState('');
  const [formData, setFormData] = useState({
    title: '', meeting_date: '', duration_minutes: 30,
    location: '', attendees: '', agenda: '', notes: '', summary: '',
  });

  const loadMeetings = async () => {
    try {
      const { data } = await meetingsAPI.list(showUpcoming);
      setMeetings(data);
    } catch {
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setLoading(true); loadMeetings(); }, [showUpcoming]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.meeting_date) {
      return toast.error('Title and date are required');
    }
    try {
      const payload = {
        ...formData,
        attendees: formData.attendees ? formData.attendees.split(',').map((a) => a.trim()).filter(Boolean) : [],
        duration_minutes: formData.duration_minutes || null,
        meeting_date: new Date(formData.meeting_date).toISOString(),
      };
      await meetingsAPI.create(payload);
      toast.success('Meeting created!');
      setCreateModal(false);
      resetForm();
      loadMeetings();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editModal) return;
    try {
      const payload = {
        ...formData,
        attendees: typeof formData.attendees === 'string'
          ? formData.attendees.split(',').map((a) => a.trim()).filter(Boolean)
          : formData.attendees,
        duration_minutes: formData.duration_minutes || null,
        meeting_date: new Date(formData.meeting_date).toISOString(),
      };
      await meetingsAPI.update(editModal.id, payload);
      toast.success('Meeting updated');
      setEditModal(null);
      loadMeetings();
    } catch {
      toast.error('Update failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await meetingsAPI.delete(deleteConfirm.id);
      toast.success('Meeting deleted');
      setDeleteConfirm(null);
      loadMeetings();
    } catch {
      toast.error('Delete failed');
    }
  };

  const openEdit = (meeting) => {
    setFormData({
      title: meeting.title,
      meeting_date: format(new Date(meeting.meeting_date), "yyyy-MM-dd'T'HH:mm"),
      duration_minutes: meeting.duration_minutes || 30,
      location: meeting.location || '',
      attendees: meeting.attendees?.join(', ') || '',
      agenda: meeting.agenda || '',
      notes: meeting.notes || '',
      summary: meeting.summary || '',
    });
    setEditModal(meeting);
  };

  const resetForm = () => {
    setFormData({
      title: '', meeting_date: '', duration_minutes: 30,
      location: '', attendees: '', agenda: '', notes: '', summary: '',
    });
  };

  const getMeetingLink = (meetingId) => {
    return `${window.location.origin}/meetings/join/${meetingId}`;
  };

  const copyMeetingLink = (meetingId) => {
    navigator.clipboard.writeText(getMeetingLink(meetingId));
    toast.success('Meeting link copied to clipboard!');
  };

  const handleJoinFromLink = () => {
    let id = joinLink.trim();
    if (!id) return toast.error('Please enter a link or ID');
    if (id.includes('/meetings/join/')) {
      id = id.split('/meetings/join/')[1].split('/')[0].split('?')[0];
    }
    setJoinModal(false);
    setJoinLink('');
    setCallMeetingId(id);
  };

  if (callMeetingId) {
    return <VideoCall meetingId={callMeetingId} onEnd={() => setCallMeetingId(null)} />;
  }

  return (
    <div className="meetings-page animate-fade-in">
      <div className="files-header">
        <div>
          <h1 className="page-title">Meetings</h1>
          <p className="page-subtitle">Schedule and manage your meetings</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button icon={<HiOutlineLink />} size="sm" variant="secondary" onClick={() => setJoinModal(true)}>
            Join from Link
          </Button>
          <Button icon={<HiOutlinePlus />} size="sm" onClick={() => { resetForm(); setCreateModal(true); }}>
            New Meeting
          </Button>
        </div>
      </div>

      {/* Toggle */}
      <div className="project-filters" style={{ marginBottom: 20 }}>
        <button className={`filter-btn ${showUpcoming ? 'filter-active' : ''}`} onClick={() => setShowUpcoming(true)}>
          Upcoming
        </button>
        <button className={`filter-btn ${!showUpcoming ? 'filter-active' : ''}`} onClick={() => setShowUpcoming(false)}>
          Past
        </button>
      </div>

      {loading ? (
        <div className="files-loading"><div className="spinner" /></div>
      ) : meetings.length === 0 ? (
        <EmptyState
          icon={<HiOutlineCalendar />}
          title={showUpcoming ? 'No upcoming meetings' : 'No past meetings'}
          description="Create a meeting to get started"
          action={
            <Button icon={<HiOutlinePlus />} size="sm" onClick={() => { resetForm(); setCreateModal(true); }}>
              Schedule Meeting
            </Button>
          }
        />
      ) : (
        <div className="meetings-list stagger-children">
          {meetings.map((meeting) => (
            <Card key={meeting.id} className="meeting-card" hover onClick={() => setDetailModal(meeting)}>
              <div className="meeting-card-left">
                <div className={`meeting-date-badge ${isPast(new Date(meeting.meeting_date)) ? 'meeting-past' : ''}`}>
                  <span className="mdb-month">{format(new Date(meeting.meeting_date), 'MMM')}</span>
                  <span className="mdb-day">{format(new Date(meeting.meeting_date), 'd')}</span>
                </div>
                <div className="meeting-info">
                  <h3 className="meeting-title truncate">{meeting.title}</h3>
                  <div className="meeting-meta-row">
                    <span className="meeting-meta-item">
                      <HiOutlineClock /> {format(new Date(meeting.meeting_date), 'h:mm a')}
                      {meeting.duration_minutes && ` · ${meeting.duration_minutes}min`}
                    </span>
                    {meeting.location && (
                      <span className="meeting-meta-item">
                        <HiOutlineLocationMarker /> {meeting.location}
                      </span>
                    )}
                    {meeting.attendees?.length > 0 && (
                      <span className="meeting-meta-item">
                        <HiOutlineUserGroup /> {meeting.attendees.length} attendees
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="meeting-card-actions" onClick={(e) => e.stopPropagation()}>
                {!isPast(new Date(meeting.meeting_date)) && (
                  <Button variant="primary" size="sm" icon={<HiOutlinePhone />}
                    onClick={() => setCallMeetingId(meeting.id)}>
                    Join
                  </Button>
                )}
                <button className="meeting-action-btn" onClick={() => copyMeetingLink(meeting.id)} title="Copy meeting link">
                  <HiOutlineClipboardCopy />
                </button>
                <button className="meeting-action-btn" onClick={() => openEdit(meeting)} title="Edit">
                  <HiOutlinePencil />
                </button>
                <button className="meeting-action-btn" onClick={() => setDeleteConfirm(meeting)} title="Delete">
                  <HiOutlineTrash />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title={detailModal?.title || 'Meeting'} size="lg">
        {detailModal && (
          <div className="meeting-detail">
            {/* Meeting Link */}
            <div className="meeting-link-box">
              <HiOutlineLink className="meeting-link-icon" />
              <code className="meeting-link-url">{getMeetingLink(detailModal.id)}</code>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="secondary" size="sm" icon={<HiOutlineClipboardCopy />}
                  onClick={() => copyMeetingLink(detailModal.id)}>
                  Copy
                </Button>
                <Button variant="primary" size="sm" icon={<HiOutlinePhone />}
                  onClick={() => setCallMeetingId(detailModal.id)}>
                  Join
                </Button>
              </div>
            </div>
            <div className="md-row">
              <span className="md-label">Date & Time</span>
              <span className="md-value">{format(new Date(detailModal.meeting_date), 'PPPpp')}</span>
            </div>
            {detailModal.duration_minutes && (
              <div className="md-row">
                <span className="md-label">Duration</span>
                <span className="md-value">{detailModal.duration_minutes} minutes</span>
              </div>
            )}
            {detailModal.location && (
              <div className="md-row">
                <span className="md-label">Location</span>
                <span className="md-value">{detailModal.location}</span>
              </div>
            )}
            {detailModal.attendees?.length > 0 && (
              <div className="md-row">
                <span className="md-label">Attendees</span>
                <div className="md-tags">
                  {detailModal.attendees.map((a, i) => <Badge key={i} variant="primary" size="sm">{a}</Badge>)}
                </div>
              </div>
            )}
            {detailModal.agenda && (
              <div className="md-row md-block">
                <span className="md-label">Agenda</span>
                <p className="md-text">{detailModal.agenda}</p>
              </div>
            )}
            {detailModal.notes && (
              <div className="md-row md-block">
                <span className="md-label">Notes</span>
                <p className="md-text">{detailModal.notes}</p>
              </div>
            )}
            {detailModal.summary && (
              <div className="md-row md-block">
                <span className="md-label">Summary</span>
                <p className="md-text">{detailModal.summary}</p>
              </div>
            )}
            {detailModal.action_items?.length > 0 && (
              <div className="md-row md-block">
                <span className="md-label">Action Items</span>
                <ul className="md-actions-list">
                  {detailModal.action_items.map((item, i) => (
                    <li key={i} className={item.completed ? 'md-action-done' : ''}>
                      {item.task}
                      {item.assignee && <span className="md-action-assignee">— {item.assignee}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Join Meeting Modal */}
      <Modal isOpen={joinModal} onClose={() => setJoinModal(false)} title="Join Meeting from Link">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Paste a meeting link or meeting ID below to join directly.
          </p>
          <Input 
            label="Meeting Link or ID" 
            placeholder="e.g. http://localhost:5173/meetings/join/123..." 
            value={joinLink}
            onChange={(e) => setJoinLink(e.target.value)}
            autoFocus
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <Button variant="secondary" onClick={() => setJoinModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleJoinFromLink}>Join Meeting</Button>
          </div>
        </div>
      </Modal>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={createModal || !!editModal}
        onClose={() => { setCreateModal(false); setEditModal(null); }}
        title={editModal ? 'Edit Meeting' : 'New Meeting'}
      >
        <form onSubmit={editModal ? handleUpdate : handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input id="mt-title" label="Title" value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Team Standup" autoFocus />
          <Input id="mt-date" label="Date & Time" type="datetime-local" value={formData.meeting_date}
            onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })} />
          <div style={{ display: 'flex', gap: 12 }}>
            <Input id="mt-duration" label="Duration (min)" type="number" value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
              style={{ flex: 1 }} />
            <Input id="mt-location" label="Location" value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Zoom / Room 3" style={{ flex: 1 }} />
          </div>
          <Input id="mt-attendees" label="Attendees (comma separated)" value={formData.attendees}
            onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
            placeholder="alice@mail.com, bob@mail.com" />
          <TextArea id="mt-agenda" label="Agenda" value={formData.agenda}
            onChange={(e) => setFormData({ ...formData, agenda: e.target.value })} placeholder="Meeting agenda..." />
          <TextArea id="mt-notes" label="Notes" value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Meeting notes..." />
          <Button type="submit" fullWidth>{editModal ? 'Save Changes' : 'Create Meeting'}</Button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Meeting"
        message={`Delete "${deleteConfirm?.title}"? This cannot be undone.`}
      />
    </div>
  );
}
