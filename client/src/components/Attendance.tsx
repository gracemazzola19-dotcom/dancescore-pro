import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import QRCode from 'qrcode';

interface ClubMember {
  id: string;
  name: string;
  email: string;
  level: string;
  averageScore: number;
  totalPoints?: number;
  attendanceCount?: number;
  totalEvents?: number;
  attendanceRate?: string;
}

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
  dancerId?: string;
  dancerName?: string;
  dancerLevel?: string;
  eventId: string;
  status: 'present' | 'absent' | 'excused';
  points: number;
  recordedAt: Date;
  recordedBy?: string;
  fromAbsenceRequest?: boolean;
  requestStatus?: string;
  requestReason?: string;
  requestType?: string;
  reviewedStatus?: string;
}

// interface AttendanceSummary {
//   members: (ClubMember & {
//     totalPoints: number;
//     attendanceCount: number;
//     totalEvents: number;
//     attendanceRate: string;
//     records: AttendanceRecord[];
//   })[];
//   events: AttendanceEvent[];
//   month: number;
//   year: number;
// }

const Attendance: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [clubMembers, setClubMembers] = useState<ClubMember[]>([]);
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]); // eslint-disable-line @typescript-eslint/no-unused-vars
  // const [summary, setSummary] = useState<AttendanceSummary | null>(null); // Not used
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showEventForm, setShowEventForm] = useState(false);
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AttendanceEvent | null>(null);
  const [qrCodes, setQrCodes] = useState<{ [eventId: string]: string }>({});
  const [expandedQR, setExpandedQR] = useState<{ [eventId: string]: boolean }>({});
  const [editMode, setEditMode] = useState(false);

  // Event form state
  const [eventForm, setEventForm] = useState({
    name: '',
    date: '',
    time: '',
    type: 'practice' as const,
    pointsValue: 1,
    description: ''
  });

  // Attendance form state
  const [attendanceData, setAttendanceData] = useState<{ [dancerId: string]: 'present' | 'absent' | 'excused' }>({});

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (events.length > 0) {
      generateAllQRCodes();
    }
  }, [events]); // eslint-disable-line react-hooks/exhaustive-deps

  const parseEventDate = (date: any): Date => {
    if (date && typeof date === 'object' && '_seconds' in date) {
      // Firestore Timestamp
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
      return parsedDate.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Sort events by date (earliest to latest)
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = parseEventDate(a.date).getTime();
    const dateB = parseEventDate(b.date).getTime();
    return dateA - dateB;
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch club members
      const membersResponse = await api.get('/api/club-members');
      setClubMembers(membersResponse.data);

      // Fetch events
      const eventsResponse = await api.get('/api/attendance/events');
      console.log('Fetched events:', eventsResponse.data.length);
      setEvents(eventsResponse.data);

      // Summary is not used - we show all records

      // Fetch all records
      const recordsResponse = await api.get('/api/attendance/records');
      console.log('Fetched records:', recordsResponse.data.length);
      setRecords(recordsResponse.data);

    } catch (error) {
      console.error('Error fetching attendance data:', error);
      console.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeColor = (type: string) => {
    const colors = {
      combo: '#dc3545',      // Red
      practice: '#fd7e14',    // Orange
      bonding: '#6f42c1',    // Purple
      fundraiser: '#ffc107', // Yellow
      homecoming: '#198754'  // Green
    };
    return colors[type as keyof typeof colors] || '#6c757d';
  };

  const getEventTypeLabel = (type: string) => {
    const labels = {
      combo: 'Combo',
      practice: 'Practice',
      bonding: 'Bonding',
      fundraiser: 'Fundraiser',
      homecoming: 'Homecoming'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Combine date and time into a single datetime string
      const dateTimeString = eventForm.time 
        ? `${eventForm.date}T${eventForm.time}`
        : eventForm.date;
      
      const eventData = {
        ...eventForm,
        date: dateTimeString
      };
      
      await api.post('/api/attendance/events', eventData);
      console.log('Event created successfully');
      setShowEventForm(false);
      setEventForm({ name: '', date: '', time: '', type: 'practice', pointsValue: 1, description: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating event:', error);
      console.error('Failed to create event');
    }
  };

  const handleDeleteEvent = async (eventId: string, eventName: string) => {
    if (!window.confirm(`Are you sure you want to delete the practice "${eventName}"? This will also delete all attendance records for this event and cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/api/attendance/events/${eventId}`);
      console.log('Event deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
    }
  };

  const handleDeleteDancer = async (dancerId: string, dancerName: string) => {
    if (!window.confirm(`Are you sure you want to remove "${dancerName}" from the club? This will delete all their attendance records and cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/api/club-members/${dancerId}`);
      console.log('Dancer deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting dancer:', error);
      alert('Failed to delete dancer');
    }
  };

  const handleTakeAttendance = (event: AttendanceEvent) => {
    setSelectedEvent(event);
    
    // Initialize attendance data with all members as 'present'
    const initialData: { [dancerId: string]: 'present' | 'absent' | 'excused' } = {};
    clubMembers.forEach(member => {
      initialData[member.id] = 'present';
    });
    setAttendanceData(initialData);
    setShowAttendanceForm(true);
  };

  const handleSubmitAttendance = async () => {
    if (!selectedEvent) return;

    try {
      await api.post('/api/attendance/bulk-update', {
        eventId: selectedEvent.id,
        attendanceData
      });
      
      console.log('Attendance recorded successfully');
      setShowAttendanceForm(false);
      setSelectedEvent(null);
      fetchData();
    } catch (error) {
      console.error('Error submitting attendance:', error);
      console.error('Failed to record attendance');
    }
  };

  const toggleQR = (eventId: string) => {
    setExpandedQR(prev => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  const getLevelColor = (level: string) => {
    const colors = {
      'Level 1': '#ffc0cb', // Light pink
      'Level 2': '#dda0dd', // Light purple
      'Level 3': '#ffffe0', // Light yellow
      'Level 4': '#90ee90'  // Light green
    };
    return colors[level as keyof typeof colors] || '#f8f9fa';
  };

  const getLevelOrder = (level: string) => {
    const order = {
      'Level 1': 1,
      'Level 2': 2,
      'Level 3': 3,
      'Level 4': 4
    };
    return order[level as keyof typeof order] || 5;
  };

  const getDancerPointsForEvent = (dancerId: string, eventId: string) => {
    // First try to find by dancerId (for existing club members)
    let record = records.find(r => r.dancerId === dancerId && r.eventId === eventId);
    
    // If not found, try to find by dancer name and level (for QR code registrations)
    if (!record) {
      const dancer = clubMembers.find(m => m.id === dancerId);
      if (dancer) {
        record = records.find(r => 
          r.dancerName === dancer.name && 
          r.dancerLevel === dancer.level && 
          r.eventId === eventId
        );
      }
    }
    
    if (record) {
      console.log(`Found record for dancer ${dancerId}, event ${eventId}, points: ${record.points}`);
    }
    
    return record ? record.points : 0;
  };

  const getDancerRecordForEvent = (dancerId: string, eventId: string) => {
    // First try to find by dancerId (for existing club members)
    let record = records.find(r => r.dancerId === dancerId && r.eventId === eventId);
    
    // If not found, try to find by dancer name and level (for QR code registrations)
    if (!record) {
      const dancer = clubMembers.find(m => m.id === dancerId);
      if (dancer) {
        record = records.find(r => 
          r.dancerName === dancer.name && 
          r.dancerLevel === dancer.level && 
          r.eventId === eventId
        );
      }
    }
    
    return record;
  };

  const getStatusColor = (status: string, fromAbsenceRequest: boolean, reviewedStatus: string) => {
    if (status === 'present') return '#28a745';
    if (!fromAbsenceRequest) return '#dc3545';
    
    // Different colors for different review statuses
    switch (reviewedStatus) {
      case 'approved-missing': return '#fd7e14'; // Orange - pending make-up
      case 'approved-excused': return '#17a2b8'; // Blue - can earn 2 make-up
      case 'partial-excused': return '#ffc107'; // Yellow - can earn 1 make-up  
      case 'denied-excused': return '#dc3545'; // Red - can earn 1 make-up
      default: return '#6c757d';
    }
  };

  const getStatusLabel = (status: string, fromAbsenceRequest: boolean, reviewedStatus: string) => {
    if (!fromAbsenceRequest) return null;
    
    switch (reviewedStatus) {
      case 'approved-missing': return 'Pending Make-up';
      case 'approved-excused': return 'Can earn 2 make-up';
      case 'partial-excused': return 'Can earn 1 make-up';
      case 'denied-excused': return 'Can earn 1 make-up';
      default: return null;
    }
  };

  const getDancerTotalPoints = (dancerId: string) => {
    const dancer = clubMembers.find(m => m.id === dancerId);
    if (!dancer) return 0;
    
    // Calculate points from all records for this dancer (all events, all time)
    const dancerRecords = records.filter(r => 
      (r.dancerId === dancerId) || 
      (r.dancerName === dancer.name && r.dancerLevel === dancer.level)
    );
    
    return dancerRecords.reduce((sum, record) => sum + record.points, 0);
  };

  const getPracticePointsAvailable = () => {
    // Sum of all practice event points values (all time)
    return events
      .filter(event => event.type === 'practice')
      .reduce((sum, event) => sum + (event.pointsValue || 0), 0);
  };

  const getDancerPracticePointsEarned = (dancerId: string) => {
    const dancer = clubMembers.find(m => m.id === dancerId);
    if (!dancer) return 0;
    
    // Get all practice events
    const practiceEventIds = events
      .filter(event => event.type === 'practice')
      .map(event => event.id);
    
    // Calculate points from practice records for this dancer
    const dancerRecords = records.filter(r => {
      const matchesDancer = (r.dancerId === dancerId) || 
        (r.dancerName === dancer.name && r.dancerLevel === dancer.level);
      const isPracticeEvent = practiceEventIds.includes(r.eventId);
      return matchesDancer && isPracticeEvent;
    });
    
    return dancerRecords.reduce((sum, record) => sum + Math.max(0, record.points), 0);
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

  const groupMembersByLevel = (members: ClubMember[]) => {
    const grouped: { [level: string]: ClubMember[] } = {};
    members.forEach(member => {
      if (!grouped[member.level]) {
        grouped[member.level] = [];
      }
      grouped[member.level].push(member);
    });
    
    // Sort levels in order 1-4
    const sortedLevels = Object.keys(grouped).sort((a, b) => getLevelOrder(a) - getLevelOrder(b));
    const sortedGrouped: { [level: string]: ClubMember[] } = {};
    sortedLevels.forEach(level => {
      sortedGrouped[level] = grouped[level];
    });
    
    return sortedGrouped;
  };

  if (loading) {
    return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Loading Attendance Data...</h2>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-section">
        <h2>Attendance Tracking</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
          <button
            onClick={() => setShowEventForm(true)}
            className="add-dancer-button"
            style={{ backgroundColor: '#28a745' }}
          >
            Create Event
          </button>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #ced4da' }}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #ced4da' }}
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Events Section */}
      <div className="admin-section">
        <h2>Events</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {sortedEvents.map(event => (
            <div
              key={event.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                padding: '1rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                borderLeft: `4px solid ${getEventTypeColor(event.type)}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, color: '#333' }}>{event.name}</h3>
                <span
                  style={{
                    backgroundColor: getEventTypeColor(event.type),
                    color: 'white',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.8rem',
                    fontWeight: '600'
                  }}
                >
                  {getEventTypeLabel(event.type)}
                </span>
              </div>
              <p style={{ margin: '0.5rem 0', color: '#666', fontSize: '0.9rem' }}>
                {formatDate(event.date)} • {event.pointsValue} point{event.pointsValue !== 1 ? 's' : ''}
              </p>
              {event.description && (
                <p style={{ margin: '0.5rem 0', color: '#666', fontSize: '0.8rem' }}>
                  {event.description}
                </p>
              )}
              
              {/* QR Code Section - Collapsible */}
              <div style={{ margin: '1rem 0', textAlign: 'center' }}>
                <button
                  onClick={() => toggleQR(event.id)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#007bff',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    padding: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    margin: '0 auto'
                  }}
                >
                  QR Code for Dancers
                  <span style={{ fontSize: '0.8rem' }}>
                    {expandedQR[event.id] ? '▼' : '▶'}
                  </span>
                </button>
                
                {expandedQR[event.id] && (
                  <div style={{ marginTop: '0.5rem' }}>
                    {qrCodes[event.id] ? (
                      <div>
                        <img 
                          src={qrCodes[event.id]} 
                          alt={`QR Code for ${event.name}`}
                          style={{ 
                            maxWidth: '150px', 
                            height: 'auto',
                            border: '1px solid #ddd',
                            borderRadius: '0.5rem',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }}
                        />
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#666' }}>
                          Scan to mark attendance
                        </p>
                      </div>
                    ) : (
                      <div style={{ 
                        width: '150px', 
                        height: '150px', 
                        backgroundColor: '#f8f9fa', 
                        border: '1px solid #ddd',
                        borderRadius: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto'
                      }}>
                        <span style={{ fontSize: '0.8rem', color: '#666' }}>Generating...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <button
                onClick={() => handleTakeAttendance(event)}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  marginTop: '0.5rem'
                }}
              >
                Take Attendance
              </button>
              
              {editMode && (
              <button
                onClick={() => handleDeleteEvent(event.id, event.name)}
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  marginTop: '0.5rem',
                  width: '100%'
                }}
              >
                Delete Practice
              </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Attendance Summary */}
      {clubMembers.length > 0 && (
        <div className="admin-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>Attendance - {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
            <button
              onClick={() => setEditMode(!editMode)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.25rem',
                border: 'none',
                backgroundColor: editMode ? '#dc3545' : '#6c757d',
                color: 'white',
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {editMode ? '✓ Edit Mode ON' : 'Edit Mode'}
            </button>
          </div>
          
          {Object.entries(groupMembersByLevel(clubMembers)).map(([level, members]) => (
            <div key={level} style={{ marginBottom: '2rem' }}>
              <h3 style={{ 
                backgroundColor: getLevelColor(level), 
                padding: '0.5rem 1rem', 
                margin: '0 0 1rem 0',
                borderRadius: '0.25rem',
                color: '#333'
              }}>
                {level} ({members.length} dancers)
              </h3>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '0.5rem', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Name</th>
                      {sortedEvents.map(event => (
                        <th key={event.id} style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '1px solid #dee2e6', minWidth: '120px', position: 'relative' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span>{event.name}</span>
                            <small style={{ fontSize: '0.8rem', color: '#666' }}>
                              {formatDate(event.date)}
                            </small>
                            {editMode && (
                            <button
                              onClick={() => handleDeleteEvent(event.id, event.name)}
                              style={{
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                                fontSize: '0.7rem',
                                marginTop: '0.25rem'
                              }}
                            >
                              Delete
                            </button>
                            )}
                          </div>
                        </th>
                      ))}
                      <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #dee2e6', backgroundColor: '#e9ecef', fontWeight: 'bold' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span>Practice Points</span>
                          <small style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>
                            (Earned / Available)
                          </small>
                        </div>
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #dee2e6', backgroundColor: '#e9ecef', fontWeight: 'bold' }}>
                        Total Points<br />
                        <small style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>(Semester)</small>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(member => (
                      <tr key={member.id} style={{ backgroundColor: getLevelColor(level) }}>
                        <td style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong>{member.name}</strong>
                            {editMode && (
                            <button
                              onClick={() => handleDeleteDancer(member.id, member.name)}
                              style={{
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                                fontSize: '0.7rem'
                              }}
                              title="Delete dancer"
                            >
                              Delete
                            </button>
                            )}
                          </div>
                        </td>
                        {sortedEvents.map(event => {
                          const points = getDancerPointsForEvent(member.id, event.id);
                          const record = getDancerRecordForEvent(member.id, event.id);
                          const isAbsenceRequest = record?.fromAbsenceRequest;
                          const reviewedStatus = record?.reviewedStatus;
                          
                          // Determine badge color and display
                          let backgroundColor = '#6c757d';
                          let displayText = '';
                          
                          if (points > 0) {
                            backgroundColor = '#28a745';
                            displayText = '+' + points;
                          } else if (points === 0 && isAbsenceRequest) {
                            // Show as 0 with excused indicator
                            backgroundColor = getStatusColor('excused', isAbsenceRequest || false, reviewedStatus || '');
                            displayText = '0';
                          } else if (points < 0) {
                            backgroundColor = getStatusColor('absent', isAbsenceRequest || false, reviewedStatus || '');
                            displayText = points.toString();
                          }
                          
                          const statusLabel = isAbsenceRequest ? getStatusLabel('', isAbsenceRequest || false, reviewedStatus || '') : null;
                          
                          return (
                            <td key={event.id} style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                                <span style={{
                                  backgroundColor,
                                  color: 'white',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '0.25rem',
                                  fontWeight: '600',
                                  fontSize: '0.9rem'
                                }}>
                                  {displayText}
                                </span>
                                {statusLabel && (
                                  <span style={{
                                    fontSize: '0.65rem',
                                    color: '#666',
                                    fontStyle: 'italic',
                                    textAlign: 'center',
                                    maxWidth: '80px'
                                  }}>
                                    {statusLabel}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #dee2e6', backgroundColor: '#e9ecef' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                            <span style={{
                              backgroundColor: '#007bff',
                              color: 'white',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              fontWeight: 'bold',
                              fontSize: '0.9rem'
                            }}>
                              {getDancerPracticePointsEarned(member.id)} / {getPracticePointsAvailable()}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #dee2e6', backgroundColor: '#e9ecef' }}>
                          <span style={{
                            backgroundColor: getDancerTotalPoints(member.id) >= 0 ? '#28a745' : '#dc3545',
                            color: 'white',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontWeight: 'bold',
                            fontSize: '1rem'
                          }}>
                            {getDancerTotalPoints(member.id) > 0 ? '+' : ''}{getDancerTotalPoints(member.id)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Event Modal */}
      {showEventForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '2rem',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ marginTop: 0 }}>Create New Event</h2>
            <form onSubmit={handleCreateEvent}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Event Name</label>
                <input
                  type="text"
                  value={eventForm.name}
                  onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #ced4da' }}
                  placeholder="e.g., Mon(9/8) Combo"
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Date</label>
                <input
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #ced4da' }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Time (Optional)</label>
                <input
                  type="time"
                  value={eventForm.time}
                  onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #ced4da' }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Event Type</label>
                <select
                  value={eventForm.type}
                  onChange={(e) => setEventForm({ ...eventForm, type: e.target.value as any })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #ced4da' }}
                >
                  <option value="combo">Combo</option>
                  <option value="practice">Practice</option>
                  <option value="bonding">Bonding</option>
                  <option value="fundraiser">Fundraiser</option>
                  <option value="homecoming">Homecoming</option>
                </select>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Points Value</label>
                <input
                  type="number"
                  value={eventForm.pointsValue}
                  onChange={(e) => setEventForm({ ...eventForm, pointsValue: parseInt(e.target.value) || 1 })}
                  min="1"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #ced4da' }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Description (Optional)</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #ced4da', minHeight: '80px' }}
                  placeholder="Additional details about the event..."
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowEventForm(false)}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.25rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.25rem',
                    cursor: 'pointer'
                  }}
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Take Attendance Modal */}
      {showAttendanceForm && selectedEvent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '2rem',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ marginTop: 0 }}>
              Take Attendance - {selectedEvent.name}
            </h2>
            <p style={{ color: '#666', marginBottom: '1rem' }}>
              {new Date(selectedEvent.date).toLocaleDateString()} • {getEventTypeLabel(selectedEvent.type)}
            </p>
            
            <div style={{ marginBottom: '2rem' }}>
              {Object.entries(groupMembersByLevel(clubMembers)).map(([level, members]) => (
                <div key={level} style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ 
                    backgroundColor: getLevelColor(level), 
                    padding: '0.5rem 1rem', 
                    margin: '0 0 1rem 0',
                    borderRadius: '0.25rem',
                    color: '#333'
                  }}>
                    {level}
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.5rem' }}>
                    {members.map(member => (
                      <div
                        key={member.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '0.25rem',
                          border: '1px solid #dee2e6'
                        }}
                      >
                        <span style={{ fontWeight: '600' }}>{member.name}</span>
                        <select
                          value={attendanceData[member.id] || 'present'}
                          onChange={(e) => setAttendanceData({
                            ...attendanceData,
                            [member.id]: e.target.value as 'present' | 'absent' | 'excused'
                          })}
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            border: '1px solid #ced4da',
                            backgroundColor: attendanceData[member.id] === 'present' ? '#28a745' : 
                                           attendanceData[member.id] === 'absent' ? '#dc3545' : '#ffc107',
                            color: 'white',
                            fontWeight: '600'
                          }}
                        >
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                          <option value="excused">Excused</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAttendanceForm(false)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.25rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAttendance}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.25rem',
                  cursor: 'pointer'
                }}
              >
                Save Attendance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
