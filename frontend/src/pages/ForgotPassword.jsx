import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../api/auth';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { HiOutlineMail, HiOutlineShieldCheck, HiOutlineArrowLeft, HiOutlineCheckCircle } from 'react-icons/hi';
import toast from 'react-hot-toast';
import './Auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Enter your email address');
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSubmitted(true);
      toast.success('Reset link sent if email is registered');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="auth-page">
        <div className="auth-card animate-fade-in-scale">
          <div className="auth-logo">
            <div className="auth-brand-emblem">
              <HiOutlineCheckCircle style={{ fontSize: '2rem', color: 'var(--security)' }} />
            </div>
            <h1 className="auth-logo-title">Check Your Inbox</h1>
            <p className="auth-subtitle">
              If an account is associated with <strong>{email}</strong>, a secure password reset link has been dispatched.
            </p>
          </div>
          <div style={{ marginTop: '24px' }}>
            <Link to="/login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--accent)', fontWeight: 600 }}>
              <HiOutlineArrowLeft /> Return to Sign In
            </Link>
          </div>
          <div className="auth-trust-badge">
            <HiOutlineShieldCheck />
            <span>Secure Password Recovery Channel</span>
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
          <h1 className="auth-logo-title">Reset Vault Password</h1>
          <p className="auth-subtitle">Enter your registered email to receive recovery instructions.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            id="forgot-email"
            label="Registered Email Address"
            type="email"
            placeholder="you@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<HiOutlineMail />}
            autoFocus
            required
          />
          <Button type="submit" fullWidth loading={loading} size="lg">
            Send Reset Instructions
          </Button>
        </form>

        <p className="auth-footer">
          Remembered your password? <Link to="/login">Sign in</Link>
        </p>

        <div className="auth-trust-badge">
          <HiOutlineShieldCheck />
          <span>Zero-Knowledge Verification Architecture</span>
        </div>
      </div>
    </div>
  );
}
