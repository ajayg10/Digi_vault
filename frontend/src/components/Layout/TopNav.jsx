import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  HiOutlineSearch,
  HiOutlineBell,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineShieldCheck,
  HiOutlineCog,
  HiOutlineLogout,
  HiOutlineSparkles,
  HiOutlineChevronRight,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
} from 'react-icons/hi';
import './TopNav.css';

const ROUTE_NAMES = {
  '/': 'Dashboard',
  '/files': 'My Vault',
  '/projects': 'Projects',
  '/meetings': 'Meetings',
  '/favorites': 'Favorites',
  '/trash': 'Trash',
  '/security': 'Security Center',
  '/settings': 'Settings',
  '/pricing': 'Plans & Pricing',
};

export default function TopNav({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const searchInputRef = useRef(null);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/files?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Compute breadcrumbs
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/') return [{ label: 'Dashboard', path: '/' }];

    if (path.startsWith('/projects/')) {
      return [
        { label: 'Projects', path: '/projects' },
        { label: 'Project Detail', path },
      ];
    }
    if (path.startsWith('/meetings/join/')) {
      return [
        { label: 'Meetings', path: '/meetings' },
        { label: 'Live Session', path },
      ];
    }

    const currentLabel = ROUTE_NAMES[path] || 'Workspace';
    return [{ label: currentLabel, path }];
  };

  const breadcrumbs = getBreadcrumbs();
  const hasSecurityNotice = !user?.totp_enabled || !user?.email_verified;

  return (
    <header className="topnav">
      <div className="topnav-left">
        <button
          className="topnav-mobile-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <span className="topnav-mobile-bar" />
          <span className="topnav-mobile-bar" />
          <span className="topnav-mobile-bar" />
        </button>

        {/* Dynamic Breadcrumbs */}
        <nav className="topnav-breadcrumbs" aria-label="Breadcrumbs">
          <span className="breadcrumb-root">DigiVault</span>
          {breadcrumbs.map((bc, idx) => (
            <span key={bc.path || idx} className="breadcrumb-segment">
              <HiOutlineChevronRight className="breadcrumb-arrow" />
              <span className={`breadcrumb-item ${idx === breadcrumbs.length - 1 ? 'breadcrumb-active' : ''}`}>
                {bc.label}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Center: Global Search */}
      <div className="topnav-center">
        <form className="topnav-search" onSubmit={handleSearchSubmit}>
          <HiOutlineSearch className="topnav-search-icon" />
          <input
            ref={searchInputRef}
            type="search"
            className="topnav-search-input"
            placeholder="Search vault, tags, projects... (Ctrl+K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <kbd className="topnav-search-kbd">⌘K</kbd>
        </form>
      </div>

      {/* Right: Actions */}
      <div className="topnav-right">
        {/* Theme toggle */}
        <button
          className="topnav-icon-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          aria-label="Toggle color theme"
        >
          {theme === 'light' ? <HiOutlineMoon /> : <HiOutlineSun />}
        </button>

        {/* Notifications Popover */}
        <div className="topnav-dropdown-wrap" ref={notifRef}>
          <button
            className={`topnav-icon-btn ${hasSecurityNotice ? 'has-notice' : ''}`}
            onClick={() => setNotifOpen(!notifOpen)}
            title="Notifications & Security Alerts"
            aria-label="View notifications"
          >
            <HiOutlineBell />
            {hasSecurityNotice && <span className="notif-dot" />}
          </button>

          {notifOpen && (
            <div className="topnav-dropdown notif-dropdown animate-fade-in-scale">
              <div className="dropdown-header">
                <span className="dropdown-title">Security & System Alerts</span>
                <span className="dropdown-meta">Live Status</span>
              </div>
              <div className="notif-list">
                <div className="notif-item">
                  <div className={`notif-status-icon ${user?.totp_enabled ? 'status-good' : 'status-warn'}`}>
                    {user?.totp_enabled ? <HiOutlineCheckCircle /> : <HiOutlineExclamationCircle />}
                  </div>
                  <div className="notif-content">
                    <span className="notif-title">
                      {user?.totp_enabled ? '2FA Protection Active' : '2FA Not Configured'}
                    </span>
                    <span className="notif-desc">
                      {user?.totp_enabled
                        ? 'Authenticator app authentication is verified.'
                        : 'Enable 2FA in Security Center to protect your vault.'}
                    </span>
                  </div>
                </div>

                <div className="notif-item">
                  <div className={`notif-status-icon ${user?.email_verified ? 'status-good' : 'status-warn'}`}>
                    {user?.email_verified ? <HiOutlineCheckCircle /> : <HiOutlineExclamationCircle />}
                  </div>
                  <div className="notif-content">
                    <span className="notif-title">
                      {user?.email_verified ? 'Email Verified' : 'Email Unverified'}
                    </span>
                    <span className="notif-desc">
                      {user?.email_verified
                        ? 'Your account recovery channel is confirmed.'
                        : 'Confirm your email address for enhanced account safety.'}
                    </span>
                  </div>
                </div>

                <div className="notif-item">
                  <div className="notif-status-icon status-good">
                    <HiOutlineShieldCheck />
                  </div>
                  <div className="notif-content">
                    <span className="notif-title">Encrypted Workspace</span>
                    <span className="notif-desc">Your session is secured with TLS 1.3 encryption.</span>
                  </div>
                </div>
              </div>
              <div className="dropdown-footer">
                <Link to="/security" onClick={() => setNotifOpen(false)} className="dropdown-footer-link">
                  Open Security Center →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="topnav-dropdown-wrap" ref={profileRef}>
          <button
            className="topnav-avatar-btn"
            onClick={() => setProfileOpen(!profileOpen)}
            aria-label="User menu"
          >
            <div className="topnav-avatar">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="topnav-user-plan">
              {user?.plan === 'pro' ? 'PRO' : 'FREE'}
            </span>
          </button>

          {profileOpen && (
            <div className="topnav-dropdown profile-dropdown animate-fade-in-scale">
              <div className="profile-dropdown-header">
                <div className="profile-dropdown-avatar">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="profile-dropdown-meta">
                  <span className="profile-email truncate">{user?.email}</span>
                  <span className="profile-plan-tag">
                    {user?.plan === 'pro' ? 'Pro Workspace' : 'Free Tier'}
                  </span>
                </div>
              </div>

              <div className="profile-dropdown-nav">
                <Link
                  to="/security"
                  className="profile-nav-link"
                  onClick={() => setProfileOpen(false)}
                >
                  <HiOutlineShieldCheck />
                  <span>Security Center</span>
                </Link>
                <Link
                  to="/settings"
                  className="profile-nav-link"
                  onClick={() => setProfileOpen(false)}
                >
                  <HiOutlineCog />
                  <span>Settings & Profile</span>
                </Link>
                <Link
                  to="/pricing"
                  className="profile-nav-link"
                  onClick={() => setProfileOpen(false)}
                >
                  <HiOutlineSparkles />
                  <span>{user?.plan === 'pro' ? 'Manage Subscription' : 'Upgrade to Pro'}</span>
                </Link>
              </div>

              <div className="profile-dropdown-footer">
                <button className="profile-logout-btn" onClick={handleLogout}>
                  <HiOutlineLogout />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
