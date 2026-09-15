import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authAPI } from '../api/auth';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { HiOutlineLockClosed, HiOutlineShieldCheck, HiOutlineCheckCircle } from 'react-icons/hi';
import toast from 'react-hot-toast';
import './Auth.css';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      toast.error('Invalid or missing reset token');
      navigate('/login');
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return toast.error('Enter a new password');
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    if (password !== confirmPassword) return toast.error('Passwords do not match');

    setLoading(true);
    try {
      await authAPI.resetPassword(token, password);
      setSuccess(true);
      toast.success('Password updated successfully!');
      setTimeout(() => navigate('/login'), 4000);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card animate-fade-in-scale" style={{ textAlign: 'center' }}>
          <div className="auth-logo">
            <div className="auth-brand-emblem">
              <HiOutlineCheckCircle style={{ fontSize: '2rem', color: 'var(--security)' }} />
            </div>
            <h1 className="auth-logo-title">Password Reset Complete</h1>
            <p className="auth-subtitle">
              Your credentials have been securely updated. You will be redirected to the sign in page momentarily.
            </p>
          </div>
          <div style={{ marginTop: '24px' }}>
            <Button variant="primary" fullWidth size="lg" onClick={() => navigate('/login')}>
              Proceed to Sign In
            </Button>
          </div>
          <div className="auth-trust-badge">
            <HiOutlineShieldCheck />
            <span>Vault Credentials Secured</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in-scale">
        <div className="auth-logo">
          <div className="auth-brand-emblem">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx="6" fill="var(--accent)" />
              <path d="M12 5.5L18 8.2V13C18 16.5 15.4 19.5 12 20.5C8.6 19.5 6 16.5 6 13V8.2L12 5.5Z" stroke="#FFFDF8" strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="12" cy="12.5" r="2.2" fill="#FFFDF8" />
              <path d="M12 14.7V16.8" stroke="#FFFDF8" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="auth-logo-title">Create New Password</h1>
          <p className="auth-subtitle">Establish a strong password to protect your vault data.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            id="reset-password"
            label="New Password"
            type="password"
            placeholder="Minimum 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<HiOutlineLockClosed />}
            autoFocus
            required
          />
          <Input
            id="reset-confirm"
            label="Confirm New Password"
            type="password"
            placeholder="Repeat new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            icon={<HiOutlineLockClosed />}
            required
          />
          <Button type="submit" fullWidth loading={loading} size="lg">
            Update & Secure Vault
          </Button>
        </form>

        <p className="auth-footer">
          Remembered your password? <Link to="/login">Back to Sign in</Link>
        </p>

        <div className="auth-trust-badge">
          <HiOutlineShieldCheck />
          <span>Encrypted Key Generation</span>
        </div>
      </div>
    </div>
  );
}
