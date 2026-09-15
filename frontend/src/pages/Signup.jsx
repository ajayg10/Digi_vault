import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineShieldCheck } from 'react-icons/hi';
import toast from 'react-hot-toast';
import './Auth.css';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Fill in all fields');
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    if (password !== confirmPassword) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await signup(email, password);
      toast.success('Account created! Please sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Signup failed');
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
          <p className="auth-subtitle">Create your private, end-to-end protected vault</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            id="signup-email"
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
            id="signup-password"
            label="Password"
            type="password"
            placeholder="Minimum 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<HiOutlineLockClosed />}
            required
          />
          <Input
            id="signup-confirm"
            label="Confirm Password"
            type="password"
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            icon={<HiOutlineLockClosed />}
            required
          />
          <Button type="submit" fullWidth loading={loading} size="lg">
            Create Free Vault
          </Button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>

        <div className="auth-trust-badge">
          <HiOutlineShieldCheck />
          <span>Zero-Knowledge Architecture · Encrypted Vault</span>
        </div>
      </div>
    </div>
  );
}
