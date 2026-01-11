import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface ForgotPasswordProps {
  userType: 'judge' | 'admin' | 'eboard' | 'dancer';
  clubId?: string;
  onBack: () => void;
  onSuccess?: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({
  userType,
  clubId = 'msu-dance-club',
  onBack,
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'email' | 'code' | 'reset'>('email');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth/forgot-password`,
        {
          email,
          userType,
          clubId
        }
      );
      
      if (response.data.success) {
        if (response.data.emailFailed) {
          toast.error('Email service is unavailable. Please contact your administrator for assistance.');
          setLoading(false);
          return;
        }
        toast.success('Password reset code sent to your email!');
        setStep('code');
      } else {
        toast.error(response.data.error || 'Failed to send reset code');
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);
      toast.error(error.response?.data?.error || 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      toast.error('Please enter a 6-digit verification code');
      return;
    }
    
    setStep('reset');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth/reset-password`,
        {
          email,
          code,
          newPassword,
          userType,
          clubId
        }
      );
      
      if (response.data.success) {
        toast.success('Password reset successfully! You can now log in with your new password.');
        if (onSuccess) {
          onSuccess();
        } else {
          onBack();
        }
      } else {
        toast.error(response.data.error || 'Failed to reset password');
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.response?.data?.error || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#333', marginBottom: '0.5rem' }}>Reset Password</h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          {step === 'email' && 'Enter your email to receive a reset code'}
          {step === 'code' && 'Enter the verification code sent to your email'}
          {step === 'reset' && 'Enter your new password'}
        </p>
      </div>

      {step === 'email' && (
        <form onSubmit={handleSendCode}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: loading ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '1rem'
            }}
          >
            {loading ? 'Sending...' : 'Send Reset Code'}
          </button>

          <button
            type="button"
            onClick={onBack}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: 'transparent',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: '0.5rem',
              fontSize: '0.9rem',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            Back to Login
          </button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={handleVerifyCode}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
              Verification Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit code"
              required
              maxLength={6}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '0.5rem',
                fontSize: '1.5rem',
                textAlign: 'center',
                letterSpacing: '0.5rem',
                boxSizing: 'border-box',
                fontFamily: 'monospace'
              }}
              disabled={loading}
            />
            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem', textAlign: 'center' }}>
              Code sent to: {email}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: loading ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '1rem'
            }}
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>

          <button
            type="button"
            onClick={() => setStep('email')}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: 'transparent',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: '0.5rem',
              fontSize: '0.9rem',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            ← Back
          </button>
        </form>
      )}

      {step === 'reset' && (
        <form onSubmit={handleResetPassword}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 6 characters)"
              required
              minLength={6}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={6}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: loading ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '1rem'
            }}
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>

          <button
            type="button"
            onClick={() => setStep('code')}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: 'transparent',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: '0.5rem',
              fontSize: '0.9rem',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            ← Back
          </button>
        </form>
      )}
    </div>
  );
};

export default ForgotPassword;
