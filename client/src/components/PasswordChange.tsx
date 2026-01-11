import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface PasswordChangeProps {
  email: string;
  userType: 'judge' | 'admin' | 'eboard' | 'dancer';
  currentPassword: string; // The password they used to log in
  clubId?: string;
  onPasswordChanged: (success: boolean) => void;
  onCancel?: () => void;
}

const PasswordChange: React.FC<PasswordChangeProps> = ({
  email,
  userType,
  currentPassword,
  clubId = 'msu-dance-club',
  onPasswordChanged,
  onCancel,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (newPassword === currentPassword) {
      toast.error('New password must be different from your current password');
      return;
    }
    
    setLoading(true);
    try {
      const endpoint = userType === 'dancer' 
        ? '/api/auth/change-dancer-password'
        : '/api/auth/change-password';
      
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}${endpoint}`,
        {
          newPassword,
          currentPassword
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        toast.success('Password changed successfully!');
        onPasswordChanged(true);
      } else {
        toast.error('Failed to change password');
        onPasswordChanged(false);
      }
    } catch (error: any) {
      console.error('Password change error:', error);
      toast.error(error.response?.data?.error || 'Failed to change password. Please try again.');
      onPasswordChanged(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#333', marginBottom: '0.5rem' }}>Change Your Password</h2>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          This is your first login. Please set a new password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
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
          {loading ? 'Changing Password...' : 'Change Password'}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
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
            Cancel
          </button>
        )}
      </form>
    </div>
  );
};

export default PasswordChange;
