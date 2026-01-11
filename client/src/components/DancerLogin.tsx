import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';
import VerificationCode from './VerificationCode';

const DancerLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [clubName, setClubName] = useState<string>('MSU Dance Club');
  const [clubId, setClubId] = useState('msu-dance-club');
  const [showVerification, setShowVerification] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [codeExpiry, setCodeExpiry] = useState(600);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch club name from public appearance endpoint
    const fetchClubName = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/appearance`);
        if (response.data.clubName) {
          setClubName(response.data.clubName);
        }
        if (response.data.clubId) {
          setClubId(response.data.clubId);
        }
      } catch (error) {
        console.error('Error fetching club name:', error);
        // Keep default
      }
    };
    fetchClubName();
  }, []);

  // Check if email verification is required (will be checked per-user in handleSubmit)
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

  const handleSubmit = async (e: React.FormEvent) => {
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
          console.log('Sending verification code for dancer:', { email, clubId });
          const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth/send-verification-code`, {
            email,
            userType: 'dancer',
            clubId
          });
          
          if (response.data.success) {
            // Check if email sending failed
            if (response.data.emailFailed) {
              // Email failed - allow login without verification as fallback
              console.warn('Email sending failed, allowing login without verification');
              toast(response.data.warning || 'Email service unavailable. Proceeding with login without verification.');
              // Proceed with normal login
              const loginResponse = await axios.post(
                `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth/dancer-login`,
                { email, password }
              );
              const userData = loginResponse.data;
              localStorage.setItem('token', userData.token);
              localStorage.setItem('user', JSON.stringify(userData.user));
              setUser(userData.user);
              toast.success(`Welcome ${userData.user.name}!`);
              navigate('/dancer');
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
          const loginResponse = await axios.post(
            `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth/dancer-login`,
            { email, password }
          );
          const userData = loginResponse.data;
          localStorage.setItem('token', userData.token);
          localStorage.setItem('user', JSON.stringify(userData.user));
          setUser(userData.user);
          toast.success(`Welcome ${userData.user.name}!`);
          navigate('/dancer');
          return;
        }
      } else {
        // If verification not required, proceed with normal login
        console.log('Verification not required, proceeding with normal login');
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth/dancer-login`,
          { email, password }
        );

        const userData = response.data;
        localStorage.setItem('token', userData.token);
        localStorage.setItem('user', JSON.stringify(userData.user));
        setUser(userData.user);
        toast.success(`Welcome ${userData.user.name}!`);
        navigate('/dancer');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMsg = error.response?.data?.error || 'Login failed. Please check your credentials.';
      toast.error(errorMsg);
    } finally {
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
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth/dancer-login`,
          { email, password }
        );

        const userData = response.data;
        localStorage.setItem('token', userData.token);
        localStorage.setItem('user', JSON.stringify(userData.user));
        setUser(userData.user);
        toast.success(`Welcome ${userData.user.name}!`);
        navigate('/dancer');
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

  // Show verification code input if verification is required
  if (showVerification) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1 className="login-title">{clubName}</h1>
          <p style={{ textAlign: 'center', color: '#8b7fb8', marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' }}>
            Dancer Portal
          </p>
          <VerificationCode
            email={email}
            userType="dancer"
            password={password}
            clubId={clubId}
            onVerified={handleVerificationComplete}
            onCancel={() => {
              setShowVerification(false);
              setLoading(false);
            }}
            expiresIn={codeExpiry}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">{clubName}</h1>
        <p style={{ textAlign: 'center', color: '#8b7fb8', marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' }}>
          Dancer Portal
        </p>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Login to view your attendance
        </p>
        
        <form onSubmit={handleSubmit}>
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
            <label className="form-label">Password (Your Level)</label>
            <input
              type="text"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="e.g., Level 1, Level 2, etc."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  e.preventDefault();
                }
              }}
            />
          </div>
          
          <button
            type="submit"
            className="login-button"
            disabled={loading}
            style={{
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '0.5rem',
          fontSize: '0.85rem',
          color: '#1976d2'
        }}>
          <strong>Note:</strong> Use the email you provided during audition registration and your assigned level (e.g., "Level 1") as your password.
        </div>

        <div style={{ 
          marginTop: '1rem', 
          textAlign: 'center'
        }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              color: '#6c757d',
              cursor: 'pointer',
              fontSize: '0.9rem',
              textDecoration: 'underline'
            }}
          >
            ← Back to Judge/Admin Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default DancerLogin;


