import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/auth';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import {
  HiOutlineShieldCheck, HiOutlineUser, HiOutlineKey,
  HiOutlineLogout, HiOutlineClipboardCopy, HiOutlineRefresh,
  HiOutlineSparkles,
} from 'react-icons/hi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './Settings.css';

export default function Settings() {
  const { user, logoutAll, refreshProfile } = useAuth();

  // 2FA states
  const [setupData, setSetupData] = useState(null); // { totp_uri, qr_code_base64, backup_codes }
  const [setupStep, setSetupStep] = useState(0); // 0=none, 1=show QR, 2=verify
  const [enableCode, setEnableCode] = useState('');
  const [disableModal, setDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [regenModal, setRegenModal] = useState(false);
  const [regenCode, setRegenCode] = useState('');
  const [backupCodes, setBackupCodes] = useState(null);
  const [loading, setLoading] = useState(false);

  // ─── Setup 2FA ───
  const handleSetup2FA = async () => {
    setLoading(true);
    try {
      const { data } = await authAPI.setup2FA();
      setSetupData(data);
      setSetupStep(1);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    if (!enableCode || enableCode.length !== 6) return toast.error('Enter a valid 6-digit code');
    setLoading(true);
    try {
      await authAPI.enable2FA(enableCode);
      toast.success('2FA enabled successfully!');
      setSetupStep(0);
      setSetupData(null);
      setEnableCode('');
      await refreshProfile();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // ─── Disable 2FA ───
  const handleDisable2FA = async () => {
    if (!disablePassword || !disableCode) return toast.error('Fill in all fields');
    setLoading(true);
    try {
      await authAPI.disable2FA(disablePassword, disableCode);
      toast.success('2FA disabled');
      setDisableModal(false);
      setDisablePassword('');
      setDisableCode('');
      await refreshProfile();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to disable');
    } finally {
      setLoading(false);
    }
  };

  // ─── Email 2FA ───
  const toggleEmail2FA = async () => {
    setLoading(true);
    try {
      if (user?.email_2fa_enabled) {
        await authAPI.disableEmail2FA();
        toast.success('Email 2FA disabled');
      } else {
        await authAPI.enableEmail2FA();
        toast.success('Email 2FA enabled');
      }
      await refreshProfile();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to toggle Email 2FA');
    } finally {
      setLoading(false);
    }
  };

  // ─── Request Email Verification ───
  const handleRequestVerification = async () => {
    setLoading(true);
    try {
      await authAPI.requestVerification();
      toast.success('Verification email sent!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };

  // ─── Regenerate Backup Codes ───
  const handleRegenBackupCodes = async () => {
    if (!regenCode || regenCode.length !== 6) return toast.error('Enter a valid 6-digit code');
    setLoading(true);
    try {
      const { data } = await authAPI.regenerateBackupCodes(regenCode);
      setBackupCodes(data.backup_codes);
      setRegenModal(false);
      setRegenCode('');
      toast.success('Backup codes regenerated!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Regeneration failed');
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = (codes) => {
    navigator.clipboard.writeText(codes.join('\n'));
    toast.success('Copied to clipboard!');
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
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">Manage your account and security</p>

      {/* Profile Section */}
      <Card className="settings-section">
        <div className="settings-section-header">
          <HiOutlineUser className="settings-section-icon" />
          <h2>Profile</h2>
        </div>
        <div className="settings-rows">
          <div className="settings-row">
            <span className="settings-label">Email</span>
            <span className="settings-value">{user?.email}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Account Created</span>
            <span className="settings-value">
              {user?.created_at ? format(new Date(user.created_at), 'PPP') : '—'}
            </span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Email Verified</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Badge variant={user?.email_verified ? 'success' : 'warning'} dot size="sm">
                {user?.email_verified ? 'Verified' : 'Unverified'}
              </Badge>
              {!user?.email_verified && (
                <Button size="xs" variant="secondary" onClick={handleRequestVerification} loading={loading}>
                  Verify Email
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Subscription Section */}
      <Card className="settings-section">
        <div className="settings-section-header">
          <HiOutlineSparkles className="settings-section-icon" />
          <h2>Subscription</h2>
        </div>
        <div className="settings-rows">
          <div className="settings-row">
            <span className="settings-label">Current Plan</span>
            <Badge
              variant={user?.plan === 'pro' ? 'success' : 'default'}
              dot
              size="md"
            >
              {user?.plan === 'pro' ? 'Pro' : 'Free'}
            </Badge>
          </div>
          <div className="settings-row">
            <span className="settings-label">Manage</span>
            <Link to="/pricing">
              <Button size="sm" variant="secondary" icon={<HiOutlineSparkles />}>
                {user?.plan === 'pro' ? 'Manage Plan' : 'Upgrade to Pro'}
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* 2FA Section */}
      <Card className="settings-section">
        <div className="settings-section-header">
          <HiOutlineShieldCheck className="settings-section-icon" />
          <h2>Two-Factor Authentication</h2>
        </div>

        <div className="settings-row" style={{ marginTop: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span className="settings-label">Email OTP Authentication</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Receive a 6-digit code via email when you log in.
            </span>
          </div>
          <Button
            variant={user?.email_2fa_enabled ? 'danger' : 'primary'}
            size="sm"
            onClick={toggleEmail2FA}
            loading={loading}
          >
            {user?.email_2fa_enabled ? 'Disable Email 2FA' : 'Enable Email 2FA'}
          </Button>
        </div>

        <div className="settings-section-header" style={{ marginTop: '1rem' }}>
          <h3>Authenticator App</h3>
          <Badge
            variant={user?.totp_enabled ? 'success' : 'default'}
            dot
            size="md"
          >
            {user?.totp_enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>

        {!user?.totp_enabled && setupStep === 0 && (
          <div className="tfa-setup">
            <p className="tfa-desc">
              Add an extra layer of security to your account by enabling two-factor
              authentication with an authenticator app.
            </p>
            <Button
              icon={<HiOutlineKey />}
              onClick={handleSetup2FA}
              loading={loading}
            >
              Set Up 2FA
            </Button>
          </div>
        )}

        {/* Step 1: Show QR */}
        {setupStep === 1 && setupData && (
          <div className="tfa-qr-step animate-fade-in-up">
            <p className="tfa-desc">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
            </p>
            <div className="tfa-qr-wrap">
              <img src={setupData.qr_code_base64} alt="2FA QR Code" className="tfa-qr-img" />
            </div>
            <p className="tfa-uri-label">Or enter this code manually:</p>
            <code className="tfa-uri">{setupData.totp_uri}</code>

            <div className="tfa-backup-section">
              <h4>Backup Codes</h4>
              <p className="tfa-desc">
                Save these codes securely. They can be used if you lose access to your authenticator.
              </p>
              <div className="tfa-codes-grid">
                {setupData.backup_codes.map((code, i) => (
                  <span key={i} className="tfa-code">{code}</span>
                ))}
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={<HiOutlineClipboardCopy />}
                onClick={() => copyBackupCodes(setupData.backup_codes)}
              >
                Copy Codes
              </Button>
            </div>

            <div className="tfa-verify-step">
              <Input
                id="enable-code"
                label="Enter 6-digit code from your app to verify"
                value={enableCode}
                onChange={(e) => setEnableCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
              />
              <Button onClick={handleEnable2FA} loading={loading} fullWidth>
                Enable 2FA
              </Button>
            </div>
          </div>
        )}

        {/* 2FA Enabled — Controls */}
        {user?.totp_enabled && (
          <div className="tfa-controls">
            <Button
              variant="secondary"
              icon={<HiOutlineRefresh />}
              onClick={() => setRegenModal(true)}
              size="sm"
            >
              Regenerate Backup Codes
            </Button>
            <Button
              variant="danger"
              icon={<HiOutlineShieldCheck />}
              onClick={() => setDisableModal(true)}
              size="sm"
            >
              Disable 2FA
            </Button>
          </div>
        )}
      </Card>

      {/* Display regenerated backup codes */}
      {backupCodes && (
        <Card className="settings-section animate-fade-in-up">
          <div className="settings-section-header">
            <HiOutlineKey className="settings-section-icon" />
            <h2>New Backup Codes</h2>
          </div>
          <p className="tfa-desc">Save these codes securely. Old codes are now invalid.</p>
          <div className="tfa-codes-grid">
            {backupCodes.map((code, i) => (
              <span key={i} className="tfa-code">{code}</span>
            ))}
          </div>
          <Button
            variant="secondary" size="sm" icon={<HiOutlineClipboardCopy />}
            onClick={() => copyBackupCodes(backupCodes)}
          >
            Copy Codes
          </Button>
        </Card>
      )}

      {/* Security */}
      <Card className="settings-section">
        <div className="settings-section-header">
          <HiOutlineLogout className="settings-section-icon" />
          <h2>Sessions</h2>
        </div>
        <p className="tfa-desc">Log out from all devices and sessions.</p>
        <Button variant="danger" size="sm" icon={<HiOutlineLogout />} onClick={handleLogoutAll}>
          Logout All Devices
        </Button>
      </Card>

      {/* Disable 2FA Modal */}
      <Modal isOpen={disableModal} onClose={() => setDisableModal(false)} title="Disable 2FA" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p className="tfa-desc">To disable 2FA, confirm with your password and a 2FA code or backup code.</p>
          <Input id="d2fa-pass" label="Password" type="password" value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)} />
          <Input id="d2fa-code" label="2FA Code or Backup Code" value={disableCode}
            onChange={(e) => setDisableCode(e.target.value)} maxLength={8} />
          <Button variant="danger" fullWidth onClick={handleDisable2FA} loading={loading}>
            Disable 2FA
          </Button>
        </div>
      </Modal>

      {/* Regen Modal */}
      <Modal isOpen={regenModal} onClose={() => setRegenModal(false)} title="Regenerate Backup Codes" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p className="tfa-desc">Confirm with a 6-digit code from your authenticator app. Old codes will be invalidated.</p>
          <Input id="regen-code" label="2FA Code" value={regenCode}
            onChange={(e) => setRegenCode(e.target.value)} maxLength={6} />
          <Button fullWidth onClick={handleRegenBackupCodes} loading={loading}>
            Regenerate Codes
          </Button>
        </div>
      </Modal>
    </div>
  );
}
