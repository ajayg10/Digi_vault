import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { filesAPI } from '../api/files';
import { projectsAPI } from '../api/projects';
import { meetingsAPI } from '../api/meetings';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import StorageQuotaBar from '../components/StorageQuotaBar';
import Modal from '../components/ui/Modal';
import FileUploadZone from '../components/FileUploadZone';
import {
  HiOutlineFolder,
  HiOutlineCollection,
  HiOutlineCalendar,
  HiOutlineCloud,
  HiOutlineDocumentText,
  HiOutlineStar,
  HiStar,
  HiOutlineSparkles,
  HiOutlinePlus,
  HiOutlinePhone,
  HiOutlineShieldCheck,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineDownload,
  HiOutlinePhotograph,
  HiOutlineFilm,
  HiOutlineMusicNote,
  HiOutlineCode,
  HiOutlineDocument,
  HiOutlineArrowRight,
} from 'react-icons/hi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './Dashboard.css';

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

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quota, setQuota] = useState(null);
  const [files, setFiles] = useState([]);
  const [projects, setProjects] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModal, setUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const [quotaRes, filesRes, projRes, meetRes] = await Promise.all([
        filesAPI.getQuota(),
        filesAPI.list(),
        projectsAPI.list(),
        meetingsAPI.list(true, 5),
      ]);
      setQuota(quotaRes.data);
      setFiles(filesRes.data.slice(0, 6));
      setProjects(projRes.data.slice(0, 4));
      setMeetings(meetRes.data.slice(0, 4));
    } catch {
      // Silently fail — data loads gracefully
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      await filesAPI.upload(file);
      toast.success('File stored in vault!');
      setUploadModal(false);
      loadDashboard();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleToggleFavorite = async (file) => {
    try {
      await filesAPI.update(file.id, { is_favorite: !file.is_favorite });
      loadDashboard();
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

  const isProtected = user?.totp_enabled || user?.email_2fa_enabled;
  const username = user?.email ? user.email.split('@')[0] : 'User';

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="dashboard animate-fade-in">
      {/* Header & Quick Actions */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">{getGreeting()}, {username}</h1>
          <p className="page-subtitle">Everything important, securely in one place.</p>
        </div>
        <div className="dashboard-actions">
          <Button
            variant="secondary"
            icon={<HiOutlinePhone />}
            onClick={() => navigate('/meetings')}
            size="md"
          >
            Join Meeting
          </Button>
          <Button
            variant="primary"
            icon={<HiOutlinePlus />}
            onClick={() => setUploadModal(true)}
            size="md"
          >
            Upload Files
          </Button>
        </div>
      </div>

      {/* Security Status Banner */}
      <div className="dash-security-banner">
        <div className="dash-sec-left">
          <div className="dash-sec-icon">
            <HiOutlineShieldCheck />
          </div>
          <div>
            <div className="dash-sec-headline">
              <span className="dash-sec-title">
                {isProtected ? 'Your vault is protected' : 'Security recommended: Configure two-factor authentication'}
              </span>
              <span className="dash-sec-chip">
                {isProtected ? 'ACTIVE ENCRYPTION' : 'ATTENTION'}
              </span>
            </div>
            <div className="dash-sec-checklist">
              <span className={`dash-sec-item ${user?.totp_enabled ? 'item-pass' : 'item-pending'}`}>
                {user?.totp_enabled ? <HiOutlineCheckCircle /> : <HiOutlineExclamationCircle />}
                2FA {user?.totp_enabled ? 'Enabled' : 'Disabled'}
              </span>
              <span className={`dash-sec-item ${user?.email_verified ? 'item-pass' : 'item-pending'}`}>
                {user?.email_verified ? <HiOutlineCheckCircle /> : <HiOutlineExclamationCircle />}
                Email {user?.email_verified ? 'Verified' : 'Unverified'}
              </span>
              <span className="dash-sec-item item-pass">
                <HiOutlineCheckCircle />
                Secure Encrypted Session
              </span>
            </div>
          </div>
        </div>
        <Link to="/security" className="dash-sec-link">
          Review Security Center →
        </Link>
      </div>

      {/* Statistics Overview Grid */}
      <div className="dash-stats-grid stagger-children">
        <Card className="dash-stat-card" hover onClick={() => navigate('/files')}>
          <div className="dash-stat-top">
            <span className="dash-stat-label">Files Stored</span>
            <div className="dash-stat-icon">
              <HiOutlineFolder />
            </div>
          </div>
          <div className="dash-stat-value">{quota?.file_count || 0}</div>
          <div className="dash-stat-footer">
            <span>In private storage</span>
          </div>
        </Card>

        <Card className="dash-stat-card" hover onClick={() => navigate('/files')}>
          <div className="dash-stat-top">
            <span className="dash-stat-label">Storage Used</span>
            <div className="dash-stat-icon">
              <HiOutlineCloud />
            </div>
          </div>
          <div className="dash-stat-value">
            {quota ? formatSize(quota.used_bytes) : '0 B'}
          </div>
          <div className="dash-stat-footer">
            <span>of {quota ? formatSize(quota.total_quota_bytes) : '500 MB'} allocated</span>
          </div>
        </Card>

        <Card className="dash-stat-card" hover onClick={() => navigate('/projects')}>
          <div className="dash-stat-top">
            <span className="dash-stat-label">Active Projects</span>
            <div className="dash-stat-icon">
              <HiOutlineCollection />
            </div>
          </div>
          <div className="dash-stat-value">
            {projects.filter((p) => p.status === 'active').length}
          </div>
          <div className="dash-stat-footer">
            <span>{projects.length} total projects</span>
          </div>
        </Card>

        <Card className="dash-stat-card" hover onClick={() => navigate('/meetings')}>
          <div className="dash-stat-top">
            <span className="dash-stat-label">Upcoming Meetings</span>
            <div className="dash-stat-icon">
              <HiOutlineCalendar />
            </div>
          </div>
          <div className="dash-stat-value">{meetings.length}</div>
          <div className="dash-stat-footer">
            <span>Scheduled sessions</span>
          </div>
        </Card>
      </div>

      {/* Storage Quota Detailed Bar */}
      {quota && (
        <Card className="dash-quota-card">
          <StorageQuotaBar quota={quota} />
        </Card>
      )}

      {/* Main Sections Grid */}
      <div className="dash-main-grid">
        {/* Left: Recent Files */}
        <Card className="dash-panel">
          <div className="panel-header">
            <h2 className="section-title">
              <HiOutlineDocumentText /> Recent Vault Files
            </h2>
            <Link to="/files" className="panel-more-link">
              View all files <HiOutlineArrowRight />
            </Link>
          </div>

          {files.length === 0 ? (
            <div className="panel-empty">
              <p>No files uploaded yet.</p>
              <Button size="xs" variant="secondary" onClick={() => setUploadModal(true)}>
                Upload your first file
              </Button>
            </div>
          ) : (
            <div className="recent-files-table-wrap">
              <table className="recent-files-table">
                <tbody>
                  {files.map((file) => (
                    <tr key={file.id} className="recent-file-row">
                      <td style={{ width: '36px' }}>
                        <div className="recent-file-icon">
                          {getFileIcon(file.mime_type)}
                        </div>
                      </td>
                      <td>
                        <span className="recent-file-name truncate" title={file.original_filename}>
                          {file.original_filename}
                        </span>
                      </td>
                      <td className="recent-file-meta">
                        {formatSize(file.size_bytes)}
                      </td>
                      <td className="recent-file-meta">
                        {format(new Date(file.created_at), 'MMM d')}
                      </td>
                      <td style={{ textAlign: 'right', width: '70px' }}>
                        <div className="recent-row-actions">
                          <button
                            className="recent-action-btn"
                            onClick={() => handleToggleFavorite(file)}
                            title={file.is_favorite ? 'Unstar' : 'Star'}
                          >
                            {file.is_favorite ? (
                              <HiStar style={{ color: 'var(--warning)' }} />
                            ) : (
                              <HiOutlineStar />
                            )}
                          </button>
                          <button
                            className="recent-action-btn"
                            onClick={() => handleDownload(file)}
                            title="Download"
                          >
                            <HiOutlineDownload />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Right Column: Upcoming Meetings & Projects */}
        <div className="dash-side-col">
          {/* Upcoming Meetings */}
          <Card className="dash-panel">
            <div className="panel-header">
              <h2 className="section-title">
                <HiOutlineCalendar /> Upcoming Meetings
              </h2>
              <Link to="/meetings" className="panel-more-link">
                All meetings <HiOutlineArrowRight />
              </Link>
            </div>

            {meetings.length === 0 ? (
              <div className="panel-empty">
                <p>No upcoming meetings scheduled.</p>
                <Button size="xs" variant="secondary" onClick={() => navigate('/meetings')}>
                  Schedule Meeting
                </Button>
              </div>
            ) : (
              <div className="upcoming-meetings-list">
                {meetings.map((meeting) => (
                  <div key={meeting.id} className="meeting-mini-item">
                    <div className="meeting-mini-date">
                      <span className="mm-month">
                        {format(new Date(meeting.meeting_date), 'MMM')}
                      </span>
                      <span className="mm-day">
                        {format(new Date(meeting.meeting_date), 'd')}
                      </span>
                    </div>
                    <div className="meeting-mini-info">
                      <span className="meeting-mini-title truncate">
                        {meeting.title}
                      </span>
                      <span className="meeting-mini-meta">
                        {format(new Date(meeting.meeting_date), 'h:mm a')}
                        {meeting.duration_minutes ? ` · ${meeting.duration_minutes}m` : ''}
                      </span>
                    </div>
                    <Button
                      variant="primary"
                      size="xs"
                      onClick={() => navigate('/meetings')}
                    >
                      Join
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Active Projects */}
          <Card className="dash-panel">
            <div className="panel-header">
              <h2 className="section-title">
                <HiOutlineCollection /> Active Projects
              </h2>
              <Link to="/projects" className="panel-more-link">
                View projects <HiOutlineArrowRight />
              </Link>
            </div>

            {projects.length === 0 ? (
              <div className="panel-empty">
                <p>No active projects yet.</p>
                <Button size="xs" variant="secondary" onClick={() => navigate('/projects')}>
                  Create Project
                </Button>
              </div>
            ) : (
              <div className="projects-mini-list">
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="project-mini-item"
                    onClick={() => navigate(`/projects/${proj.id}`)}
                  >
                    <div
                      className="project-mini-color"
                      style={{ background: proj.color || 'var(--accent)' }}
                    />
                    <div className="project-mini-info">
                      <span className="project-mini-title truncate">
                        {proj.title}
                      </span>
                      <span className="project-mini-meta">
                        {proj.note_count || 0} notes · {proj.status}
                      </span>
                    </div>
                    <Badge variant={proj.status === 'active' ? 'success' : 'default'} size="sm">
                      {proj.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Upgrade CTA Banner (For free users) */}
      {(!user?.plan || user.plan === 'free') && (
        <Card className="dash-pro-banner">
          <div className="dash-pro-left">
            <div className="dash-pro-icon">
              <HiOutlineSparkles />
            </div>
            <div>
              <h3 className="dash-pro-title">Upgrade to DigiVault Pro</h3>
              <p className="dash-pro-desc">
                Expand to 25 GB encrypted storage, unlimited project spaces, and priority support. Starting at ₹99/mo.
              </p>
            </div>
          </div>
          <Link to="/pricing">
            <Button variant="primary" size="md">
              Explore Plans →
            </Button>
          </Link>
        </Card>
      )}

      {/* Quick Upload Modal */}
      <Modal
        isOpen={uploadModal}
        onClose={() => setUploadModal(false)}
        title="Upload to Vault"
        size="md"
      >
        <FileUploadZone onUpload={handleUpload} uploading={uploading} />
      </Modal>
    </div>
  );
}
