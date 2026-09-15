import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { HiOutlineKey, HiOutlineShieldCheck } from 'react-icons/hi';
import toast from 'react-hot-toast';
import './Auth.css';

export default function TwoFactorVerify() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { verify2FA, preAuthToken, twoFactorMethod } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  if (!preAuthToken) {
    navigate('/login');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code) return toast.error('Enter your 2FA code');
    setLoading(true);
    try {
      await verify2FA(code);
      toast.success('Identity confirmed. Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid 2FA code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in-scale">
        <div className="auth-logo">
          <div className="auth-brand-emblem">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx="6" fill="var(--security)" />
              <path d="M12 5.5L18 8.2V13C18 16.5 15.4 19.5 12 20.5C8.6 19.5 6 16.5 6 13V8.2L12 5.5Z" stroke="#FFFDF8" strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="12" cy="12.5" r="2.2" fill="#FFFDF8" />
              <path d="M12 14.7V16.8" stroke="#FFFDF8" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="auth-logo-title">Two-Factor Authentication</h1>
          <p className="auth-subtitle">
            {twoFactorMethod === 'email'
              ? 'Check your inbox for the 6-digit code we sent you.'
              : twoFactorMethod === 'totp'
              ? 'Enter the 6-digit code from your authenticator app.'
              : 'Enter the code from your email or authenticator app.'}
            {' Or enter an 8-character backup recovery code.'}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            id="2fa-code"
            label="Verification Code"
            type="text"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            icon={<HiOutlineKey />}
            maxLength={8}
            autoFocus
            required
          />
          <Button type="submit" fullWidth loading={loading} size="lg">
            Verify & Unlock Vault
          </Button>
        </form>

        <p className="auth-footer" style={{ fontSize: '0.78rem' }}>
          Lost access to your device? You can enter one of your backup recovery codes.
        </p>

        <div className="auth-trust-badge">
          <HiOutlineShieldCheck />
          <span>Multi-Factor Vault Verification</span>
        </div>
      </div>
    </div>
  );
}
