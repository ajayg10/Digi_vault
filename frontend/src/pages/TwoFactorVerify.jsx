import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { HiOutlineShieldCheck, HiOutlineKey } from 'react-icons/hi';
import toast from 'react-hot-toast';
import './Auth.css';

export default function TwoFactorVerify() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { verify2FA, preAuthToken } = useAuth();
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
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid 2FA code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-gradient" />
      <div className="auth-card animate-fade-in-scale">
        <div className="auth-logo">
          <div className="auth-logo-icon auth-logo-icon-2fa">
            <HiOutlineShieldCheck />
          </div>
          <h1 className="auth-logo-title">Two-Factor Auth</h1>
          <p className="auth-subtitle">
            Enter your 6-digit TOTP code or an 8-character backup code
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            id="2fa-code"
            label="Authentication Code"
            type="text"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            icon={<HiOutlineKey />}
            maxLength={8}
            autoFocus
          />
          <Button type="submit" fullWidth loading={loading} size="lg">
            Verify
          </Button>
        </form>

        <p className="auth-footer" style={{ fontSize: '0.75rem' }}>
          Lost your authenticator? Use a backup code instead.
        </p>
      </div>
    </div>
  );
}
