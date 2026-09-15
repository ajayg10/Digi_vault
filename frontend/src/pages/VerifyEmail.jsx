import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../api/auth';
import { HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineShieldCheck } from 'react-icons/hi';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import './Auth.css';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('Verifying your email address...');
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid or missing verification token.');
        return;
      }

      try {
        await authAPI.confirmVerification(token);
        setStatus('success');
        setMessage('Your email address has been successfully verified.');
        toast.success('Email verified!');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.detail || 'Verification failed. The link may be expired.');
        toast.error('Verification failed');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in-scale" style={{ textAlign: 'center' }}>
        <div className="auth-logo">
          <div className="auth-brand-emblem">
            {status === 'success' ? (
              <HiOutlineCheckCircle style={{ fontSize: '2rem', color: 'var(--security)' }} />
            ) : status === 'error' ? (
              <HiOutlineXCircle style={{ fontSize: '2rem', color: 'var(--danger)' }} />
            ) : (
              <div className="spinner" style={{ width: '28px', height: '28px' }} />
            )}
          </div>
          <h1 className="auth-logo-title">
            {status === 'success'
              ? 'Email Confirmed'
              : status === 'error'
              ? 'Verification Unsuccessful'
              : 'Verifying Address...'}
          </h1>
          <p className="auth-subtitle">{message}</p>
        </div>

        <div style={{ marginTop: '24px' }}>
          <Button variant="primary" fullWidth size="lg" onClick={() => navigate('/login')}>
            {status === 'success' ? 'Proceed to Sign In' : 'Back to Sign In'}
          </Button>
        </div>

        <div className="auth-trust-badge">
          <HiOutlineShieldCheck />
          <span>Account Safeguard Protocol</span>
        </div>
      </div>
    </div>
  );
}
