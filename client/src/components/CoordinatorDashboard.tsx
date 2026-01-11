import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import QRCode from 'qrcode';

interface AttendanceEvent {
  id: string;
  name: string;
  date: any;
  type: string;
  pointsValue: number;
}

interface ClubMember {
  id: string;
  name: string;
  level: string;
  email: string;
  totalPoints?: number;
}

interface AttendanceRecord {
  id: string;
  dancerId?: string;
  dancerName?: string;
  dancerLevel?: string;
  eventId: string;
  status: string;
  points: number;
  fromAbsenceRequest?: boolean;
  reviewedStatus?: string;
}

interface AbsenceRequest {
  id: string;
  dancerName: string;
  dancerLevel: string;
  eventId: string;
  requestType: string;
  reason: string;
  status: string;
  submittedAt: any;
  eventName?: string;
}

interface MakeUpSubmission {
  id: string;
  dancerName: string;
  dancerLevel: string;
  eventId: string;
  eventName: string;
  status: string;
  submittedAt: any;
  makeUpUrl?: string;
  absenceRequest?: any;
}

const CoordinatorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clubMembers, setClubMembers] = useState<ClubMember[]>([]);
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [absenceRequests, setAbsenceRequests] = useState<AbsenceRequest[]>([]);
  const [makeUpSubmissions, setMakeUpSubmissions] = useState<MakeUpSubmission[]>([]);
  const [activeTab, setActiveTab] = useState<'attendance' | 'absences' | 'makeups'>('attendance');
  const [qrCodes, setQrCodes] = useState<{ [eventId: string]: string }>({});
  const [expandedQR, setExpandedQR] = useState<{ [eventId: string]: boolean }>({});

  // Get coordinator's level from user info
  // Assume coordinators are named like "Level 1 Coordinator" or similar
  const coordinatorLevel = (user as any)?.name?.match(/Level \d+/)?.[0] || 'Level 1'; // Extract level from name
  
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (events.length > 0) {
      generateAllQRCodes();
    }
  }, [events]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 'absences') {
      fetchAbsenceRequests();
    }
    if (activeTab === 'makeups') {
      fetchMakeUpSubmissions();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      // Fetch club members for coordinator's level only
      const membersResponse = await api.get('/api/club-members');
      const allMembers = membersResponse.data;
      const filteredMembers = allMembers.filter((m: ClubMember) => m.level === coordinatorLevel);
      setClubMembers(filteredMembers);

      // Fetch events
      const eventsResponse = await api.get('/api/attendance/events');
      setEvents(eventsResponse.data);

      // Fetch attendance records
      const recordsResponse = await api.get('/api/attendance/records');
      setRecords(recordsResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAbsenceRequests = async () => {
    try {
      const response = await api.get('/api/absence-requests');
      const filtered = response.data.filter((req: AbsenceRequest) => req.dancerLevel === coordinatorLevel);
      setAbsenceRequests(filtered);
    } catch (error) {
      console.error('Error fetching absence requests:', error);
      toast.error('Failed to load absence requests');
    }
  };

  const fetchMakeUpSubmissions = async () => {
    try {
      const response = await api.get('/api/make-up-submissions');
      const filtered = response.data.filter((sub: MakeUpSubmission) => sub.dancerLevel === coordinatorLevel);
      setMakeUpSubmissions(filtered);
    } catch (error) {
      console.error('Error fetching make-up submissions:', error);
      toast.error('Failed to load make-up submissions');
    }
  };

  const parseEventDate = (date: any): Date => {
    if (date && typeof date === 'object' && '_seconds' in date) {
      return new Date(date._seconds * 1000);
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
      return parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getEventTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      combo: '#dc3545',
      practice: '#fd7e14',
      bonding: '#6f42c1',
      fundraiser: '#ffc107',
      homecoming: '#198754'
    };
    return colors[type] || '#6c757d';
  };

  const getDancerRecordForEvent = (dancerId: string, eventId: string) => {
    return records.find(r => r.dancerId === dancerId && r.eventId === eventId);
  };

  const getDancerPointsForEvent = (dancerId: string, eventId: string) => {
    const record = getDancerRecordForEvent(dancerId, eventId);
    return record?.points || 0;
  };

  const generateQRCode = async (eventId: string) => {
    try {
      const qrUrl = `${window.location.origin}/attendance/${eventId}`;
      const qrCodeDataURL = await QRCode.toDataURL(qrUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodes(prev => ({ ...prev, [eventId]: qrCodeDataURL }));
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const generateAllQRCodes = async () => {
    for (const event of events) {
      await generateQRCode(event.id);
    }
  };

  const toggleQR = (eventId: string) => {
    setExpandedQR(prev => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Loading...</h2>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: '#333' }}>
                {coordinatorLevel} Coordinator Dashboard
              </h1>
              <p style={{ margin: '0.5rem 0 0 0', color: '#666', fontSize: '1rem' }}>
                {clubMembers.length} dancers in {coordinatorLevel}
              </p>
            </div>
            <button 
              onClick={logout}
              className="add-dancer-button" 
              style={{ backgroundColor: '#dc3545', padding: '0.75rem 1.5rem' }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          {[
            { key: 'attendance', label: 'Attendance & Points' },
            { key: 'absences', label: 'Absence Requests' },
            { key: 'makeups', label: 'Make-Up Submissions' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="admin-section">
          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <div>
              <h2 style={{ marginBottom: '1.5rem' }}>{coordinatorLevel} Attendance Sheet</h2>
              
              {sortedEvents.length === 0 ? (
                <div style={{ 
                  backgroundColor: '#f8f9fa', 
                  border: '1px solid #dee2e6', 
                  borderRadius: '0.5rem', 
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#6c757d'
                }}>
                  No attendance events yet.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '0.5rem', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa' }}>
                        <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Name</th>
                        {sortedEvents.map(event => (
                          <th key={event.id} style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '1px solid #dee2e6', minWidth: '120px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <span>{event.name}</span>
                              <small style={{ fontSize: '0.8rem', color: '#666' }}>
                                {formatDate(event.date)}
                              </small>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleQR(event.id);
                                }}
                                style={{
                                  backgroundColor: 'transparent',
                                  border: '1px solid #667eea',
                                  color: '#667eea',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '0.25rem',
                                  marginTop: '0.25rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                              >
                                {expandedQR[event.id] ? 'Hide QR' : 'Show QR'}
                              </button>
                              {expandedQR[event.id] && qrCodes[event.id] && (
                                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                                  <img 
                                    src={qrCodes[event.id]} 
                                    alt={`QR Code for ${event.name}`}
                                    style={{ 
                                      maxWidth: '100px', 
                                      height: 'auto',
                                      border: '1px solid #ddd',
                                      borderRadius: '0.25rem'
                                    }}
                                  />
                                  <small style={{ fontSize: '0.65rem', color: '#666' }}>
                                    Scan for attendance
                                  </small>
                                </div>
                              )}
                            </div>
                          </th>
                        ))}
                        <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #dee2e6', backgroundColor: '#e9ecef', fontWeight: 'bold' }}>
                          Total Points
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {clubMembers.map(member => {
                        const totalPoints = records
                          .filter(r => r.dancerId === member.id)
                          .reduce((sum, r) => sum + (r.points || 0), 0);

                        return (
                          <tr key={member.id}>
                            <td style={{ padding: '1rem', borderBottom: '1px solid #dee2e6', fontWeight: '600' }}>
                              {member.name}
                            </td>
                            {sortedEvents.map(event => {
                              const points = getDancerPointsForEvent(member.id, event.id);
                              const record = getDancerRecordForEvent(member.id, event.id);
                              const isAbsenceRequest = record?.fromAbsenceRequest;
                              const reviewedStatus = record?.reviewedStatus;
                              
                              let backgroundColor = '#6c757d';
                              let displayText = '';
                              
                              if (points > 0) {
                                backgroundColor = '#28a745';
                                displayText = '+' + points;
                              } else if (points === 0 && isAbsenceRequest) {
                                backgroundColor = reviewedStatus === 'approved-missing' ? '#17a2b8' : reviewedStatus === 'partial-excused' ? '#ffc107' : reviewedStatus === 'denied-excused' ? '#dc3545' : '#6c757d';
                                displayText = '0';
                              } else if (points < 0) {
                                backgroundColor = isAbsenceRequest ? (reviewedStatus?.includes('approved') ? '#17a2b8' : '#dc3545') : '#dc3545';
                                displayText = points.toString();
                              }

                              return (
                                <td key={event.id} style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                                  <span style={{
                                    backgroundColor,
                                    color: 'white',
                                    padding: '0.5rem',
                                    borderRadius: '0.5rem',
                                    fontWeight: '600',
                                    fontSize: '0.9rem'
                                  }}>
                                    {displayText}
                                  </span>
                                </td>
                              );
                            })}
                            <td style={{ 
                              padding: '1rem', 
                              textAlign: 'center', 
                              borderBottom: '1px solid #dee2e6',
                              backgroundColor: '#e9ecef',
                              fontWeight: 'bold'
                            }}>
                              {totalPoints > 0 ? '+' : ''}{totalPoints}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Absence Requests Tab */}
          {activeTab === 'absences' && (
            <div>
              <h2 style={{ marginBottom: '1.5rem' }}>Absence Requests - {coordinatorLevel}</h2>
              
              {absenceRequests.length === 0 ? (
                <div style={{ 
                  backgroundColor: '#f8f9fa', 
                  border: '1px solid #dee2e6', 
                  borderRadius: '0.5rem', 
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#6c757d'
                }}>
                  No absence requests for {coordinatorLevel}
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {absenceRequests.map(request => (
                    <div key={request.id} style={{
                      backgroundColor: 'white',
                      border: `2px solid ${request.status === 'pending' ? '#ffc107' : request.status === 'approved' ? '#28a745' : '#dc3545'}`,
                      borderRadius: '0.5rem',
                      padding: '1.5rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                          <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
                            {request.dancerName}
                          </h3>
                          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                            Event: {request.eventName || 'Event'}
                          </p>
                          <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>
                            Type: {request.requestType === 'excused' ? 'Excused Absence' : 'Missing Practice'}
                          </p>
                          <p style={{ margin: '0.5rem 0 0 0', color: '#6c757d', fontSize: '0.85rem' }}>
                            Reason: {request.reason}
                          </p>
                        </div>
                        <span style={{
                          backgroundColor: request.status === 'pending' ? '#ffc107' : request.status === 'approved' ? '#28a745' : '#dc3545',
                          color: 'white',
                          padding: '0.5rem 1rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.85rem',
                          fontWeight: '600'
                        }}>
                          {request.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Make-Up Submissions Tab */}
          {activeTab === 'makeups' && (
            <div>
              <h2 style={{ marginBottom: '1.5rem' }}>Make-Up Submissions - {coordinatorLevel}</h2>
              
              {makeUpSubmissions.length === 0 ? (
                <div style={{ 
                  backgroundColor: '#f8f9fa', 
                  border: '1px solid #dee2e6', 
                  borderRadius: '0.5rem', 
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#6c757d'
                }}>
                  No make-up submissions for {coordinatorLevel}
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {makeUpSubmissions.map(submission => (
                    <div key={submission.id} style={{
                      backgroundColor: 'white',
                      border: `2px solid ${submission.status === 'pending' ? '#ffc107' : submission.status === 'approved' ? '#28a745' : '#dc3545'}`,
                      borderRadius: '0.5rem',
                      padding: '1.5rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                          <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
                            {submission.dancerName}
                          </h3>
                          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                            Event: {submission.eventName}
                          </p>
                          <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.85rem' }}>
                            Submitted: {formatDate(submission.submittedAt)}
                          </p>
                        </div>
                        <span style={{
                          backgroundColor: submission.status === 'pending' ? '#ffc107' : submission.status === 'approved' ? '#28a745' : '#dc3545',
                          color: 'white',
                          padding: '0.5rem 1rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.85rem',
                          fontWeight: '600'
                        }}>
                          {submission.status.toUpperCase()}
                        </span>
                      </div>
                      {submission.makeUpUrl && (
                        <div style={{ marginTop: '1rem' }}>
                          <strong>Make-Up Work:</strong>
                          {submission.makeUpUrl.startsWith('data:image') ? (
                            <img src={submission.makeUpUrl} alt="Make-up proof" style={{ maxWidth: '100%', marginTop: '0.5rem', borderRadius: '0.25rem' }} />
                          ) : (
                            <p style={{ margin: '0.5rem 0 0 0', color: '#007bff' }}>View File</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoordinatorDashboard;

