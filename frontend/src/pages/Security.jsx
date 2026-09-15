import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/auth';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import {
  HiOutlineShieldCheck,
  HiOutlineKey,
  HiOutlineMail,
  HiOutlineLogout,
  HiOutlineClipboardCopy,
  HiOutlineRefresh,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineDeviceMobile,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import './Security.css';

export default function Security() {
  const { user, logoutAll, refreshProfile } = useAuth();

  // 2FA states
  const [setupData, setSetupData] = useState(null); // { totp_uri, qr_code_base64, backup_codes }
  const [setupStep, setSetupStep] = useState(0); // 0=none, 1=show QR & verify
  const [enableCode, setEnableCode] = useState('');
  const [disableModal, setDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [regenModal, setRegenModal] = useState(false);
  const [regenCode, setRegenCode] = useState('');
  const [backupCodes, setBackupCodes] = useState(null);
  const [loading, setLoading] = useState(false);

  // Setup 2FA
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
      toast.error(err.response?.data?.detail || 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

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
    toast.success('Codes copied to clipboard!');
  };

  const handleLogoutAll = async () => {
    try {
      await logoutAll();
      toast.success('Logged out from all sessions');
    } catch {
      toast.error('Failed to logout all');
    }
  };

  // Compute security score
  let securityScore = 50;
  if (user?.totp_enabled) securityScore += 25;
  if (user?.email_verified) securityScore += 15;
  if (user?.email_2fa_enabled) securityScore += 10;
  securityScore = Math.min(securityScore, 100);

  const isProtected = user?.totp_enabled || user?.email_2fa_enabled;

  return (
    <div className="security-page animate-fade-in">
      {/* Header */}
      <div className="security-header">
        <div>
          <h1 className="page-title">Security Center</h1>
          <p className="page-subtitle">
            Configure authentication safeguards, verify credentials, and manage active sessions.
          </p>
        </div>
      </div>

      {/* Security Health Banner */}
      <div className={`security-banner ${isProtected ? 'banner-protected' : 'banner-warning'}`}>
        <div className="banner-left">
          <div className="banner-icon">
            <HiOutlineShieldCheck />
          </div>
          <div>
            <h2 className="banner-title">
              {isProtected ? 'Your vault is protected' : 'Action recommended: Enable two-factor authentication'}
            </h2>
            <p className="banner-desc">
              {isProtected
                ? 'Your account is safeguarded with multi-factor verification and encrypted tokens.'
                : 'Add a secondary verification step to secure your files against unauthorized access.'}
            </p>
            <div className="banner-badges">
              <span className={`status-pill ${user?.totp_enabled ? 'pill-good' : 'pill-warn'}`}>
                {user?.totp_enabled ? <HiOutlineCheckCircle /> : <HiOutlineExclamationCircle />}
                Authenticator App {user?.totp_enabled ? 'Enabled' : 'Disabled'}
              </span>
              <span className={`status-pill ${user?.email_verified ? 'pill-good' : 'pill-warn'}`}>
                {user?.email_verified ? <HiOutlineCheckCircle /> : <HiOutlineExclamationCircle />}
                Email {user?.email_verified ? 'Verified' : 'Unverified'}
              </span>
              <span className="status-pill pill-good">
                <HiOutlineCheckCircle />
                TLS 1.3 Session Active
              </span>
            </div>
          </div>
        </div>

        <div className="banner-score">
          <div className="score-number">{securityScore}%</div>
          <div className="score-label">Security Health</div>
          <div className="score-bar-track">
            <div className="score-bar-fill" style={{ width: `${securityScore}%` }} />
          </div>
        </div>
      </div>

      {/* Grid: 2FA & Verification */}
      <div className="security-grid">
        {/* Card 1: Authenticator App */}
        <Card className="security-card">
          <div className="card-header-row">
            <div className="card-header-left">
              <div className="sec-icon-wrap">
                <HiOutlineDeviceMobile />
              </div>
              <div>
                <h3 className="card-heading">Authenticator App (TOTP)</h3>
                <p className="card-subheading">Generate one-time codes using Google Authenticator, Authy, or 1Password.</p>
              </div>
            </div>
            <Badge variant={user?.totp_enabled ? 'success' : 'default'} dot size="md">
              {user?.totp_enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>

          {!user?.totp_enabled && setupStep === 0 && (
            <div className="sec-card-body">
              <p className="sec-info-text">
                When enabled, you will be prompted for a 6-digit verification code from your authenticator app whenever signing into DigiVault.
              </p>
              <div className="sec-actions">
                <Button
                  variant="primary"
                  icon={<HiOutlineKey />}
                  onClick={handleSetup2FA}
                  loading={loading}
                >
                  Set Up Authenticator
                </Button>
              </div>
            </div>
          )}

          {/* Setup Step 1: QR code display */}
          {setupStep === 1 && setupData && (
            <div className="sec-setup-step animate-fade-in-up">
              <p className="sec-step-instruction">
                1. Scan this QR code with your authenticator app:
              </p>
              <div className="qr-container">
                <img src={setupData.qr_code_base64} alt="2FA QR Code" className="qr-image" />
              </div>
              <p className="sec-step-instruction">Or enter this key manually:</p>
              <code className="manual-key">{setupData.totp_uri}</code>

              <div className="backup-codes-box">
                <div className="backup-header">
                  <span className="backup-title">Backup Recovery Codes</span>
                  <Button
                    variant="secondary"
                    size="xs"
                    icon={<HiOutlineClipboardCopy />}
                    onClick={() => copyBackupCodes(setupData.backup_codes)}
                  >
                    Copy All
                  </Button>
                </div>
                <p className="backup-hint">
                  Save these 8-character codes in a secure location. They allow login if you lose your device.
                </p>
                <div className="codes-grid">
                  {setupData.backup_codes.map((c, i) => (
                    <span key={i} className="code-pill">{c}</span>
                  ))}
                </div>
              </div>

              <div className="verify-input-row">
                <Input
                  id="setup-verify-code"
                  label="2. Enter the 6-digit code from your app to confirm:"
                  value={enableCode}
                  onChange={(e) => setEnableCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                />
                <Button variant="primary" onClick={handleEnable2FA} loading={loading}>
                  Verify & Activate
                </Button>
              </div>
            </div>
          )}

          {/* Controls when already enabled */}
          {user?.totp_enabled && (
            <div className="sec-card-body">
              <p className="sec-info-text">
                Your authenticator app is active. You will need it to verify logins on new browsers.
              </p>
              <div className="sec-actions">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<HiOutlineRefresh />}
                  onClick={() => setRegenModal(true)}
                >
                  Regenerate Backup Codes
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={<HiOutlineShieldCheck />}
                  onClick={() => setDisableModal(true)}
                >
                  Disable Authenticator
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Card 2: Email OTP 2FA */}
        <Card className="security-card">
          <div className="card-header-row">
            <div className="card-header-left">
              <div className="sec-icon-wrap">
                <HiOutlineMail />
              </div>
              <div>
                <h3 className="card-heading">Email One-Time Password</h3>
                <p className="card-subheading">Receive a 6-digit login verification code via your registered email address.</p>
              </div>
            </div>
            <Badge variant={user?.email_2fa_enabled ? 'success' : 'default'} dot size="md">
              {user?.email_2fa_enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>

          <div className="sec-card-body">
            <p className="sec-info-text">
              When activated, DigiVault sends a unique code to <strong>{user?.email}</strong> each time you sign in.
            </p>
            <div className="sec-actions">
              <Button
                variant={user?.email_2fa_enabled ? 'danger' : 'primary'}
                size="sm"
                onClick={toggleEmail2FA}
                loading={loading}
              >
                {user?.email_2fa_enabled ? 'Disable Email 2FA' : 'Enable Email 2FA'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Card 3: Email Verification */}
        <Card className="security-card">
          <div className="card-header-row">
            <div className="card-header-left">
              <div className="sec-icon-wrap">
                <HiOutlineCheckCircle />
              </div>
              <div>
                <h3 className="card-heading">Email Address Verification</h3>
                <p className="card-subheading">Verified email ensures account recovery and critical security alerts.</p>
              </div>
            </div>
            <Badge variant={user?.email_verified ? 'success' : 'warning'} dot size="md">
              {user?.email_verified ? 'Verified' : 'Unverified'}
            </Badge>
          </div>

          <div className="sec-card-body">
            <p className="sec-info-text">
              Primary email address: <strong>{user?.email}</strong>
            </p>
            {!user?.email_verified && (
              <div className="sec-actions">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRequestVerification}
                  loading={loading}
                >
                  Send Verification Link
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Card 4: Active Sessions */}
        <Card className="security-card">
          <div className="card-header-row">
            <div className="card-header-left">
              <div className="sec-icon-wrap">
                <HiOutlineLogout />
              </div>
              <div>
                <h3 className="card-heading">Active Sessions & Sign Out</h3>
                <p className="card-subheading">Manage login sessions across your laptops, phones, and browsers.</p>
              </div>
            </div>
          </div>

          <div className="sec-card-body">
            <p className="sec-info-text">
              Terminate all other active tokens and sessions immediately if you suspect unauthorized activity.
            </p>
            <div className="sec-actions">
              <Button
                variant="danger"
                size="sm"
                icon={<HiOutlineLogout />}
                onClick={handleLogoutAll}
              >
                Log Out All Devices
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Regenerated Backup Codes Display */}
      {backupCodes && (
        <Card className="security-card animate-fade-in-up" style={{ marginTop: 24 }}>
          <div className="card-header-row">
            <div className="card-header-left">
              <div className="sec-icon-wrap">
                <HiOutlineKey />
              </div>
              <div>
                <h3 className="card-heading">New Backup Recovery Codes</h3>
                <p className="card-subheading">Store these new codes in a password manager. Old backup codes have been invalidated.</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<HiOutlineClipboardCopy />}
              onClick={() => copyBackupCodes(backupCodes)}
            >
              Copy All Codes
            </Button>
          </div>
          <div className="codes-grid" style={{ marginTop: 14 }}>
            {backupCodes.map((code, i) => (
              <span key={i} className="code-pill">{code}</span>
            ))}
          </div>
        </Card>
      )}

      {/* Disable 2FA Modal */}
      <Modal
        isOpen={disableModal}
        onClose={() => setDisableModal(false)}
        title="Disable Authenticator App"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p className="modal-note">
            To confirm disabling 2FA, please enter your password and a current 2FA code or backup code.
          </p>
          <Input
            id="disable-pass"
            label="Account Password"
            type="password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
          />
          <Input
            id="disable-code"
            label="Current 2FA Code / Backup Code"
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value)}
            maxLength={8}
          />
          <Button variant="danger" fullWidth onClick={handleDisable2FA} loading={loading}>
            Confirm & Disable 2FA
          </Button>
        </div>
      </Modal>

      {/* Regenerate Codes Modal */}
      <Modal
        isOpen={regenModal}
        onClose={() => setRegenModal(false)}
        title="Regenerate Backup Codes"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p className="modal-note">
            Enter a 6-digit code from your authenticator app to authorize generating a new set of backup codes.
          </p>
          <Input
            id="regen-code-input"
            label="6-Digit Authenticator Code"
            value={regenCode}
            onChange={(e) => setRegenCode(e.target.value)}
            maxLength={6}
            autoFocus
          />
          <Button variant="primary" fullWidth onClick={handleRegenBackupCodes} loading={loading}>
            Generate New Codes
          </Button>
        </div>
      </Modal>
    </div>
  );
}
