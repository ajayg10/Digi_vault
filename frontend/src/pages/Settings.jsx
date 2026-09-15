import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../api/auth';
import { filesAPI } from '../api/files';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import StorageQuotaBar from '../components/StorageQuotaBar';
import {
  HiOutlineUser,
  HiOutlineShieldCheck,
  HiOutlineColorSwatch,
  HiOutlineCloud,
  HiOutlineSparkles,
  HiOutlineLogout,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineCheck,
} from 'react-icons/hi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './Settings.css';

const TABS = [
  { id: 'profile', label: 'Account & Profile', icon: <HiOutlineUser /> },
  { id: 'appearance', label: 'Appearance', icon: <HiOutlineColorSwatch /> },
  { id: 'storage', label: 'Storage & Quota', icon: <HiOutlineCloud /> },
  { id: 'subscription', label: 'Subscription & Billing', icon: <HiOutlineSparkles /> },
  { id: 'security', label: 'Security Overview', icon: <HiOutlineShieldCheck /> },
];

export default function Settings() {
  const { user, logoutAll } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [quota, setQuota] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const { data } = await filesAPI.getQuota();
        setQuota(data);
      } catch {
        // Silently continue
      }
    };
    fetchQuota();
  }, []);

  const handleRequestVerification = async () => {
    setLoading(true);
    try {
      await authAPI.requestVerification();
      toast.success('Verification email sent! Check your inbox.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    try {
      await logoutAll();
      toast.success('Logged out from all devices');
    } catch {
      toast.error('Failed to logout all');
    }
  };

  return (
    <div className="settings-page animate-fade-in">
      <div className="settings-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure your workspace preferences, profile, and account details.</p>
      </div>

      <div className="settings-layout">
        {/* Settings Navigation Tabs */}
        <div className="settings-nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`settings-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="snav-icon">{tab.icon}</span>
              <span className="snav-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Settings Tab Content */}
        <div className="settings-content">
          {/* Tab 1: Account & Profile */}
          {activeTab === 'profile' && (
            <Card className="settings-card animate-fade-in">
              <div className="card-section-title">
                <HiOutlineUser />
                <h2>Account & Profile</h2>
              </div>
              <p className="section-desc">
                Basic identity and communication details registered with DigiVault.
              </p>

              <div className="settings-rows">
                <div className="settings-row">
                  <span className="settings-label">Email Address</span>
                  <span className="settings-value">{user?.email}</span>
                </div>
                <div className="settings-row">
                  <span className="settings-label">Registered Since</span>
                  <span className="settings-value">
                    {user?.created_at ? format(new Date(user.created_at), 'PPP') : '—'}
                  </span>
                </div>
                <div className="settings-row">
                  <span className="settings-label">Email Verification</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Badge variant={user?.email_verified ? 'success' : 'warning'} dot size="md">
                      {user?.email_verified ? 'Verified' : 'Unverified'}
                    </Badge>
                    {!user?.email_verified && (
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={handleRequestVerification}
                        loading={loading}
                      >
                        Verify Email Now
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Tab 2: Appearance */}
          {activeTab === 'appearance' && (
            <Card className="settings-card animate-fade-in">
              <div className="card-section-title">
                <HiOutlineColorSwatch />
                <h2>Appearance & Theme</h2>
              </div>
              <p className="section-desc">
                Select your preferred color theme. DigiVault features warm parchment ivory in Light mode and warm charcoal in Dark mode.
              </p>

              <div className="theme-selectors-grid">
                {/* Light Mode Card */}
                <div
                  className={`theme-card theme-card-light ${theme === 'light' ? 'selected' : ''}`}
                  onClick={() => setTheme('light')}
                >
                  <div className="theme-preview light-preview">
                    <div className="preview-sidebar" />
                    <div className="preview-body">
                      <div className="preview-header" />
                      <div className="preview-accent" />
                    </div>
                  </div>
                  <div className="theme-card-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <HiOutlineSun />
                      <span className="theme-name">Warm Parchment (Light)</span>
                    </div>
                    {theme === 'light' && <HiOutlineCheck className="theme-checked" />}
                  </div>
                  <span className="theme-sub">Warm ivory surfaces with terracotta accents.</span>
                </div>

                {/* Dark Mode Card */}
                <div
                  className={`theme-card theme-card-dark ${theme === 'dark' ? 'selected' : ''}`}
                  onClick={() => setTheme('dark')}
                >
                  <div className="theme-preview dark-preview">
                    <div className="preview-sidebar" />
                    <div className="preview-body">
                      <div className="preview-header" />
                      <div className="preview-accent" />
                    </div>
                  </div>
                  <div className="theme-card-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <HiOutlineMoon />
                      <span className="theme-name">Warm Charcoal (Dark)</span>
                    </div>
                    {theme === 'dark' && <HiOutlineCheck className="theme-checked" />}
                  </div>
                  <span className="theme-sub">Deep warm charcoal without harsh neon blues.</span>
                </div>
              </div>
            </Card>
          )}

          {/* Tab 3: Storage & Quota */}
          {activeTab === 'storage' && (
            <Card className="settings-card animate-fade-in">
              <div className="card-section-title">
                <HiOutlineCloud />
                <h2>Storage & Usage Status</h2>
              </div>
              <p className="section-desc">
                Review your current vault utilization and storage limits.
              </p>

              {quota && (
                <div style={{ marginTop: 16 }}>
                  <StorageQuotaBar quota={quota} />
                </div>
              )}

              <div className="settings-rows" style={{ marginTop: 24 }}>
                <div className="settings-row">
                  <span className="settings-label">Current Plan Allocation</span>
                  <span className="settings-value">
                    {user?.plan === 'pro' ? '25 GB Encrypted Cloud' : '500 MB Free Tier'}
                  </span>
                </div>
                <div className="settings-row">
                  <span className="settings-label">Need More Storage?</span>
                  <Link to="/pricing">
                    <Button size="sm" variant="primary" icon={<HiOutlineSparkles />}>
                      Upgrade to Pro
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          )}

          {/* Tab 4: Subscription & Billing */}
          {activeTab === 'subscription' && (
            <Card className="settings-card animate-fade-in">
              <div className="card-section-title">
                <HiOutlineSparkles />
                <h2>Subscription & Plan</h2>
              </div>
              <p className="section-desc">
                Manage your DigiVault plan, billing interval, and features.
              </p>

              <div className="settings-rows">
                <div className="settings-row">
                  <span className="settings-label">Current Membership</span>
                  <Badge variant={user?.plan === 'pro' ? 'success' : 'default'} dot size="md">
                    {user?.plan === 'pro' ? 'DigiVault Pro' : 'Free Tier'}
                  </Badge>
                </div>
                <div className="settings-row">
                  <span className="settings-label">Plan Details</span>
                  <Link to="/pricing">
                    <Button size="sm" variant="secondary" icon={<HiOutlineSparkles />}>
                      {user?.plan === 'pro' ? 'Manage Plan Details' : 'Upgrade to Pro'}
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          )}

          {/* Tab 5: Security Overview */}
          {activeTab === 'security' && (
            <Card className="settings-card animate-fade-in">
              <div className="card-section-title">
                <HiOutlineShieldCheck />
                <h2>Security Overview</h2>
              </div>
              <p className="section-desc">
                Two-factor authentication, verified recovery channels, and device sessions.
              </p>

              <div className="settings-rows">
                <div className="settings-row">
                  <span className="settings-label">Authenticator App (2FA)</span>
                  <Badge variant={user?.totp_enabled ? 'success' : 'default'} dot size="md">
                    {user?.totp_enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="settings-row">
                  <span className="settings-label">Email OTP Verification</span>
                  <Badge variant={user?.email_2fa_enabled ? 'success' : 'default'} dot size="md">
                    {user?.email_2fa_enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="settings-row">
                  <span className="settings-label">Security Center</span>
                  <Link to="/security">
                    <Button size="sm" variant="primary" icon={<HiOutlineShieldCheck />}>
                      Open Security Center →
                    </Button>
                  </Link>
                </div>
                <div className="settings-row">
                  <span className="settings-label">Session Controls</span>
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<HiOutlineLogout />}
                    onClick={handleLogoutAll}
                  >
                    Logout All Devices
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
