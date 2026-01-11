import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <div className="landing-content">
        <div className="landing-header">
          <h1 className="landing-title">DanceScore Pro</h1>
          <p className="landing-subtitle">Dance Audition & Attendance Management System</p>
        </div>

        <div className="landing-options">
          <div className="landing-option-card">
            <h2>Login</h2>
            <p>Already part of an organization? Login with your credentials to access your dashboard</p>
            <button 
              className="option-button primary"
              onClick={() => navigate('/login')}
            >
              Login
            </button>
          </div>

          <div className="landing-divider">
            <span>OR</span>
          </div>

          <div className="landing-option-card">
            <h2>Sign Up</h2>
            <p>Create a new organization and start managing your dance club's auditions and attendance</p>
            <button 
              className="option-button secondary"
              onClick={() => navigate('/signup')}
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
