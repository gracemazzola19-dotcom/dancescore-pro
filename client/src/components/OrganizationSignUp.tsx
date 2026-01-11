import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface SignUpFormData {
  organizationName: string;
  organizationSlug: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  adminPasswordConfirm: string;
  adminPosition: string;
}

const OrganizationSignUp: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<SignUpFormData>({
    organizationName: '',
    organizationSlug: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPasswordConfirm: '',
    adminPosition: 'President'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-generate slug from organization name
    if (name === 'organizationName') {
      const slug = value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setFormData(prev => ({
        ...prev,
        organizationSlug: slug
      }));
    }
  };

  const validateForm = (): boolean => {
    if (!formData.organizationName.trim()) {
      toast.error('Organization name is required');
      return false;
    }

    if (!formData.organizationSlug.trim()) {
      toast.error('Organization slug is required');
      return false;
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-_]+$/;
    if (!slugRegex.test(formData.organizationSlug)) {
      toast.error('Organization slug can only contain lowercase letters, numbers, hyphens, and underscores');
      return false;
    }

    if (!formData.adminName.trim()) {
      toast.error('Admin name is required');
      return false;
    }

    if (!formData.adminEmail.trim()) {
      toast.error('Admin email is required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.adminEmail)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    if (!formData.adminPassword) {
      toast.error('Password is required');
      return false;
    }

    if (formData.adminPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }

    if (formData.adminPassword !== formData.adminPasswordConfirm) {
      toast.error('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Create organization and first admin user
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/organizations/signup`,
        {
          organizationName: formData.organizationName.trim(),
          organizationSlug: formData.organizationSlug.trim().toLowerCase(),
          adminName: formData.adminName.trim(),
          adminEmail: formData.adminEmail.trim().toLowerCase(),
          adminPassword: formData.adminPassword,
          adminPosition: formData.adminPosition
        }
      );

      const { token, user, organization } = response.data;

      // Store token and user data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);

      toast.success(`Welcome to ${organization.name}! Your organization has been created.`);
      
      // Navigate to admin dashboard
      navigate('/admin');
    } catch (error: any) {
      console.error('Sign-up error:', error);
      const errorMsg = error.response?.data?.error || 'Failed to create organization. Please try again.';
      toast.error(errorMsg);
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div style={{ marginBottom: '2rem' }}>
          <h1 className="login-title">Create New Organization</h1>
          <p style={{ textAlign: 'center', color: '#8b7fb8', marginBottom: '0', fontSize: '1rem' }}>
            Set up your dance club or organization
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ maxHeight: '80vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
          {/* Organization Information */}
          <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #dee2e6' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#333', marginBottom: '1rem' }}>Organization Information</h3>
            
            <div className="form-group">
              <label className="form-label" htmlFor="organizationName">Organization Name *</label>
              <input
                type="text"
                id="organizationName"
                name="organizationName"
                className="form-input"
                value={formData.organizationName}
                onChange={handleChange}
                placeholder="e.g., State University Dance Club"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="organizationSlug">Organization Identifier (URL) *</label>
              <input
                type="text"
                id="organizationSlug"
                name="organizationSlug"
                className="form-input"
                value={formData.organizationSlug}
                onChange={handleChange}
                placeholder="e.g., state-university-dance-club"
                pattern="[a-z0-9-_]+"
                required
                disabled={loading}
              />
              <small style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
                Lowercase letters, numbers, hyphens, and underscores only. Used in your organization's URL.
              </small>
            </div>
          </div>

          {/* Admin Account Information */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#333', marginBottom: '0.5rem' }}>Administrator Account</h3>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
              This will be your admin account to manage your organization.
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="adminName">Your Name *</label>
              <input
                type="text"
                id="adminName"
                name="adminName"
                className="form-input"
                value={formData.adminName}
                onChange={handleChange}
                placeholder="Your full name"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="adminEmail">Email Address *</label>
              <input
                type="email"
                id="adminEmail"
                name="adminEmail"
                className="form-input"
                value={formData.adminEmail}
                onChange={handleChange}
                placeholder="your.email@example.com"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="adminPosition">Position/Role</label>
              <select
                id="adminPosition"
                name="adminPosition"
                className="form-input"
                value={formData.adminPosition}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="President">President</option>
                <option value="Vice President">Vice President</option>
                <option value="Secretary">Secretary</option>
                <option value="Treasurer">Treasurer</option>
                <option value="Administrator">Administrator</option>
                <option value="Director">Director</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="adminPassword">Password *</label>
              <input
                type="password"
                id="adminPassword"
                name="adminPassword"
                className="form-input"
                value={formData.adminPassword}
                onChange={handleChange}
                placeholder="At least 6 characters"
                minLength={6}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="adminPasswordConfirm">Confirm Password *</label>
              <input
                type="password"
                id="adminPasswordConfirm"
                name="adminPasswordConfirm"
                className="form-input"
                value={formData.adminPasswordConfirm}
                onChange={handleChange}
                placeholder="Re-enter your password"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Creating Organization...' : 'Create Organization'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', paddingTop: '1.5rem', borderTop: '1px solid #dee2e6' }}>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
            Already have an organization?{' '}
            <Link to="/login" style={{ color: '#8b7fb8', fontWeight: '600', textDecoration: 'none' }}>
              Login here
            </Link>
          </p>
          <p style={{ fontSize: '0.85rem', color: '#999' }}>
            <Link to="/" style={{ color: '#8b7fb8', textDecoration: 'none' }}>
              ← Back to Home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSignUp;
