import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { filesAPI } from '../api/files';
import { projectsAPI } from '../api/projects';
import { meetingsAPI } from '../api/meetings';
import Card from '../components/ui/Card';
import StorageQuotaBar from '../components/StorageQuotaBar';
import Badge from '../components/ui/Badge';
import {
  HiOutlineFolder,
  HiOutlineCollection,
  HiOutlineCalendar,
  HiOutlineCloud,
  HiOutlineDocumentText,
  HiOutlineStar,
} from 'react-icons/hi';
import { format } from 'date-fns';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [quota, setQuota] = useState(null);
  const [files, setFiles] = useState([]);
  const [projects, setProjects] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [quotaRes, filesRes, projRes, meetRes] = await Promise.all([
        filesAPI.getQuota(),
        filesAPI.list(),
        projectsAPI.list(),
        meetingsAPI.list(true, 5),
      ]);
      setQuota(quotaRes.data);
      setFiles(filesRes.data.slice(0, 5));
      setProjects(projRes.data);
      setMeetings(meetRes.data.slice(0, 5));
    } catch {
      // Silently fail — data loads individually
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="dashboard animate-fade-in">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, <strong>{user?.email}</strong>
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid stagger-children">
        <Card className="stat-card">
          <div className="stat-icon stat-icon-files">
            <HiOutlineFolder />
          </div>
          <div className="stat-info">
            <span className="stat-value">{quota?.file_count || 0}</span>
            <span className="stat-label">Total Files</span>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-icon stat-icon-storage">
            <HiOutlineCloud />
          </div>
          <div className="stat-info">
            <span className="stat-value">{quota ? formatSize(quota.used_bytes) : '0 B'}</span>
            <span className="stat-label">Storage Used</span>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-icon stat-icon-projects">
            <HiOutlineCollection />
          </div>
          <div className="stat-info">
            <span className="stat-value">{projects.filter(p => p.status === 'active').length}</span>
            <span className="stat-label">Active Projects</span>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-icon stat-icon-meetings">
            <HiOutlineCalendar />
          </div>
          <div className="stat-info">
            <span className="stat-value">{meetings.length}</span>
            <span className="stat-label">Upcoming Meetings</span>
          </div>
        </Card>
      </div>

      {/* Storage Quota */}
      {quota && (
        <Card className="dashboard-quota">
          <StorageQuotaBar quota={quota} />
        </Card>
      )}

      {/* Recent Files & Upcoming Meetings */}
      <div className="dashboard-grid">
        <Card className="dashboard-section">
          <h2 className="section-title">
            <HiOutlineDocumentText /> Recent Files
          </h2>
          {files.length === 0 ? (
            <p className="section-empty">No files uploaded yet</p>
          ) : (
            <div className="recent-list">
              {files.map((file) => (
                <div key={file.id} className="recent-item">
                  <div className="recent-item-info">
                    <span className="recent-item-name truncate">{file.original_filename}</span>
                    <span className="recent-item-meta">
                      {formatSize(file.size_bytes)} · {format(new Date(file.created_at), 'MMM d')}
                    </span>
                  </div>
                  {file.is_favorite && (
                    <HiOutlineStar className="recent-fav" />
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="dashboard-section">
          <h2 className="section-title">
            <HiOutlineCalendar /> Upcoming Meetings
          </h2>
          {meetings.length === 0 ? (
            <p className="section-empty">No upcoming meetings</p>
          ) : (
            <div className="recent-list">
              {meetings.map((meeting) => (
                <div key={meeting.id} className="recent-item">
                  <div className="recent-item-info">
                    <span className="recent-item-name truncate">{meeting.title}</span>
                    <span className="recent-item-meta">
                      {format(new Date(meeting.meeting_date), 'MMM d, h:mm a')}
                      {meeting.duration_minutes && ` · ${meeting.duration_minutes}min`}
                    </span>
                  </div>
                  <Badge variant="info" size="sm">
                    {meeting.attendees?.length || 0} attendees
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
