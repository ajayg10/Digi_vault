import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../api/auth';
import { HiOutlineCheckCircle, HiOutlineXCircle } from 'react-icons/hi';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

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
        setMessage('Invalid verification link.');
        return;
      }

      try {
        await authAPI.confirmVerification(token);
        setStatus('success');
        setMessage('Your email has been successfully verified!');
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
    <div className="auth-page animate-fade-in">
      <div className="auth-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <div className="auth-header">
          <div className="auth-logo">
            {status === 'success' ? (
              <HiOutlineCheckCircle style={{ fontSize: '4rem', color: 'var(--success)' }} />
            ) : status === 'error' ? (
              <HiOutlineXCircle style={{ fontSize: '4rem', color: 'var(--danger)' }} />
            ) : (
              <div className="spinner" style={{ width: '4rem', height: '4rem' }} />
            )}
          </div>
          <h1 className="auth-logo-title" style={{ marginTop: '1.5rem' }}>
            {status === 'success' ? 'Email Verified' : status === 'error' ? 'Verification Failed' : 'Verifying...'}
          </h1>
          <p className="auth-subtitle" style={{ marginTop: '1rem', fontSize: '1.1rem' }}>
            {message}
          </p>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <Button variant="primary" fullWidth onClick={() => navigate('/login')}>
            {status === 'success' ? 'Go to Login' : 'Back to Login'}
          </Button>
        </div>
      </div>
    </div>
  );
}
