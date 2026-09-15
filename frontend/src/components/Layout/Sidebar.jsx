import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { filesAPI } from '../../api/files';
import {
  HiOutlineHome,
  HiOutlineFolder,
  HiOutlineCollection,
  HiOutlineCalendar,
  HiOutlineStar,
  HiOutlineTrash,
  HiOutlineShieldCheck,
  HiOutlineCog,
  HiOutlineSparkles,
  HiOutlineLogout,
  HiOutlineX,
} from 'react-icons/hi';
import './Sidebar.css';

const mainNavItems = [
  { path: '/', icon: <HiOutlineHome />, label: 'Dashboard' },
  { path: '/files', icon: <HiOutlineFolder />, label: 'My Vault' },
  { path: '/projects', icon: <HiOutlineCollection />, label: 'Projects' },
  { path: '/meetings', icon: <HiOutlineCalendar />, label: 'Meetings' },
  { path: '/favorites', icon: <HiOutlineStar />, label: 'Favorites' },
  { path: '/trash', icon: <HiOutlineTrash />, label: 'Trash' },
];

const secondaryNavItems = [
  { path: '/security', icon: <HiOutlineShieldCheck />, label: 'Security' },
  { path: '/settings', icon: <HiOutlineCog />, label: 'Settings' },
  { path: '/pricing', icon: <HiOutlineSparkles />, label: 'Plans & Pricing' },
];

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [quota, setQuota] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchQuota = async () => {
      try {
        const { data } = await filesAPI.getQuota();
        if (isMounted) setQuota(data);
      } catch {
        // Silently continue
      }
    };
    fetchQuota();
    return () => { isMounted = false; };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const percentage = quota ? Math.min(quota.usage_percentage, 100) : 0;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        {/* Header / Brand Mark */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              {/* Refined geometric vault emblem */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="24" height="24" rx="6" fill="var(--accent)" />
                <path d="M12 5.5L18 8.2V13C18 16.5 15.4 19.5 12 20.5C8.6 19.5 6 16.5 6 13V8.2L12 5.5Z" stroke="#FFFDF8" strokeWidth="1.5" strokeLinejoin="round" />
                <circle cx="12" cy="12.5" r="2.2" fill="#FFFDF8" />
                <path d="M12 14.7V16.8" stroke="#FFFDF8" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="sidebar-brand-text">
              <span className="sidebar-title">DigiVault</span>
              <span className="sidebar-badge">SECURE</span>
            </div>
          </div>

          <button
            className="sidebar-close-btn"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <HiOutlineX />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="sidebar-content">
          <div className="sidebar-section-label">WORKSPACE</div>
          <nav className="sidebar-nav">
            {mainNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                }
                onClick={() => setMobileOpen(false)}
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                <span className="sidebar-link-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-section-divider" />
          <div className="sidebar-section-label">SYSTEM & SECURITY</div>
          <nav className="sidebar-nav">
            {secondaryNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                }
                onClick={() => setMobileOpen(false)}
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                <span className="sidebar-link-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom Section: Storage Quota & User Profile */}
        <div className="sidebar-footer">
          {/* Storage Quota Bar */}
          <div className="sidebar-storage">
            <div className="sidebar-storage-header">
              <span className="sidebar-storage-label">Storage Usage</span>
              <span className="sidebar-storage-value">
                {quota ? `${formatBytes(quota.used_bytes)} / ${formatBytes(quota.total_quota_bytes)}` : 'Loading...'}
              </span>
            </div>
            <div className="sidebar-storage-track">
              <div
                className="sidebar-storage-fill"
                style={{
                  width: `${percentage}%`,
                  background: percentage > 90 ? 'var(--danger)' : percentage > 75 ? 'var(--warning)' : 'var(--accent)',
                }}
              />
            </div>
            <div className="sidebar-storage-sub">
              <span>{percentage.toFixed(0)}% used</span>
              <NavLink to="/pricing" className="sidebar-upgrade-link">
                Upgrade →
              </NavLink>
            </div>
          </div>

          {/* User Profile Info */}
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="sidebar-user-meta">
              <span className="sidebar-user-email truncate" title={user?.email}>
                {user?.email}
              </span>
              <div className="sidebar-account-status">
                <span className="status-dot-active" />
                <span className="status-text">{user?.plan === 'pro' ? 'Pro Plan' : 'Free Tier'}</span>
              </div>
            </div>
            <button
              className="sidebar-logout-btn"
              onClick={handleLogout}
              title="Sign Out"
              aria-label="Sign out"
            >
              <HiOutlineLogout />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
