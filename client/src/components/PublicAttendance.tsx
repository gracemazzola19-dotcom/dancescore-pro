import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

interface AttendanceEvent {
  id: string;
  name: string;
  date: Date;
  type: 'combo' | 'practice' | 'bonding' | 'fundraiser' | 'homecoming';
  pointsValue: number;
  description: string;
}

const PublicAttendance: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState<AttendanceEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    status: 'present' as 'present' | 'absent' | 'excused'
  });

  // Check authentication on mount
  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'dancer') {
        // Redirect to dancer login with return URL
        const currentPath = `/attendance/${eventId}`;
        navigate(`/dancer-login?redirect=${encodeURIComponent(currentPath)}`);
        return;
      }
      // User is logged in as dancer, fetch event
      if (eventId) {
        fetchEvent();
      }
    }
  }, [authLoading, user, eventId, navigate]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/attendance/events/${eventId}`);
      setEvent(response.data);
    } catch (error) {
      console.error('Error fetching event:', error);
      setError('Event not found');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || !user || user.role !== 'dancer') {
      setError('Please log in as a dancer to submit attendance');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Submit attendance record (user info comes from token)
      await api.post('/api/attendance/records', {
        eventId,
        status: formData.status
      });

      setSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting attendance:', error);
      const errorMsg = error.response?.data?.error || 'Failed to submit attendance. Please try again.';
      setError(errorMsg);
      // If unauthorized, redirect to login
      if (error.response?.status === 401 || error.response?.status === 403) {
        const currentPath = `/attendance/${eventId}`;
        navigate(`/dancer-login?redirect=${encodeURIComponent(currentPath)}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return '#28a745';
      case 'absent': return '#dc3545';
      case 'excused': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present': return 'Present';
      case 'absent': return 'Absent';
      case 'excused': return 'Excused';
      default: return status;
    }
  };

  // Show loading while checking authentication
  if (authLoading || loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <h2>Loading Event...</h2>
        </div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ color: '#dc3545', marginBottom: '1rem' }}>Error</h1>
          <p style={{ fontSize: '1.1rem', color: '#666' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ 
          textAlign: 'center', 
          padding: '2rem',
          backgroundColor: 'white',
          borderRadius: '1rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          maxWidth: '400px',
          width: '90%'
        }}>
          <h1 style={{ color: '#28a745', marginBottom: '1rem' }}>Attendance Recorded!</h1>
          <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '1rem' }}>
            Thank you, <strong>{user?.name}</strong>!
          </p>
          <p style={{ fontSize: '1rem', color: '#666' }}>
            Your attendance for <strong>{event?.name}</strong> has been recorded.
          </p>
          <div style={{ 
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#e9ecef',
            borderRadius: '0.5rem'
          }}>
            <p style={{ margin: '0', fontSize: '0.9rem', color: '#666' }}>
              Status: <span style={{ 
                color: getStatusColor(formData.status),
                fontWeight: 'bold'
              }}>
                {getStatusLabel(formData.status)}
              </span>
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>
              Points: <span style={{ 
                color: formData.status === 'present' ? '#28a745' : 
                       formData.status === 'absent' ? '#dc3545' : '#ffc107',
                fontWeight: 'bold'
              }}>
                {formData.status === 'present' ? `+${event?.pointsValue || 1}` : 
                 formData.status === 'absent' ? `-${event?.pointsValue || 1}` : '0'}
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8f9fa',
      padding: '1rem'
    }}>
      <div style={{ 
        maxWidth: '500px', 
        margin: '0 auto',
        paddingTop: '2rem'
      }}>
        {/* Event Info */}
        <div style={{ 
          backgroundColor: 'white',
          borderRadius: '1rem',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h1 style={{ color: '#333', marginBottom: '0.5rem' }}>{event?.name}</h1>
          <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            {event?.date ? new Date(event.date).toLocaleDateString() : ''}
          </p>
          <p style={{ color: '#666', fontSize: '1rem' }}>
            {event?.description}
          </p>
          <div style={{ 
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: '#e9ecef',
            borderRadius: '0.5rem',
            display: 'inline-block'
          }}>
            <span style={{ fontWeight: 'bold', color: '#333' }}>
              Points: {event?.pointsValue || 1}
            </span>
          </div>
        </div>

        {/* Attendance Form */}
        <div style={{ 
          backgroundColor: 'white',
          borderRadius: '1rem',
          padding: '2rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ color: '#333', marginBottom: '1.5rem', textAlign: 'center' }}>
            Mark Your Attendance
          </h2>

          {error && (
            <div style={{ 
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              border: '1px solid #f5c6cb'
            }}>
              {error}
            </div>
          )}

          {user && (
            <div style={{ 
              marginBottom: '1.5rem',
              padding: '1rem',
              backgroundColor: '#e9ecef',
              borderRadius: '0.5rem'
            }}>
              <p style={{ margin: '0', fontSize: '0.9rem', color: '#666' }}>
                Logged in as: <strong>{user.name}</strong> ({user.level})
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: 'bold',
                color: '#333'
              }}>
                Attendance Status *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                {(['present', 'absent', 'excused'] as const).map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFormData({ ...formData, status })}
                    style={{
                      padding: '0.75rem',
                      border: `2px solid ${formData.status === status ? getStatusColor(status) : '#dee2e6'}`,
                      borderRadius: '0.5rem',
                      backgroundColor: formData.status === status ? getStatusColor(status) : 'white',
                      color: formData.status === status ? 'white' : '#333',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      transition: 'all 0.2s'
                    }}
                  >
                    {getStatusLabel(status)}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: submitting ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Attendance'}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PublicAttendance;
