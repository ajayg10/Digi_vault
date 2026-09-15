import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineShieldCheck } from 'react-icons/hi';
import toast from 'react-hot-toast';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Fill in all fields');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.requires_2fa) {
        toast('Two-factor verification required', { icon: '🔐' });
        navigate('/2fa-verify', { state: { from } });
      } else {
        toast.success('Welcome back to your vault');
        navigate(from, { replace: true });
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
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
              <rect width="24" height="24" rx="6" fill="var(--accent)" />
              <path d="M12 5.5L18 8.2V13C18 16.5 15.4 19.5 12 20.5C8.6 19.5 6 16.5 6 13V8.2L12 5.5Z" stroke="#FFFDF8" strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="12" cy="12.5" r="2.2" fill="#FFFDF8" />
              <path d="M12 14.7V16.8" stroke="#FFFDF8" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="auth-logo-title">DigiVault</h1>
          <p className="auth-subtitle">Sign in to access your private digital workspace</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            id="login-email"
            label="Email Address"
            type="email"
            placeholder="you@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<HiOutlineMail />}
            autoFocus
            required
          />
          <Input
            id="login-password"
            label="Account Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<HiOutlineLockClosed />}
            required
          />
          <div className="auth-options">
            <Link to="/forgot-password" style={{ marginLeft: 'auto' }} className="forgot-password-link">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" fullWidth loading={loading} size="lg">
            Sign In to Vault
          </Button>
        </form>

        <p className="auth-footer">
          Don&apos;t have an account? <Link to="/signup">Create workspace</Link>
        </p>

        <div className="auth-trust-badge">
          <HiOutlineShieldCheck />
          <span>Zero-Knowledge Architecture · Encrypted Vault</span>
        </div>
      </div>
    </div>
  );
}
