import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

interface AttendanceEvent {
  id: string;
  name: string;
  date: any;
  type: string;
  pointsValue: number;
  description?: string;
}

const AbsenceRequest: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<AttendanceEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUrl, setProofUrl] = useState<string>('');
  
  // Make-up submission state
  const [showMakeUpPopup, setShowMakeUpPopup] = useState(false);
  const [makeUpFile, setMakeUpFile] = useState<File | null>(null);
  const [makeUpUrl, setMakeUpUrl] = useState<string>('');
  const [sentToCoordinator, setSentToCoordinator] = useState<boolean>(false);
  const [requestId, setRequestId] = useState<string>('');
  const [submittingMakeUp, setSubmittingMakeUp] = useState(false);

  // Get query parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  const urlName = urlParams.get('name') || '';
  const urlLevel = urlParams.get('level') || '';

  const [formData, setFormData] = useState({
    name: urlName,
    level: urlLevel,
    requestType: 'missing' as 'missing' | 'excused',
    reason: ''
  });

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
  }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMakeUpFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMakeUpFile(file);
      // Create a preview URL (for display only, not for upload)
      const reader = new FileReader();
      reader.onloadend = () => {
        setMakeUpUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitMakeUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sentToCoordinator) {
      setError('Please confirm you have sent the make-up to your coordinator');
      return;
    }

    if (!makeUpFile) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setSubmittingMakeUp(true);
      setError(null);

      console.log('Submitting make-up with FormData:', {
        absenceRequestId: requestId,
        eventId,
        dancerName: formData.name.trim(),
        dancerLevel: formData.level.trim()
      });

      // Create FormData for multipart/form-data upload
      const formDataObj = new FormData();
      formDataObj.append('makeUpFile', makeUpFile);
      formDataObj.append('absenceRequestId', requestId || 'pending');
      formDataObj.append('eventId', eventId || '');
      formDataObj.append('dancerName', formData.name.trim());
      formDataObj.append('dancerLevel', formData.level.trim());
      formDataObj.append('sentToCoordinator', sentToCoordinator.toString());

      // Submit make-up using FormData (multipart/form-data)
      await api.post('/api/make-up-submissions', formDataObj, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Make-up submitted successfully');
      setShowMakeUpPopup(false);
      setSubmitted(true);
      toast.success('Make-up work submitted successfully!');
    } catch (error: any) {
      console.error('Error submitting make-up:', error);
      setError('Failed to submit make-up. Please try again.');
      toast.error('Failed to submit make-up: ' + (error.response?.data?.error || error.message));
    } finally {
      setSubmittingMakeUp(false);
    }
  };

  const handleSkipMakeUp = () => {
    setShowMakeUpPopup(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || !formData.name.trim() || !formData.level.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.requestType === 'excused' && !proofFile) {
      setError('Please upload proof for excused absence');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Convert file to base64 if excused
      let proofDataUrl = '';
      if (proofFile) {
        proofDataUrl = proofUrl;
      }

      // Submit absence request
      const response = await api.post('/api/absence-requests', {
        eventId,
        dancerName: formData.name.trim(),
        dancerLevel: formData.level.trim(),
        requestType: formData.requestType,
        reason: formData.reason.trim(),
        proofUrl: proofDataUrl
      });

      console.log('Absence request submitted:', response.data);
      
      // Always show the make-up popup after successful submission
      // The requestId will be stored if available, otherwise we'll handle it in the popup
      if (response.data && response.data.id) {
        setRequestId(response.data.id);
      } else if (typeof response.data === 'string') {
        setRequestId(response.data);
      }
      
      // Show the make-up popup
      setShowMakeUpPopup(true);
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting absence request:', error);
      setError('Failed to submit absence request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: any): string => {
    try {
      let parsedDate;
      if (date && typeof date === 'object' && '_seconds' in date) {
        parsedDate = new Date(date._seconds * 1000);
      } else {
        parsedDate = new Date(date);
      }
      return parsedDate.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center' }}>
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
          <h1 style={{ color: '#dc3545' }}>Error</h1>
          <p>{error}</p>
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
          maxWidth: '500px',
          width: '90%'
        }}>
          <h1 style={{ color: '#28a745', marginBottom: '1rem' }}>Request Submitted!</h1>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            Your absence request has been submitted and is <strong>pending</strong> review.
          </p>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            The administrator will review your request and update your points accordingly.
          </p>
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
        maxWidth: '600px', 
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
          <p style={{ color: '#666', fontSize: '1.1rem' }}>
            {event?.date ? formatDate(event.date) : ''}
          </p>
          {event?.description && (
            <p style={{ color: '#666', fontSize: '1rem', marginTop: '0.5rem' }}>
              {event.description}
            </p>
          )}
        </div>

        {/* Absence Request Form */}
        <div style={{ 
          backgroundColor: 'white',
          borderRadius: '1rem',
          padding: '2rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ color: '#333', marginBottom: '1.5rem', textAlign: 'center' }}>
            Submit Absence Request
          </h2>

          {error && (
            <div style={{ 
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Full Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your full name"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #dee2e6',
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
                }}
                required
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Level *
              </label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #dee2e6',
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
                }}
                required
              >
                <option value="">Select your level</option>
                <option value="Level 1">Level 1</option>
                <option value="Level 2">Level 2</option>
                <option value="Level 3">Level 3</option>
                <option value="Level 4">Level 4</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Request Type *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, requestType: 'missing' })}
                  style={{
                    padding: '0.75rem',
                    border: `2px solid ${formData.requestType === 'missing' ? '#dc3545' : '#dee2e6'}`,
                    borderRadius: '0.5rem',
                    backgroundColor: formData.requestType === 'missing' ? '#dc3545' : 'white',
                    color: formData.requestType === 'missing' ? 'white' : '#333',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Missing Practice
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, requestType: 'excused' })}
                  style={{
                    padding: '0.75rem',
                    border: `2px solid ${formData.requestType === 'excused' ? '#ffc107' : '#dee2e6'}`,
                    borderRadius: '0.5rem',
                    backgroundColor: formData.requestType === 'excused' ? '#ffc107' : 'white',
                    color: formData.requestType === 'excused' ? 'white' : '#333',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Excused Absence
                </button>
              </div>
            </div>

            {formData.requestType === 'excused' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Proof Document * (Upload doctor's note, etc.)
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #dee2e6',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                  required
                />
                {proofFile && (
                  <p style={{ marginTop: '0.5rem', color: '#28a745', fontSize: '0.9rem' }}>
                    File selected: {proofFile.name}
                  </p>
                )}
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Reason for Absence *
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Explain why you missed this practice"
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #dee2e6',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  resize: 'vertical'
                }}
                required
              />
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
                cursor: submitting ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>

        {/* Make-Up Submission Popup */}
        {showMakeUpPopup && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}>
              <h2 style={{ color: '#333', marginBottom: '1rem', textAlign: 'center' }}>
                Submit Make-Up Work
              </h2>

              {error && (
                <div style={{ 
                  backgroundColor: '#f8d7da',
                  color: '#721c24',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  {error}
                </div>
              )}

              <p style={{ color: '#666', marginBottom: '1.5rem', textAlign: 'center' }}>
                Submit proof of your make-up work to earn points back for the missed practice.
              </p>

              <form onSubmit={handleSubmitMakeUp}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Make-Up Proof (Photo/Video/Document)
                  </label>
                  <input
                    type="file"
                    accept="image/*,video/*,.pdf,.doc,.docx"
                    onChange={handleMakeUpFileChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #dee2e6',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      cursor: 'pointer'
                    }}
                  />
                  {makeUpFile && (
                    <p style={{ color: '#28a745', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                      File selected: {makeUpFile.name}
                    </p>
                  )}
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    padding: '0.75rem',
                    border: '2px solid #dee2e6',
                    borderRadius: '0.5rem',
                    backgroundColor: sentToCoordinator ? '#e8f5e9' : 'white'
                  }}>
                    <input
                      type="checkbox"
                      checked={sentToCoordinator}
                      onChange={(e) => setSentToCoordinator(e.target.checked)}
                      style={{ marginRight: '0.75rem', transform: 'scale(1.3)' }}
                    />
                    <span style={{ fontWeight: sentToCoordinator ? 'bold' : 'normal' }}>
                      I have sent this make-up work to my coordinator
                    </span>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    type="submit"
                    disabled={submittingMakeUp}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      backgroundColor: submittingMakeUp ? '#6c757d' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      cursor: submittingMakeUp ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {submittingMakeUp ? 'Submitting...' : 'Submit Make-Up'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSkipMakeUp}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Skip for Now
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AbsenceRequest;



