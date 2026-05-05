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
      toast.success('Password reset successfully!');
      setTimeout(() => navigate('/login'), 5000);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-bg-gradient" />
        <div className="auth-card animate-fade-in-scale">
          <div className="auth-logo">
            <div className="auth-logo-icon auth-logo-icon-2fa">
              <HiOutlineCheckCircle />
            </div>
            <h1 className="auth-logo-title">Password Reset!</h1>
            <p className="auth-subtitle">
              Your password has been updated successfully. You will be redirected to the login page shortly.
            </p>
          </div>
          <div style={{ marginTop: '24px' }}>
            <Button fullWidth onClick={() => navigate('/login')}>
              Go to Login Now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-gradient" />
      <div className="auth-card animate-fade-in-scale">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <HiOutlineShieldCheck />
          </div>
          <h1 className="auth-logo-title">Reset Password</h1>
          <p className="auth-subtitle">Create a strong new password for your account.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            id="reset-password"
            label="New Password"
            type="password"
            placeholder="Min 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<HiOutlineLockClosed />}
            required
          />
          <Input
            id="reset-confirm"
            label="Confirm New Password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            icon={<HiOutlineLockClosed />}
            required
          />
          <Button type="submit" fullWidth loading={loading} size="lg">
            Update Password
          </Button>
        </form>

        <p className="auth-footer">
          Wait, I remembered! <Link to="/login">Back to Sign in</Link>
        </p>
      </div>
    </div>
  );
}
