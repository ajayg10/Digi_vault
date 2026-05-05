import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../api/auth';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { HiOutlineMail, HiOutlineShieldCheck, HiOutlineArrowLeft } from 'react-icons/hi';
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
        <div className="auth-bg-gradient" />
        <div className="auth-card animate-fade-in-scale">
          <div className="auth-logo">
            <div className="auth-logo-icon auth-logo-icon-2fa">
              <HiOutlineMail />
            </div>
            <h1 className="auth-logo-title">Check Your Email</h1>
            <p className="auth-subtitle">
              If {email} is registered, you will receive a password reset link shortly.
            </p>
          </div>
          <div style={{ marginTop: '24px' }}>
            <Link to="/login" className="flex items-center justify-center gap-2 text-accent font-medium hover:underline">
              <HiOutlineArrowLeft /> Back to Login
            </Link>
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
          <h1 className="auth-logo-title">Forgot Password?</h1>
          <p className="auth-subtitle">No worries, we'll send you reset instructions.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            id="forgot-email"
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<HiOutlineMail />}
            required
          />
          <Button type="submit" fullWidth loading={loading} size="lg">
            Send Reset Link
          </Button>
        </form>

        <p className="auth-footer">
          Remember your password? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
