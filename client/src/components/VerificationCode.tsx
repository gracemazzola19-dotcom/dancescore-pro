import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface VerificationCodeProps {
  email: string;
  userType: 'judge' | 'admin' | 'eboard' | 'dancer';
  password?: string; // Password to verify after code is verified
  clubId?: string;
  onVerified: (verified: boolean, requiresPasswordChange?: boolean) => void; // Pass verification result and password change requirement
  onCancel: () => void;
  expiresIn?: number; // seconds
}

const VerificationCode: React.FC<VerificationCodeProps> = ({
  email,
  userType,
  password,
  clubId = 'msu-dance-club',
  onVerified,
  onCancel,
  expiresIn = 600, // 10 minutes default
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(expiresIn);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    // Countdown timer
    if (timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeRemaining]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      toast.error('Please enter a 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth/verify-code`,
        {
          email,
          code,
          userType,
          password, // Include password to verify both code and password
          clubId,
        }
      );

      if (response.data.success && response.data.verified) {
        toast.success('Verification code verified!');
        onVerified(true, response.data.requiresPasswordChange); // Pass verification result and password change requirement
      } else {
        toast.error('Invalid verification code');
        onVerified(false);
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error(error.response?.data?.error || 'Failed to verify code. Please try again.');
      onVerified(false);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth/send-verification-code`,
        {
          email,
          userType,
          clubId,
        }
      );

      if (response.data.success) {
        toast.success('New verification code sent to your email!');
        setTimeRemaining(response.data.expiresIn || 600);
        setCanResend(false);
        setCode(''); // Clear entered code
      }
    } catch (error: any) {
      console.error('Resend error:', error);
      toast.error(error.response?.data?.error || 'Failed to resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#333', marginBottom: '0.5rem' }}>Enter Verification Code</h2>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          We sent a 6-digit code to:
        </p>
        <p style={{ color: '#8b7fb8', fontWeight: '600', fontSize: '0.95rem' }}>
          {email}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Verification Code</label>
          <input
            type="text"
            className="form-input"
            value={code}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6); // Only numbers, max 6 digits
              setCode(value);
            }}
            required
            placeholder="000000"
            maxLength={6}
            style={{
              textAlign: 'center',
              fontSize: '1.5rem',
              letterSpacing: '0.5rem',
              fontFamily: 'monospace',
              fontWeight: '600',
            }}
            autoFocus
          />
          <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem', textAlign: 'center' }}>
            {timeRemaining > 0 ? (
              <>Code expires in: <strong>{formatTime(timeRemaining)}</strong></>
            ) : (
              <span style={{ color: '#dc3545' }}>Code expired. Please request a new one.</span>
            )}
          </p>
        </div>

        <button
          type="submit"
          className="login-button"
          disabled={loading || code.length !== 6 || timeRemaining === 0}
          style={{
            opacity: (loading || code.length !== 6 || timeRemaining === 0) ? 0.6 : 1,
            cursor: (loading || code.length !== 6 || timeRemaining === 0) ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Verifying...' : 'Verify Code'}
        </button>

        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8b7fb8',
                cursor: resendLoading ? 'not-allowed' : 'pointer',
                textDecoration: 'underline',
                fontSize: '0.9rem',
                fontWeight: '600',
                padding: '0.5rem',
              }}
            >
              {resendLoading ? 'Sending...' : 'Resend Code'}
            </button>
          ) : (
            <p style={{ fontSize: '0.85rem', color: '#999' }}>
              Resend available in {formatTime(timeRemaining)}
            </p>
          )}
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: '0.9rem',
              textDecoration: 'underline',
              padding: '0.5rem',
            }}
          >
            ← Back to Login
          </button>
        </div>
      </form>

      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        backgroundColor: '#e3f2fd',
        borderRadius: '0.5rem',
        fontSize: '0.85rem',
        color: '#1976d2'
      }}>
        <strong>Note:</strong> Check your spam/junk folder if you don't see the email. Codes expire after 10 minutes.
      </div>
    </div>
  );
};

export default VerificationCode;
