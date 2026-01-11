import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';
import VerificationCode from './VerificationCode';

type LoginRoleType = 'dancer' | 'eboard' | 'admin' | null;

const Login: React.FC = () => {
  const [selectedRoleType, setSelectedRoleType] = useState<LoginRoleType>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedView, setSelectedView] = useState('judge');
  const [loading, setLoading] = useState(false);
  const [showViewSelection, setShowViewSelection] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
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
      // Re-check verification requirements in case settings changed
      let currentVerificationRequired = verificationRequired;
      try {
        const verificationCheck = await axios.get(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth/verification-required/${clubId}`
        );
        currentVerificationRequired = verificationCheck.data.requireVerification || false;
        console.log('Verification check:', { 
          required: currentVerificationRequired, 
          emailConfigured: verificationCheck.data.emailConfigured 
        });
      } catch (checkError) {
        console.error('Error checking verification requirements:', checkError);
      }

      // If email verification is required, send code first (without logging in)
      if (currentVerificationRequired) {
        try {
          const userType = selectedRoleType === 'admin' ? 'admin' : selectedRoleType === 'eboard' ? 'eboard' : 'judge';
          console.log('Sending verification code for:', { email, userType, clubId });
          const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth/send-verification-code`, {
            email,
            userType,
            clubId
          });
          
          if (response.data.success) {
            toast.success('Verification code sent to your email!');
            setShowVerification(true);
            setLoading(false);
            return;
          }
        } catch (verificationError: any) {
          console.error('Error sending verification code:', verificationError);
          const errorMsg = verificationError.response?.data?.error || 'Failed to send verification code. Please try again.';
          toast.error(errorMsg);
          setLoading(false);
          return;
        }
      } else {
        // If verification not required, proceed with normal login
        console.log('Verification not required, proceeding with normal login');
        const loginResponse = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth/login`, {
          email,
          password
        });
        await completeLogin(loginResponse.data);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMsg = error.response?.data?.error || 'Login failed. Please check your credentials.';
      toast.error(errorMsg);
      setLoading(false);
    }
  };

  const handleVerificationComplete = async (verified: boolean) => {
    // After verification is complete (code and password verified), complete login
    if (verified) {
      setLoading(true);
      try {
        // Code and password are already verified by the verification endpoint
        // Now complete the login to get the token
        const loginResponse = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth/login`, {
          email,
          password
        });
        await completeLogin(loginResponse.data);
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

  const completeLogin = async (userData: any) => {
    if (selectedRoleType === 'admin') {
      // Admin login - go directly to admin dashboard
      if (userData.user.canAccessAdmin || userData.user.role === 'admin') {
        localStorage.setItem('token', userData.token);
        localStorage.setItem('user', JSON.stringify(userData.user));
        setUser(userData.user);
        toast.success(`Welcome ${userData.user.name}!`);
        navigate('/admin');
      } else {
        toast.error('You do not have admin access.');
        setLoading(false);
      }
    } else if (selectedRoleType === 'eboard') {
      // E-board member login - show view selection if they have multiple options
      localStorage.setItem('token', userData.token);
      localStorage.setItem('user', JSON.stringify(userData.user));
      setUser(userData.user);
      
      // Check if user has coordinator access
      // Coordinators are identified by: position in ['Abi', 'Sophia', 'Devin', 'Taylor'] 
      // OR name contains "Coordinator" OR role is 'coordinator'
      const coordinatorPositions = ['Abi', 'Sophia', 'Devin', 'Taylor'];
      const hasCoordinatorAccess = userData.user.role === 'coordinator' || 
                                   (userData.user.position && coordinatorPositions.includes(userData.user.position)) ||
                                   (userData.user.name && userData.user.name.toLowerCase().includes('coordinator'));
      
      // Check if user has judge access (default for e-board members unless only coordinator)
      const hasJudgeAccess = userData.user.role === 'judge' || 
                             userData.user.canAccessAdmin ||
                             !hasCoordinatorAccess; // If not specifically a coordinator, assume judge access
      
      if (hasCoordinatorAccess && hasJudgeAccess) {
        // User has multiple views, show selection
        const views: string[] = [];
        if (hasJudgeAccess) views.push('judge');
        if (hasCoordinatorAccess) views.push('coordinator');
        setAvailableViews(views);
        setSelectedView(views[0] || 'judge'); // Default to first available view
        setTempUserData(userData);
        setShowViewSelection(true);
        setLoading(false);
      } else if (hasCoordinatorAccess) {
        // Only coordinator access
        toast.success(`Welcome ${userData.user.name}!`);
        navigate('/coordinator');
      } else {
        // Only judge access (default for e-board members)
        toast.success(`Welcome ${userData.user.name}!`);
        navigate('/judge');
      }
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
      
      if (selectedView === 'coordinator') {
        toast.success(`Welcome ${userName}!`);
        navigate('/coordinator');
      } else if (selectedView === 'judge') {
        toast.success(`Welcome ${userName}!`);
        navigate('/judge');
      } else {
        toast.success(`Welcome ${userName}!`);
        navigate('/judge'); // Default to judge
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
        ) : showVerification ? (
          // Step 2.5: Email Verification
          <VerificationCode
            email={email}
            password={password}
            userType={selectedRoleType === 'admin' ? 'admin' : selectedRoleType === 'eboard' ? 'eboard' : 'judge'}
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
            
            <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#8b7fb8', textAlign: 'center', fontStyle: 'italic' }}>
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
              <label className="form-label">Select View</label>
              <select
                className="form-input"
                value={selectedView}
                onChange={(e) => setSelectedView(e.target.value)}
              >
                {availableViews.includes('judge') && (
                  <option value="judge">Judge View (Score Dancers)</option>
                )}
                {availableViews.includes('coordinator') && (
                  <option value="coordinator">Coordinator View (Manage Attendance)</option>
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
                setSelectedView('judge');
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
