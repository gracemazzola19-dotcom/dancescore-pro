import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';
import VerificationCode from './VerificationCode';
import PasswordChange from './PasswordChange';
import ForgotPassword from './ForgotPassword';

type LoginRoleType = 'dancer' | 'eboard' | 'admin' | null;

const Login: React.FC = () => {
  const [selectedRoleType, setSelectedRoleType] = useState<LoginRoleType>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedView, setSelectedView] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [showViewSelection, setShowViewSelection] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [tempUserData, setTempUserData] = useState<any>(null);
  const [availableViews, setAvailableViews] = useState<string[]>([]);
  const [clubId, setClubId] = useState('msu-dance-club');
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [codeExpiry, setCodeExpiry] = useState(600);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  // Check if email verification is required
  useEffect(() => {
    const checkVerificationRequired = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth/verification-required/${clubId}`
        );
        setVerificationRequired(response.data.requireVerification || false);
        setCodeExpiry(response.data.codeExpiryMinutes * 60 || 600);
        
        if (response.data.requireVerification && !response.data.emailConfigured) {
          console.warn('Email verification is required but email service is not configured');
        }
      } catch (error) {
        console.error('Error checking verification requirements:', error);
        setVerificationRequired(false); // Default to false on error
      }
    };
    checkVerificationRequired();
  }, [clubId]);

  const handleRoleTypeSelection = (roleType: LoginRoleType) => {
    if (roleType === 'dancer') {
      navigate('/dancer-login');
      return;
    }
    setSelectedRoleType(roleType);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Re-check verification requirements with email (to check per-user login count)
      let currentVerificationRequired = verificationRequired;
      try {
        const verificationCheck = await axios.get(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth/verification-required/${clubId}?email=${encodeURIComponent(email)}`
        );
        currentVerificationRequired = verificationCheck.data.requireVerification || false;
        console.log('Verification check:', { 
          required: currentVerificationRequired, 
          emailConfigured: verificationCheck.data.emailConfigured,
          email: email
        });
      } catch (checkError) {
        console.error('Error checking verification requirements:', checkError);
      }

      // If email verification is required, send code first (without logging in)
      if (currentVerificationRequired) {
        try {
          const userType = selectedRoleType === 'admin' ? 'admin' : selectedRoleType === 'eboard' ? 'eboard' : 'dancer';
          console.log('Sending verification code for:', email, 'userType:', userType, 'clubId:', clubId);
          const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth/send-verification-code`, {
            email,
            userType,
            clubId
          });
          
          if (response.data.success) {
            // Check if email sending failed
            if (response.data.emailFailed) {
              // Email failed - allow login without verification as fallback
              // Note: This is expected behavior when email service is unavailable
              console.log('Email sending failed, allowing login without verification (expected fallback behavior)');
              toast(response.data.warning || 'Email service unavailable. Proceeding with login without verification.');
              // Proceed with normal login
              const loginResponse = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth/login`, {
                email,
                password,
                selectedRole: selectedRoleType
              });
              await completeLogin(loginResponse.data);
              return;
            }
            toast.success('Verification code sent to your email!');
            setShowVerification(true);
            setLoading(false);
            return;
          }
        } catch (verificationError: any) {
          // If verification endpoint fails, allow login without verification as fallback
          console.error('Error sending verification code:', verificationError);
          console.warn('Allowing login without verification due to email service failure');
          toast('Email service unavailable. Proceeding with login without verification.');
          // Proceed with normal login
          const loginResponse = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth/login`, {
            email,
            password,
            selectedRole: selectedRoleType
          });
          await completeLogin(loginResponse.data);
          return;
        }
      } else {
        // If verification not required, proceed with normal login
        console.log('Verification not required, proceeding with normal login');
        const loginResponse = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth/login`, {
          email,
          password,
          selectedRole: selectedRoleType
        });
        
        // Check if password change is required
        if (loginResponse.data.user?.requiresPasswordChange) {
          // Store token in localStorage so password change endpoint can use it
          localStorage.setItem('token', loginResponse.data.token);
          setTempUserData(loginResponse.data);
          setShowPasswordChange(true);
          setLoading(false);
        } else {
          await completeLogin(loginResponse.data);
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMsg = error.response?.data?.error || 'Login failed. Please check your credentials.';
      toast.error(errorMsg);
      setLoading(false);
    }
  };

  const handleVerificationComplete = async (verified: boolean, requiresPasswordChange?: boolean) => {
    // After verification is complete (code and password verified), check if password change is required
    if (verified) {
      setLoading(true);
      try {
        // Code and password are already verified by the verification endpoint
        // Now complete the login to get the token
        const loginResponse = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth/login`, {
          email,
          password,
          selectedRole: selectedRoleType
        });
        
        // Check if password change is required (from verify-code response or login response)
        const needsPasswordChange = requiresPasswordChange || loginResponse.data.user?.requiresPasswordChange;
        
        if (needsPasswordChange) {
          // Store token in localStorage so password change endpoint can use it
          localStorage.setItem('token', loginResponse.data.token);
          // Store login data temporarily, show password change UI
          setTempUserData(loginResponse.data);
          setShowVerification(false);
          setShowPasswordChange(true);
          setLoading(false);
        } else {
          // No password change required, complete login normally
          await completeLogin(loginResponse.data);
        }
      } catch (error: any) {
        console.error('Login completion error:', error);
        toast.error(error.response?.data?.error || 'Failed to complete login. Please try again.');
        setLoading(false);
      }
    } else {
      // Verification failed, allow retry
      setShowVerification(false);
      setLoading(false);
    }
  };

  const handlePasswordChangeComplete = async (success: boolean) => {
    if (success && tempUserData) {
      // Password changed successfully, now complete login with updated credentials
      // Re-login to get fresh token
      try {
        setLoading(true);
        // Note: We need to re-login after password change, but we don't have the new password here
        // The password change endpoint doesn't return a new token, so we need to either:
        // 1. Ask user to login again with new password, or
        // 2. Have the password change endpoint return a new token
        
        // For now, let's use the stored token from tempUserData (it should still be valid)
        // The user will use their new password on next login
        await completeLogin(tempUserData);
        setShowPasswordChange(false);
        setTempUserData(null);
      } catch (error: any) {
        console.error('Error completing login after password change:', error);
        toast.error('Password changed, but login failed. Please log in again with your new password.');
        setShowPasswordChange(false);
        setLoading(false);
        // Reset form to allow re-login
        setPassword('');
        setShowVerification(false);
      }
    } else {
      // Password change failed or cancelled
      setShowPasswordChange(false);
      setLoading(false);
      setShowVerification(false);
    }
  };

  const completeLogin = async (userData: any) => {
    // Check if user is a coordinator (position contains "Coordinator")
    const isCoordinator = userData.user?.isCoordinator || 
                         (userData.user?.position && userData.user.position.includes('Coordinator'));
    
    if (isCoordinator) {
      // Coordinator login - go directly to Coordinator Dashboard (read-only attendance, absence requests, make-up)
      localStorage.setItem('token', userData.token);
      localStorage.setItem('user', JSON.stringify(userData.user));
      setUser(userData.user);
      toast.success(`Welcome ${userData.user.name}!`);
      // Use setTimeout to ensure state updates before navigation
      setTimeout(() => {
        window.location.href = '/coordinator';
      }, 100);
    } else if (selectedRoleType === 'admin') {
      // Admin login - show view selection (Admin Dashboard OR Judge Dashboard)
      localStorage.setItem('token', userData.token);
      localStorage.setItem('user', JSON.stringify(userData.user));
      setUser(userData.user);
      
      // Admins can access both Admin and Judge pages
      // Show selection screen
      setAvailableViews(['admin', 'judge']);
      setSelectedView('admin'); // Default to admin
      setTempUserData(userData);
      setShowViewSelection(true);
      setLoading(false);
    } else if (selectedRoleType === 'eboard') {
      // E-board member login - go directly to Judge Dashboard (no admin access)
      localStorage.setItem('token', userData.token);
      localStorage.setItem('user', JSON.stringify(userData.user));
      console.log('E-board login - userData:', userData);
      console.log('E-board login - user role:', userData.user.role);
      setUser(userData.user);
      toast.success(`Welcome ${userData.user.name}!`);
      // Use setTimeout to ensure state updates before navigation
      setTimeout(() => {
        console.log('Navigating to /judge, user should be:', JSON.parse(localStorage.getItem('user') || '{}'));
        window.location.href = '/judge';
      }, 100);
    } else {
      // Should not reach here, but handle just in case
      setLoading(false);
    }
  };

  const handleViewSelection = async () => {
    setLoading(true);
    try {
      // User is already authenticated, just navigate to selected view
      const userName = tempUserData?.user?.name || 'User';
      
      if (selectedView === 'admin') {
        toast.success(`Welcome ${userName}!`);
        navigate('/admin');
      } else if (selectedView === 'judge') {
        toast.success(`Welcome ${userName}!`);
        navigate('/judge');
      } else {
        // Default to admin
        toast.success(`Welcome ${userName}!`);
        navigate('/admin');
      }
    } catch (error) {
      toast.error('Failed to load dashboard. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">DanceScore Pro</h1>
        <p style={{ textAlign: 'center', color: '#8b7fb8', marginBottom: '2rem', fontSize: '1rem' }}>
          Login to Your Organization
        </p>
        
        {!selectedRoleType ? (
          // Step 1: Role Type Selection
          <div>
            <p style={{ textAlign: 'center', color: '#666', marginBottom: '2rem', fontSize: '0.95rem' }}>
              Select your role type:
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => handleRoleTypeSelection('dancer')}
                className="login-button"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white'
                }}
              >
                Dancer
              </button>
              
              <button
                type="button"
                onClick={() => handleRoleTypeSelection('eboard')}
                className="login-button"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white'
                }}
              >
                E-board Member
              </button>
              
              <button
                type="button"
                onClick={() => handleRoleTypeSelection('admin')}
                className="login-button"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white'
                }}
              >
                Admin
              </button>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '2rem', textAlign: 'center' }}>
              Need to create a new organization?{' '}
              <button
                type="button"
                onClick={() => navigate('/signup')}
                style={{
                  background: 'transparent',
                  color: '#8b7fb8',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  textDecoration: 'underline',
                  fontSize: '0.85rem',
                  padding: 0
                }}
              >
                Sign Up
              </button>
            </p>
          </div>
        ) : showForgotPassword ? (
          // Step 2.6: Forgot Password
          <ForgotPassword
            userType={selectedRoleType === 'admin' ? 'admin' : selectedRoleType === 'eboard' ? 'eboard' : 'dancer'}
            clubId={tempUserData?.user?.clubId || clubId}
            onBack={() => {
              setShowForgotPassword(false);
              setEmail('');
              setPassword('');
            }}
            onSuccess={() => {
              setShowForgotPassword(false);
              setEmail('');
              setPassword('');
            }}
          />
        ) : showPasswordChange ? (
          // Step 2.7: Password Change (First Login)
          <PasswordChange
            email={email}
            userType={selectedRoleType === 'admin' ? 'admin' : selectedRoleType === 'eboard' ? 'eboard' : 'dancer'}
            currentPassword={password}
            clubId={tempUserData?.user?.clubId || clubId}
            onPasswordChanged={handlePasswordChangeComplete}
            onCancel={() => {
              setShowPasswordChange(false);
              setShowVerification(false);
              setPassword('');
              setLoading(false);
            }}
          />
        ) : showVerification ? (
          // Step 2.5: Email Verification
          <VerificationCode
            email={email}
            password={password}
            userType={selectedRoleType === 'admin' ? 'admin' : selectedRoleType === 'eboard' ? 'eboard' : 'dancer'}
            clubId={tempUserData?.user?.clubId || clubId}
            onVerified={handleVerificationComplete}
            onCancel={() => {
              setShowVerification(false);
              setPassword('');
            }}
            expiresIn={codeExpiry}
          />
        ) : !showViewSelection ? (
          // Step 2: Login Form
          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedRoleType(null);
                  setEmail('');
                  setPassword('');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8b7fb8',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  textDecoration: 'underline'
                }}
              >
                ← Back to Role Selection
              </button>
            </div>
            
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Password (Your Position)</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your position"
              />
            </div>
            
            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
            
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8b7fb8',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  textDecoration: 'underline',
                  padding: 0
                }}
              >
                Forgot Password?
              </button>
            </div>
            
            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#8b7fb8', textAlign: 'center', fontStyle: 'italic' }}>
              Use your email and position as password
            </p>
          </form>
        ) : (
          // Step 3: View Selection (for E-board members with multiple views)
          <div>
            <p style={{ textAlign: 'center', color: '#8b7fb8', marginBottom: '1.5rem', fontSize: '1rem' }}>
              Welcome {tempUserData?.user?.name}!
            </p>
            <p style={{ textAlign: 'center', color: '#666', marginBottom: '2rem', fontSize: '0.95rem' }}>
              You have access to multiple views. Please select your dashboard:
            </p>
            
            <div className="form-group">
              <label className="form-label">Select Dashboard</label>
              <select
                className="form-input"
                value={selectedView}
                onChange={(e) => setSelectedView(e.target.value)}
              >
                {availableViews.includes('admin') && (
                  <option value="admin">Admin Dashboard</option>
                )}
                {availableViews.includes('judge') && (
                  <option value="judge">Judge Dashboard</option>
                )}
              </select>
            </div>
            
            <button
              onClick={handleViewSelection}
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Continue'}
            </button>
            
            <button
              onClick={() => {
                setShowViewSelection(false);
                setTempUserData(null);
                setEmail('');
                setPassword('');
                setSelectedRoleType(null);
                setAvailableViews([]);
                setSelectedView('admin');
              }}
              style={{
                marginTop: '1rem',
                padding: '0.75rem',
                width: '100%',
                borderRadius: '0.5rem',
                border: '2px solid #d4c5f9',
                backgroundColor: 'white',
                color: '#8b7fb8',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
