import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

interface AttendanceEvent {
  id: string;
  name: string;
  date: Date;
  type: 'combo' | 'practice' | 'bonding' | 'fundraiser' | 'homecoming';
  pointsValue: number;
  description: string;
}

interface AttendanceRecord {
  id: string;
  eventId: string;
  status: 'present' | 'absent' | 'excused';
  points: number;
  recordedAt: Date;
  fromAbsenceRequest?: boolean;
  reviewedStatus?: string;
}

interface AbsenceRequest {
  id: string;
  eventId: string;
  status: 'pending' | 'approved' | 'denied';
  submittedAt: Date;
  requestType?: 'missing' | 'excused';
  reason?: string;
}

interface Dancer {
  id: string;
  name: string;
  level: string;
  email: string;
  phone: string;
  shirtSize: string;
}

const DancerAttendance: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dancer, setDancer] = useState<Dancer | null>(null);
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [requests, setRequests] = useState<AbsenceRequest[]>([]);
  
  // Make-up submission state
  const [showMakeUpModal, setShowMakeUpModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedEventName, setSelectedEventName] = useState<string>('');
  const [makeUpFile, setMakeUpFile] = useState<File | null>(null);
  const [makeUpUrl, setMakeUpUrl] = useState<string>('');
  const [submittingMakeUp, setSubmittingMakeUp] = useState(false);
  const [sentToCoordinator, setSentToCoordinator] = useState(false);

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const fetchAttendanceData = async () => {
    try {
      const response = await api.get('/api/dancer/attendance');
      setDancer(response.data.dancer);
      setEvents(response.data.events);
      setRecords(response.data.records);
      setRequests(response.data.requests || []);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const parseEventDate = (date: any): Date => {
    if (date && typeof date === 'object' && '_seconds' in date) {
      return new Date(date._seconds * 1000 + (date._nanoseconds || 0) / 1000000);
    } else if (typeof date === 'string') {
      return new Date(date);
    } else if (date instanceof Date) {
      return date;
    } else {
      return new Date();
    }
  };

  const formatDate = (date: any): string => {
    try {
      const parsedDate = parseEventDate(date);
      return parsedDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getEventTypeColor = (type: string) => {
    const colors = {
      combo: '#dc3545',
      practice: '#fd7e14',
      bonding: '#6f42c1',
      fundraiser: '#ffc107',
      homecoming: '#198754'
    };
    return colors[type as keyof typeof colors] || '#6c757d';
  };

  const getLevelColor = (level: string) => {
    if (level.includes('1')) return '#e3f2fd';
    if (level.includes('2')) return '#f3e5f5';
    if (level.includes('3')) return '#fff3e0';
    return '#f1f8e9';
  };

  const getStatusColor = (status: string, isAbsenceRequest: boolean = false, reviewedStatus: string = '') => {
    if (status === 'present' || status === 'present-approved') {
      return '#28a745'; // Green
    }
    
    if (isAbsenceRequest) {
      if (reviewedStatus === 'approved-missing' || reviewedStatus === 'approved-excused') {
        return '#17a2b8'; // Teal/blue
      }
      if (reviewedStatus === 'partial-excused') {
        return '#ffc107'; // Yellow
      }
      if (reviewedStatus === 'denied-excused') {
        return '#dc3545'; // Red
      }
    }
    
    return '#dc3545'; // Default to red for absent
  };

  const getStatusLabel = (status: string, isAbsenceRequest: boolean, reviewedStatus: string) => {
    if (isAbsenceRequest) {
      if (reviewedStatus === 'approved-missing') {
        return 'Excused (-1 pt)';
      }
      if (reviewedStatus === 'approved-excused') {
        return 'Excused (0 pts, +2 max)';
      }
      if (reviewedStatus === 'partial-excused') {
        return 'Partial (0 pts, +1 max)';
      }
      if (reviewedStatus === 'denied-excused') {
        return 'Denied (-1 pt, +1 max)';
      }
    }
    return '';
  };

  const getRecordForEvent = (eventId: string) => {
    return records.find(r => r.eventId === eventId);
  };

  const getRequestForEvent = (eventId: string) => {
    return requests.find(r => r.eventId === eventId);
  };

  const getPointsForEvent = (eventId: string) => {
    const record = getRecordForEvent(eventId);
    return record?.points || 0;
  };

  const getTotalPoints = () => {
    return records.reduce((sum, record) => sum + (record.points || 0), 0);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/dancer-login');
  };

  const handleOpenMakeUpModal = (eventId: string, eventName: string) => {
    setSelectedEventId(eventId);
    setSelectedEventName(eventName);
    setShowMakeUpModal(true);
  };

  const handleMakeUpFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMakeUpFile(file);
      // Create a preview URL
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
      toast.error('Please confirm you have sent the make-up to your coordinator');
      return;
    }

    try {
      setSubmittingMakeUp(true);
      const request = getRequestForEvent(selectedEventId);
      if (!request) {
        toast.error('No absence request found for this event');
        return;
      }

      await api.post('/api/make-up-submissions', {
        absenceRequestId: request.id,
        eventId: selectedEventId,
        dancerName: dancer?.name,
        dancerLevel: dancer?.level,
        makeUpUrl: makeUpUrl,
        sentToCoordinator: sentToCoordinator
      });

      toast.success('Make-up work submitted successfully!');
      setShowMakeUpModal(false);
      setMakeUpFile(null);
      setMakeUpUrl('');
      setSentToCoordinator(false);
      fetchAttendanceData();
    } catch (error) {
      console.error('Error submitting make-up:', error);
      toast.error('Failed to submit make-up work');
    } finally {
      setSubmittingMakeUp(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Loading your attendance...</h2>
        </div>
      </div>
    );
  }

  // Sort events by date (newest first)
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = parseEventDate(a.date).getTime();
    const dateB = parseEventDate(b.date).getTime();
    return dateB - dateA;
  });

  return (
    <div className="admin-container">
      <div className="admin-content">
        {/* Header */}
        <div className="admin-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: '#333' }}>
                My Point Sheet
              </h1>
              <p style={{ margin: '0.5rem 0 0 0', color: '#666', fontSize: '1.1rem' }}>
                {dancer?.name} • {dancer?.level}
              </p>
            </div>
            <button 
              onClick={handleLogout}
              className="add-dancer-button" 
              style={{ backgroundColor: '#dc3545', padding: '0.75rem 1.5rem' }}
            >
              Logout
            </button>
          </div>

          {/* Total Points Display */}
          <div style={{ 
            backgroundColor: '#e3f2fd', 
            border: '3px solid #2196f3', 
            borderRadius: '1rem', 
            padding: '1.5rem', 
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)'
          }}>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#1976d2', fontWeight: '600', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>
                YOUR TOTAL POINTS
              </div>
              <div style={{ fontSize: '3rem', fontWeight: '700', color: '#2196f3' }}>
                +{getTotalPoints()}
              </div>
            </div>
            <div style={{ fontSize: '1.2rem', color: '#1976d2' }}>
              Keep up the great work!
            </div>
          </div>
        </div>

        {/* Attendance Sheet - Matching Admin Design */}
        <div className="admin-section">
          <h2 style={{ marginBottom: '1.5rem', color: '#333', fontSize: '1.5rem' }}>
            My Attendance Sheet
          </h2>
          
          {sortedEvents.length === 0 ? (
            <div style={{ 
              backgroundColor: '#f8f9fa', 
              border: '1px solid #dee2e6', 
              borderRadius: '0.5rem', 
              padding: '2rem',
              textAlign: 'center',
              color: '#6c757d'
            }}>
              No attendance events yet. Check back soon!
            </div>
          ) : (
            <div style={{ 
              backgroundColor: getLevelColor(dancer?.level || ''), 
              borderRadius: '0.5rem', 
              overflow: 'hidden',
              border: '2px solid #dee2e6'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #dee2e6', minWidth: '120px' }}>
                        Date
                      </th>
                      {sortedEvents.map(event => (
                        <th key={event.id} style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #dee2e6', minWidth: '120px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                            <span style={{ fontWeight: '600' }}>{event.name}</span>
                            <small style={{ fontSize: '0.8rem', color: '#666' }}>
                              {formatDate(event.date)}
                            </small>
                          </div>
                        </th>
                      ))}
                      <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #dee2e6', backgroundColor: '#e9ecef', fontWeight: 'bold', minWidth: '120px' }}>
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ backgroundColor: getLevelColor(dancer?.level || '') }}>
                      <td style={{ padding: '1rem', borderBottom: '1px solid #dee2e6', fontWeight: 'bold', fontSize: '1.1rem' }}>
                        Points
                      </td>
                      {sortedEvents.map(event => {
                        const record = getRecordForEvent(event.id);
                        const points = getPointsForEvent(event.id);
                        const isAbsenceRequest = record?.fromAbsenceRequest || false;
                        const reviewedStatus = record?.reviewedStatus || '';
                        
                        // Determine badge color and display
                        let backgroundColor = '#6c757d';
                        let displayText = '';
                        
                        if (points > 0) {
                          backgroundColor = '#28a745';
                          displayText = '+' + points;
                        } else if (points === 0 && isAbsenceRequest) {
                          backgroundColor = getStatusColor('excused', isAbsenceRequest, reviewedStatus);
                          displayText = '0';
                        } else if (points < 0) {
                          backgroundColor = getStatusColor('absent', isAbsenceRequest, reviewedStatus);
                          displayText = points.toString();
                        }

                        const statusLabel = isAbsenceRequest ? getStatusLabel('', isAbsenceRequest, reviewedStatus) : null;
                        
                        return (
                          <td key={event.id} style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                              <span style={{
                                backgroundColor,
                                color: 'white',
                                padding: '0.5rem 1rem',
                                borderRadius: '0.5rem',
                                fontWeight: '600',
                                fontSize: '1.1rem',
                                minWidth: '60px',
                                display: 'inline-block'
                              }}>
                                {displayText}
                              </span>
                              {statusLabel && (
                                <span style={{
                                  fontSize: '0.7rem',
                                  color: '#666',
                                  fontStyle: 'italic',
                                  textAlign: 'center',
                                  maxWidth: '100px',
                                  lineHeight: '1.2'
                                }}>
                                  {statusLabel}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td style={{ 
                        padding: '1rem', 
                        textAlign: 'center', 
                        borderBottom: '1px solid #dee2e6',
                        backgroundColor: '#e9ecef',
                        fontWeight: 'bold',
                        fontSize: '1.2rem',
                        color: '#2196f3'
                      }}>
                        +{getTotalPoints()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Request Status Section */}
        {sortedEvents.some(e => e.type === 'practice') && (
          <div className="admin-section">
            <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>Absence Request Status</h2>
            
            {sortedEvents
              .filter(event => event.type === 'practice')
              .map(event => {
                const record = getRecordForEvent(event.id);
                const request = getRequestForEvent(event.id);
                const isAbsent = !record || record.points < 0;
                
                if (!isAbsent && !request) return null;

                return (
                  <div key={event.id} style={{
                    backgroundColor: 'white',
                    border: '1px solid #dee2e6',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{event.name}</div>
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>{formatDate(event.date)}</div>
                      {request && request.reason && (
                        <div style={{ fontSize: '0.85rem', color: '#666', fontStyle: 'italic', marginTop: '0.25rem' }}>
                          Reason: {request.reason}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                      {request ? (
                        <>
                          <span style={{
                            backgroundColor: 
                              request.status === 'approved' ? '#28a745' :
                              request.status === 'denied' ? '#dc3545' : '#ffc107',
                            color: request.status === 'pending' ? '#333' : 'white',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.9rem',
                            fontWeight: '600'
                          }}>
                            {request.status === 'pending' ? 'Pending Review' :
                             request.status === 'approved' ? 'Approved' :
                             'Denied'}
                          </span>
                          {/* Show make-up button for any missing practice that has been requested (approved, denied, or pending) */}
                          {isAbsent && (
                            <button
                              onClick={() => handleOpenMakeUpModal(event.id, event.name)}
                              style={{
                                backgroundColor: '#28a745',
                                color: 'white',
                                padding: '0.5rem 1rem',
                                borderRadius: '0.25rem',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                border: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              Submit Make-Up
                            </button>
                          )}
                        </>
                      ) : isAbsent ? (
                        <a
                          href={`/absence/${event.id}?name=${encodeURIComponent(dancer?.name || '')}&level=${encodeURIComponent(dancer?.level || '')}`}
                          style={{
                            backgroundColor: '#007bff',
                            color: 'white',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.9rem',
                            textDecoration: 'none',
                            fontWeight: '600',
                            display: 'inline-block'
                          }}
                        >
                          Request Excuse
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            
            {!sortedEvents.some(e => {
              const record = getRecordForEvent(e.id);
              return e.type === 'practice' && (!record || (record.points || 0) < 0);
            }) && 
             !requests.length && (
              <div style={{ 
                backgroundColor: '#d4edda', 
                border: '1px solid #c3e6cb', 
                borderRadius: '0.5rem', 
                padding: '1rem',
                color: '#155724',
                textAlign: 'center'
              }}>
                You have no pending absence requests!
              </div>
            )}
          </div>
        )}

        {/* Info Section */}
        <div className="admin-section">
          <div style={{ 
            backgroundColor: '#e8f5e9', 
            border: '2px solid #28a745', 
            borderRadius: '0.5rem', 
            padding: '1.5rem',
            marginTop: '2rem'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#155724' }}>How Points Work</h3>
            <div style={{ display: 'grid', gap: '1rem', color: '#155724' }}>
              <div>
                <strong>Present (Green):</strong> You attended and earned +1 point
              </div>
              <div>
                <strong>Excused (Blue):</strong> Your absence was approved with proof
              </div>
              <div>
                <strong>Absent (Red):</strong> No show or excuse denied
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                <em>All attendance affects your eligibility and standing in the club.</em>
              </div>
            </div>
          </div>
        </div>

        {/* Make-Up Submission Modal */}
        {showMakeUpModal && (
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

              <p style={{ color: '#666', marginBottom: '1.5rem', textAlign: 'center' }}>
                Submit proof of your make-up work to earn points back for: <strong>{selectedEventName}</strong>
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
                    onClick={() => {
                      setShowMakeUpModal(false);
                      setMakeUpFile(null);
                      setMakeUpUrl('');
                      setSentToCoordinator(false);
                    }}
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
                    Cancel
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

export default DancerAttendance;
