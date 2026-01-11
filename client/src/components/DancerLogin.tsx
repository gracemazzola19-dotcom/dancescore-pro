import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const DancerLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [clubName, setClubName] = useState<string>('MSU Dance Club');
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
      } catch (error) {
        console.error('Error fetching club name:', error);
        // Keep default
      }
    };
    fetchClubName();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
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
      console.error('Login error:', error);
      const errorMsg = error.response?.data?.error || 'Login failed. Please check your credentials.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

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


