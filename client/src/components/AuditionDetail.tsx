import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';

interface Audition {
  id: string;
  name: string;
  date: string;
  status: 'draft' | 'active' | 'completed' | 'deliberations' | 'archived';
  judges: string[];
  dancers: number;
}

interface Dancer {
  id: string;
  name: string;
  auditionNumber: number;
  email: string;
  phone: string;
  shirtSize: string;
  previousMember?: string;
  previousLevel?: string;
  group: string;
  averageScore: number;
  rank: number;
  hidden?: boolean;
  scores: {
    [judgeName: string]: {
      kick: number;
      jump: number;
      turn: number;
      performance: number;
      execution: number;
      technique: number;
      total: number;
      comments: string;
      submittedAt: any;
    };
  };
}

interface Video {
  id: string;
  auditionId: string;
  group: string;
  dancerIds: string[];
  videoUrl: string;
  description: string;
  recordedBy: string;
  recordedByName: string;
  recordedAt: string;
  createdAt: string;
  size: number;
}

const AuditionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [audition, setAudition] = useState<Audition | null>(null);
  const [dancers, setDancers] = useState<Dancer[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDancer, setExpandedDancer] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [expandedAnalytics, setExpandedAnalytics] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'dancers' | 'videos'>('dancers');
  
  // New dancer form state
  const [newDancer, setNewDancer] = useState({
    name: '',
    auditionNumber: '',
    email: '',
    phone: '',
    shirtSize: '',
    previousMember: '',
    previousLevel: ''
  });

  const registrationUrl = `${window.location.origin}/register/${id}`;

  useEffect(() => {
    fetchAuditionDetails();
    fetchDancers();
    fetchVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchAuditionDetails = async () => {
    try {
      const auditionResponse = await api.get(`/api/auditions/${id}`);
      setAudition(auditionResponse.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching audition details:', error);
      toast.error('Failed to load audition details');
      setLoading(false);
    }
  };

  const fetchDancers = async () => {
    try {
      const dancersResponse = await api.get(`/api/dancers-with-scores?auditionId=${id}`);
      // Sort by audition number (keep original order)
      const sortedDancers = dancersResponse.data.sort((a: Dancer, b: Dancer) => a.auditionNumber - b.auditionNumber);
      setDancers(sortedDancers);
    } catch (error) {
      console.error('Error fetching dancers:', error);
    }
  };

  const fetchVideos = async () => {
    if (!id) return;
    try {
      const response = await api.get(`/api/auditions/${id}/videos`);
      setVideos(response.data);
    } catch (error: any) {
      // Only log error if it's not a permission error (videos are admin-only)
      if (error.response?.status !== 403) {
        console.error('Error fetching videos:', error);
      }
    }
  };

  const handleDeleteVideo = async (videoId: string, videoDescription: string) => {
    if (!window.confirm(`Are you sure you want to delete this video?\n\n${videoDescription || 'This video'}`)) {
      return;
    }

    try {
      await api.delete(`/api/videos/${videoId}`);
      toast.success('Video deleted successfully');
      // Refresh videos list
      fetchVideos();
    } catch (error: any) {
      console.error('Error deleting video:', error);
      toast.error('Failed to delete video: ' + (error.response?.data?.error || error.message));
    }
  };

  // Check if user is admin (only admins can see videos)
  const isAdmin = () => {
    if (!user) return false;
    const userRole = user.role;
    const userPosition = user.position || '';
    return user.canAccessAdmin === true ||
           userRole === 'admin' || 
           userRole === 'secretary' || 
           userPosition === 'President' || 
           userPosition === 'Vice President';
  };

  const handleAddDancer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDancer.name || !newDancer.auditionNumber) {
      toast.error('Name and Audition Number are required');
      return;
    }

    try {
      await api.post('/api/dancers', {
        ...newDancer,
        auditionId: id
      });
      toast.success('Dancer added successfully!');
      setNewDancer({ name: '', auditionNumber: '', email: '', phone: '', shirtSize: '', previousMember: '', previousLevel: '' });
      fetchDancers();
      fetchAuditionDetails(); // Refresh dancer count
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to add dancer';
      toast.error(errorMessage);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/api/dancers/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const uploadedCount = response.data.dancers ? response.data.dancers.length : 0;
      toast.success(`Successfully uploaded ${uploadedCount} dancers!`);
      
      if (response.data.warnings && response.data.warnings.length > 0) {
        response.data.warnings.forEach((warning: string) => {
          toast.error(warning, { duration: 5000 });
        });
      }
      
      fetchDancers();
      fetchAuditionDetails();
    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to upload dancers';
      toast.error(`Upload failed: ${errorMessage}`);
    }
  };

  const handleDeleteDancer = async (dancerId: string, dancerName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${dancerName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/api/dancers/${dancerId}`);
      setDancers(dancers.filter(d => d.id !== dancerId));
      toast.success(`${dancerName} deleted successfully`);
      fetchAuditionDetails(); // Refresh dancer count
    } catch (error: any) {
      console.error('Error deleting dancer:', error);
      toast.error(error.response?.data?.error || 'Failed to delete dancer');
    }
  };

  const handleManualGroupAssignment = async (dancerId: string, newGroup: string) => {
    try {
      // Convert numeric group to proper format
      const formattedGroup = newGroup === 'Unassigned' || newGroup === 'Eboard' 
        ? newGroup 
        : `Group ${newGroup}`;
      
      await api.put(`/api/dancers/${dancerId}`, { group: formattedGroup });
      setDancers(dancers.map(d => d.id === dancerId ? { ...d, group: formattedGroup } : d));
      toast.success('Group updated successfully');
    } catch (error) {
      toast.error('Failed to update group');
    }
  };

  const handleActivateAudition = async () => {
    if (!audition) return;
    
    if (!window.confirm(
      `Are you sure you want to activate "${audition.name}"?\n\n` +
      `This will:\n` +
      `• Change status from Draft to Active\n` +
      `• Allow judges to start scoring\n` +
      `• Enable deliberations workflow\n\n` +
      `This action cannot be undone.`
    )) {
      return;
    }

    try {
      await api.put(`/api/auditions/${id}/status`, { status: 'active' });
      toast.success('Audition activated successfully!');
      fetchAuditionDetails(); // Refresh to show updated status
    } catch (error: any) {
      console.error('Error activating audition:', error);
      toast.error(error.response?.data?.error || 'Failed to activate audition');
    }
  };

  const handleStartDeliberations = async () => {
    navigate(`/deliberations/${id}`);
  };

  const handleCompleteDeliberations = async () => {
    if (!window.confirm(
      `Are you sure you want to complete deliberations for this audition?\n\n` +
      `This will:\n` +
      `• Mark the audition as "Completed"\n` +
      `• Transfer dancers to the Club Members database\n` +
      `• Finalize all level assignments\n\n` +
      `This action cannot be undone.`
    )) {
      return;
    }

    try {
      // Get the saved deliberations progress from the audition
      const response = await api.get(`/api/auditions/${id}`);
      const savedLevelAssignments = response.data.deliberationsProgress || {};
      
      await api.post(`/api/auditions/${id}/submit-deliberations`, {
        levelAssignments: savedLevelAssignments
      });
      
      toast.success('Deliberations completed successfully!');
      fetchAuditionDetails(); // Refresh to show updated status
    } catch (error: any) {
      console.error('Error completing deliberations:', error);
      toast.error(error.response?.data?.error || 'Failed to complete deliberations');
    }
  };

  const handleDownloadQRPDF = async () => {
    try {
      const response = await api.get(`/api/export/qr-code-pdf?auditionId=${id}&auditionName=${encodeURIComponent(audition?.name || 'Audition')}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const fileName = `${audition?.name.replace(/\s+/g, '-')}-QR-Code.pdf` || 'dancer-registration-qr.pdf';
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('QR Code PDF downloaded!');
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  const toggleAnalytics = (dancerId: string) => {
    const newExpanded = new Set(expandedAnalytics);
    if (newExpanded.has(dancerId)) {
      newExpanded.delete(dancerId);
    } else {
      newExpanded.add(dancerId);
    }
    setExpandedAnalytics(newExpanded);
  };

  const calculateStatistics = (dancer: Dancer) => {
    // Handle cases where scores might be undefined or null
    if (!dancer.scores || typeof dancer.scores !== 'object') {
      return null;
    }
    
    const scores = Object.values(dancer.scores)
      .filter(s => s && typeof s === 'object' && typeof s.total === 'number')
      .map(s => s.total);
      
    if (scores.length === 0) return null;

    const sorted = [...scores].sort((a, b) => a - b);
    const lowest = sorted[0];
    const highest = sorted[sorted.length - 1];
    
    // Calculate mean from all scores
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    // Calculate mean without highest and lowest (if more than 2 scores)
    let adjustedMean = mean;
    if (scores.length > 2) {
      const middleScores = sorted.slice(1, -1);
      adjustedMean = middleScores.reduce((a, b) => a + b, 0) / middleScores.length;
    }
    
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate percentiles
    const p25Index = Math.floor(sorted.length * 0.25);
    const p50Index = Math.floor(sorted.length * 0.50);
    const p75Index = Math.floor(sorted.length * 0.75);
    
    // Calculate percentage of max possible (32 points)
    const maxPossible = 32;
    const meanPercentage = (mean / maxPossible) * 100;
    const adjustedPercentage = (adjustedMean / maxPossible) * 100;

    return {
      mean: mean.toFixed(2),
      adjustedMean: adjustedMean.toFixed(2),
      meanPercentage: meanPercentage.toFixed(1),
      adjustedPercentage: adjustedPercentage.toFixed(1),
      median: sorted[p50Index]?.toFixed(2) || '0.00',
      variance: variance.toFixed(2),
      stdDev: stdDev.toFixed(2),
      min: lowest.toFixed(2),
      max: highest.toFixed(2),
      range: (highest - lowest).toFixed(2),
      percentile25: sorted[p25Index]?.toFixed(2) || '0.00',
      percentile50: sorted[p50Index]?.toFixed(2) || '0.00',
      percentile75: sorted[p75Index]?.toFixed(2) || '0.00',
      lowestScore: lowest,
      highestScore: highest
    };
  };

  if (loading) {
    return <div className="loading">Loading audition details...</div>;
  }

  if (!audition) {
    return (
      <div className="admin-container">
        <div className="admin-section">
          <h2>Audition Not Found</h2>
          <button className="add-dancer-button" onClick={() => navigate('/admin')}>
            Back to Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  const totalDancers = dancers.length;
  const dancersByGroup = dancers.reduce((acc, dancer) => {
    acc[dancer.group] = (acc[dancer.group] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const averageScore = dancers.length > 0
    ? dancers.reduce((sum, d) => sum + d.averageScore, 0) / dancers.length
    : 0;

  const isActive = audition.status === 'active';
  const isDraft = audition.status === 'draft';
  const isCompleted = audition.status === 'completed';
  const isDeliberations = audition.status === 'deliberations';

  return (
    <div className="admin-container">
      {/* Header */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '2rem', 
        borderRadius: '1rem', 
        marginBottom: '2rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h1 className="msu-header" style={{ marginBottom: '0.5rem' }}>{audition.name}</h1>
            <p style={{ color: '#666', fontSize: '1.1rem' }}>
              {new Date(audition.date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {isDraft && (
              <button
                className="add-dancer-button"
                onClick={handleActivateAudition}
                style={{ 
                  backgroundColor: '#28a745',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: '700'
                }}
              >
                Activate Audition
              </button>
            )}
            {(isActive || isDraft) && (
              <button
                className="add-dancer-button"
                onClick={handleStartDeliberations}
                style={{ 
                  backgroundColor: '#667eea',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: '700'
                }}
              >
                Start Deliberations
              </button>
            )}
            {isDeliberations && (
              <>
                <button
                  className="add-dancer-button"
                  onClick={handleStartDeliberations}
                  style={{ 
                    backgroundColor: '#667eea',
                    padding: '0.75rem 1.5rem',
                    fontSize: '1rem',
                    fontWeight: '700'
                  }}
                >
                  Continue Deliberations
                </button>
                <button
                  className="add-dancer-button"
                  onClick={handleCompleteDeliberations}
                  style={{ 
                    backgroundColor: '#28a745',
                    padding: '0.75rem 1.5rem',
                    fontSize: '1rem',
                    fontWeight: '700'
                  }}
                >
                  Complete Deliberations
                </button>
              </>
            )}
            <span style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              fontWeight: '700',
              backgroundColor: 
                audition.status === 'active' ? '#d4edda' :
                audition.status === 'completed' ? '#cce5ff' :
                audition.status === 'deliberations' ? '#fff3cd' :
                audition.status === 'archived' ? '#e2e3e5' : '#fff3cd',
              color:
                audition.status === 'active' ? '#155724' :
                audition.status === 'completed' ? '#004085' :
                audition.status === 'deliberations' ? '#856404' :
                audition.status === 'archived' ? '#383d41' : '#856404'
            }}>
              {audition.status.toUpperCase()}
            </span>
            <button 
              className="add-dancer-button" 
              onClick={() => navigate('/admin')}
              style={{ padding: '0.75rem 1.5rem' }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {isCompleted && (
        <div style={{
          backgroundColor: '#cce5ff',
          border: '2px solid #004085',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '2rem',
          color: '#004085',
          fontWeight: '600'
        }}>
          This audition is completed. Dancers have been transferred to the Club Members database. 
          View them in the Dancers tab of the Admin Dashboard.
        </div>
      )}

      {/* Statistics Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="overview-card">
          <div className="stat-number">{totalDancers}</div>
          <div style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.5rem' }}>Total Dancers</div>
        </div>
        <div className="overview-card">
          <div className="stat-number">{Object.keys(dancersByGroup).length}</div>
          <div style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.5rem' }}>Groups</div>
        </div>
        <div className="overview-card">
          <div className="stat-number">{(averageScore || 0).toFixed(2)}</div>
          <div style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.5rem' }}>Average Score</div>
        </div>
        <div className="overview-card">
          <div className="stat-number">{audition.judges.length}</div>
          <div style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.5rem' }}>Judges</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation" style={{ marginBottom: '2rem' }}>
        <button
          key="dancers"
          onClick={() => setActiveTab('dancers')}
          className={`tab-button ${activeTab === 'dancers' ? 'active' : ''}`}
        >
          Dancers
        </button>
        {isAdmin() && (
          <button
            key="videos"
            onClick={() => setActiveTab('videos')}
            className={`tab-button ${activeTab === 'videos' ? 'active' : ''}`}
          >
            Videos
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'dancers' && (
        <>
          {/* Add Dancers Section - Only show if not completed */}
          {!isCompleted && (
            <>
              {/* QR Code Section */}
              <div className="admin-section">
                <h3>Dancer Self-Registration</h3>
                <div style={{ marginBottom: '1rem' }}>
                  <button 
                    className="add-dancer-button"
                    onClick={() => setShowQRCode(!showQRCode)}
                    style={{ marginRight: '0.5rem' }}
                  >
                    {showQRCode ? 'Hide' : 'Show'} QR Code
                  </button>
                  <button 
                    className="add-dancer-button"
                    onClick={handleDownloadQRPDF}
                    style={{ backgroundColor: '#667eea' }}
                  >
                    Download QR Code PDF
                  </button>
                </div>
                
                {showQRCode && (
                  <div style={{ 
                    padding: '2rem', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    <QRCodeSVG value={registrationUrl} size={256} level="H" />
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                        Scan to Register for Audition
                      </p>
                      <p style={{ fontSize: '0.9rem', color: '#666' }}>
                        {registrationUrl}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Add Dancer Manually */}
              <div className="admin-section">
                <h3>Add Dancer Manually</h3>
                <form className="dancer-form" onSubmit={handleAddDancer}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Full Name"
                    value={newDancer.name}
                    onChange={(e) => setNewDancer({ ...newDancer, name: e.target.value })}
                    required
                  />
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Audition #"
                    value={newDancer.auditionNumber}
                    onChange={(e) => setNewDancer({ ...newDancer, auditionNumber: e.target.value })}
                    required
                  />
                  <input
                    type="email"
                    className="form-input"
                    placeholder="Email"
                    value={newDancer.email}
                    onChange={(e) => setNewDancer({ ...newDancer, email: e.target.value })}
                  />
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="Phone"
                    value={newDancer.phone}
                    onChange={(e) => setNewDancer({ ...newDancer, phone: e.target.value })}
                  />
                  <select
                    className="form-input"
                    value={newDancer.shirtSize}
                    onChange={(e) => setNewDancer({ ...newDancer, shirtSize: e.target.value })}
                  >
                    <option value="">Select Shirt Size</option>
                    <option value="Small">Small</option>
                    <option value="Medium">Medium</option>
                    <option value="Large">Large</option>
                    <option value="XL">XL</option>
                  </select>
                  <select
                    className="form-input"
                    value={newDancer.previousMember}
                    onChange={(e) => setNewDancer({ ...newDancer, previousMember: e.target.value, previousLevel: e.target.value === 'no' ? '' : newDancer.previousLevel })}
                    required
                  >
                    <option value="">Previous Club Member?</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                  {newDancer.previousMember === 'yes' && (
                    <select
                      className="form-input"
                      value={newDancer.previousLevel}
                      onChange={(e) => setNewDancer({ ...newDancer, previousLevel: e.target.value })}
                      required
                    >
                      <option value="">Select Previous Level</option>
                      <option value="Level 1">Level 1</option>
                      <option value="Level 2">Level 2</option>
                      <option value="Level 3">Level 3</option>
                      <option value="Level 4">Level 4</option>
                    </select>
                  )}
                  <button type="submit" className="add-dancer-button">
                    Add Dancer
                  </button>
                </form>
              </div>

              {/* Upload CSV/Excel */}
              <div className="admin-section">
                <h3>Upload Dancers (CSV/Excel)</h3>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                />
                <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
                  Upload a file with columns: Name, Audition Number, Email, Phone, Shirt Size
                </p>
              </div>
            </>
          )}

          {/* Dancers Table */}
          <div className="admin-section">
            <h3>Dancers ({dancers.length})</h3>
            {dancers.length === 0 ? (
              <p style={{ color: '#6c757d', fontStyle: 'italic' }}>No dancers registered yet.</p>
            ) : (
              <table className="results-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Name</th>
                <th>#</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Shirt Size</th>
                <th>Previous Member</th>
                <th>Previous Level</th>
                <th>Group</th>
                <th>Kick</th>
                <th>Jump</th>
                <th>Turn</th>
                <th>Performance</th>
                <th>Execution</th>
                <th>Technique</th>
                <th>Total (32)</th>
                <th>Scores</th>
                <th>Details</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dancers.map((dancer) => {
                const stats = calculateStatistics(dancer);
                return (
                  <React.Fragment key={dancer.id}>
                    <tr style={{
                      ...(dancer.hidden ? {
                        backgroundColor: '#f8f9fa',
                        opacity: 0.6,
                        color: '#6c757d'
                      } : {})
                    }}>
                      <td>
                        {dancer.hidden ? (
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            backgroundColor: '#dc3545',
                            color: 'white'
                          }}>
                            Hidden
                          </span>
                        ) : (
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            backgroundColor: '#28a745',
                            color: 'white'
                          }}>
                            Active
                          </span>
                        )}
                      </td>
                      <td>{dancer.name}</td>
                      <td>{dancer.auditionNumber}</td>
                      <td style={{ fontSize: '0.85rem' }}>{dancer.email || '-'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{dancer.phone || '-'}</td>
                      <td>{dancer.shirtSize || '-'}</td>
                      <td>{dancer.previousMember === 'yes' ? 'Yes' : dancer.previousMember === 'no' ? 'No' : '-'}</td>
                      <td>{dancer.previousLevel || '-'}</td>
                      <td>
                        {!isCompleted ? (
                          <select
                            value={dancer.group === 'Unassigned' || dancer.group === 'Eboard' 
                              ? dancer.group 
                              : dancer.group.replace('Group ', '')}
                            onChange={(e) => handleManualGroupAssignment(dancer.id, e.target.value)}
                            style={{ fontSize: '0.8rem', padding: '0.25rem' }}
                          >
                            <option value="Unassigned">Unassigned</option>
                            <option value="Eboard">Eboard</option>
                            {Array.from({ length: 30 }, (_, i) => (
                              <option key={i + 1} value={`${i + 1}`}>Group {i + 1}</option>
                            ))}
                          </select>
                        ) : (
                          dancer.group === 'Eboard' ? 'Eboard' : `Group ${dancer.group}`
                        )}
                      </td>
                      <td>{dancer.averageScore > 0 ? (Object.values(dancer.scores).reduce((sum, s) => sum + (s?.kick || 0), 0) / Object.values(dancer.scores).length).toFixed(2) : '-'}</td>
                      <td>{dancer.averageScore > 0 ? (Object.values(dancer.scores).reduce((sum, s) => sum + (s?.jump || 0), 0) / Object.values(dancer.scores).length).toFixed(2) : '-'}</td>
                      <td>{dancer.averageScore > 0 ? (Object.values(dancer.scores).reduce((sum, s) => sum + (s?.turn || 0), 0) / Object.values(dancer.scores).length).toFixed(2) : '-'}</td>
                      <td>{dancer.averageScore > 0 ? (Object.values(dancer.scores).reduce((sum, s) => sum + (s?.performance || 0), 0) / Object.values(dancer.scores).length).toFixed(2) : '-'}</td>
                      <td>{dancer.averageScore > 0 ? (Object.values(dancer.scores).reduce((sum, s) => sum + (s?.execution || 0), 0) / Object.values(dancer.scores).length).toFixed(2) : '-'}</td>
                      <td>{dancer.averageScore > 0 ? (Object.values(dancer.scores).reduce((sum, s) => sum + (s?.technique || 0), 0) / Object.values(dancer.scores).length).toFixed(2) : '-'}</td>
                      <td style={{ fontWeight: '700', fontSize: '1rem' }}>
                        {dancer.averageScore > 0 ? (dancer.averageScore || 0).toFixed(2) : '-'}
                      </td>
                      <td>{Object.keys(dancer.scores).length} / 9</td>
                      <td>
                        <button
                          onClick={() => setExpandedDancer(expandedDancer === dancer.id ? null : dancer.id)}
                          className="add-dancer-button"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                        >
                          {expandedDancer === dancer.id ? 'Hide' : 'Show'}
                        </button>
                      </td>
                      <td>
                        {!isCompleted && (
                          <button
                            onClick={() => handleDeleteDancer(dancer.id, dancer.name)}
                            style={{
                              padding: '0.5rem 1rem',
                              borderRadius: '0.25rem',
                              border: 'none',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedDancer === dancer.id && (
                      <tr>
                        <td colSpan={20} style={{ backgroundColor: '#f8f9fa', padding: '1.5rem' }}>
                          {/* Final Score Display */}
                          <div style={{ 
                            textAlign: 'center', 
                            marginBottom: '2rem', 
                            padding: '1.5rem',
                            backgroundColor: 'white',
                            borderRadius: '0.75rem',
                            border: '3px solid #667eea'
                          }}>
                            <h3 style={{ margin: '0 0 0.5rem 0', color: '#667eea', fontSize: '1.2rem', fontWeight: '600' }}>
                              Final Score
                            </h3>
                            <div style={{ fontSize: '3rem', fontWeight: '700', color: '#667eea', lineHeight: '1' }}>
                              {stats ? stats.adjustedMean : (dancer.averageScore || 0).toFixed(2)}
                            </div>
                            <div style={{ fontSize: '1.5rem', color: '#666', marginTop: '0.25rem' }}>
                              {stats ? `${stats.adjustedPercentage}%` : `${(((dancer.averageScore || 0) / 32) * 100).toFixed(1)}%`}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#8b7fb8', marginTop: '0.5rem', fontStyle: 'italic' }}>
                              High & Low Dropped • Average of 7 Scores
                            </div>
                          </div>
                          
                          {/* Individual Judge Scores - moved here */}
                          <h4 style={{ marginBottom: '0.75rem' }}>Individual Judge Scores</h4>
                          {Object.keys(dancer.scores).length === 0 ? (
                            <p style={{ color: '#666', fontStyle: 'italic' }}>No scores submitted yet</p>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
                              {Object.entries(dancer.scores).map(([judgeName, score]) => {
                                const isLowest = stats && score.total === stats.lowestScore;
                                const isHighest = stats && score.total === stats.highestScore;
                                return (
                                  <div key={judgeName} style={{ 
                                    backgroundColor: isLowest ? '#ffe6e6' : isHighest ? '#e6ffe6' : 'white', 
                                    padding: '0.75rem', 
                                    borderRadius: '0.5rem',
                                    border: isLowest ? '2px solid #dc3545' : isHighest ? '2px solid #28a745' : '1px solid #dee2e6',
                                    position: 'relative'
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                      <h5 style={{ margin: 0, color: '#667eea', fontSize: '1rem', fontWeight: '700' }}>
                                        {judgeName}
                                      </h5>
                                      <span style={{ 
                                        fontWeight: '700', 
                                        fontSize: '1.1rem',
                                        color: isLowest ? '#dc3545' : isHighest ? '#28a745' : '#667eea'
                                      }}>
                                        {(score.total || 0).toFixed(1)}/32
                                      </span>
                                    </div>
                                    {(isLowest || isHighest) && (
                                      <div style={{ 
                                        fontSize: '0.75rem', 
                                        fontWeight: '600',
                                        color: isLowest ? '#dc3545' : '#28a745',
                                        marginBottom: '0.5rem'
                                      }}>
                                        {isLowest ? 'LOWEST (DROPPED)' : 'HIGHEST (DROPPED)'}
                                      </div>
                                    )}
                                    
                                    {/* Visual Score Bars */}
                                    <div style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                                        <span>Kick:</span>
                                        <span style={{ fontWeight: '600' }}>{score.kick}/4</span>
                                      </div>
                                      <div style={{ width: '100%', height: '4px', backgroundColor: '#e9ecef', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ width: `${(score.kick / 4) * 100}%`, height: '100%', backgroundColor: '#667eea', borderRadius: '2px' }} />
                                      </div>
                                    </div>
                                    
                                    <div style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                                        <span>Jump:</span>
                                        <span style={{ fontWeight: '600' }}>{score.jump}/4</span>
                                      </div>
                                      <div style={{ width: '100%', height: '4px', backgroundColor: '#e9ecef', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ width: `${(score.jump / 4) * 100}%`, height: '100%', backgroundColor: '#667eea', borderRadius: '2px' }} />
                                      </div>
                                    </div>
                                    
                                    <div style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                                        <span>Turn:</span>
                                        <span style={{ fontWeight: '600' }}>{score.turn}/4</span>
                                      </div>
                                      <div style={{ width: '100%', height: '4px', backgroundColor: '#e9ecef', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ width: `${(score.turn / 4) * 100}%`, height: '100%', backgroundColor: '#667eea', borderRadius: '2px' }} />
                                      </div>
                                    </div>
                                    
                                    <div style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                                        <span>Performance:</span>
                                        <span style={{ fontWeight: '600' }}>{score.performance}/4</span>
                                      </div>
                                      <div style={{ width: '100%', height: '4px', backgroundColor: '#e9ecef', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ width: `${(score.performance / 4) * 100}%`, height: '100%', backgroundColor: '#667eea', borderRadius: '2px' }} />
                                      </div>
                                    </div>
                                    
                                    <div style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                                        <span>Execution:</span>
                                        <span style={{ fontWeight: '600' }}>{score.execution}/8</span>
                                      </div>
                                      <div style={{ width: '100%', height: '4px', backgroundColor: '#e9ecef', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ width: `${(score.execution / 8) * 100}%`, height: '100%', backgroundColor: '#667eea', borderRadius: '2px' }} />
                                      </div>
                                    </div>
                                    
                                    <div style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                                        <span>Technique:</span>
                                        <span style={{ fontWeight: '600' }}>{score.technique}/8</span>
                                      </div>
                                      <div style={{ width: '100%', height: '4px', backgroundColor: '#e9ecef', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ width: `${(score.technique / 8) * 100}%`, height: '100%', backgroundColor: '#667eea', borderRadius: '2px' }} />
                                      </div>
                                    </div>
                                    
                                    {score.comments && (
                                      <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '0.25rem', fontSize: '0.85rem' }}>
                                        <strong>Comments:</strong> {score.comments}
                                      </div>
                                    )}
                                    {score.submittedAt && (
                                      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#666' }}>
                                        Submitted: {new Date(score.submittedAt.seconds * 1000).toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          
                          {/* Statistical Analysis - moved to bottom */}
                          <div style={{ marginTop: '1rem' }}>
                            <button
                              onClick={() => toggleAnalytics(dancer.id)}
                              className="add-dancer-button"
                              style={{ marginBottom: '1rem' }}
                            >
                              {expandedAnalytics.has(dancer.id) ? 'Hide' : 'Show'} Statistical Analysis
                            </button>
                          </div>
                          
                          {expandedAnalytics.has(dancer.id) && (() => {
                            if (!stats) {
                              return (
                                <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px', marginTop: '1rem' }}>
                                  <p style={{ color: '#6c757d', margin: 0 }}>No statistical data available - dancer may not have scores yet.</p>
                                </div>
                              );
                            }
                            // Calculate overall percentile compared to all dancers
                            const allDancerScores = dancers.map(d => d.averageScore).sort((a, b) => a - b);
                            const percentile = allDancerScores.length > 1
                              ? Math.round((allDancerScores.filter(s => s < dancer.averageScore).length / allDancerScores.length) * 100)
                              : 0;
                            
                            const rank = [...dancers].sort((a, b) => b.averageScore - a.averageScore).findIndex(d => d.id === dancer.id) + 1;
                            
                            // Judge Agreement based on std dev
                            const stdDevNum = parseFloat(stats.stdDev);
                            let confidence = 'High';
                            let confidenceColor = '#28a745';
                            if (stdDevNum > 2.5) {
                              confidence = 'Low';
                              confidenceColor = '#dc3545';
                            } else if (stdDevNum > 1.5) {
                              confidence = 'Moderate';
                              confidenceColor = '#ffc107';
                            }
                            
                            // Calculate category percentiles
                            const getCategoryPercentile = (category: 'kick' | 'jump' | 'turn' | 'performance' | 'execution' | 'technique') => {
                              const allCategoryScores = dancers
                                .map(d => {
                                  const scores = Object.values(d.scores);
                                  if (scores.length === 0) return 0;
                                  return scores.reduce((sum, s) => sum + s[category], 0) / scores.length;
                                })
                                .filter(s => s > 0)
                                .sort((a, b) => a - b);
                              
                              if (allCategoryScores.length <= 1) return 0;
                              
                              const dancerScores = Object.values(dancer.scores);
                              const dancerCategoryAvg = dancerScores.reduce((sum, s) => sum + s[category], 0) / dancerScores.length;
                              
                              return Math.round(
                                (allCategoryScores.filter(s => s < dancerCategoryAvg).length / allCategoryScores.length) * 100
                              );
                            };
                            
                            const categoryPercentiles = {
                              kick: getCategoryPercentile('kick'),
                              jump: getCategoryPercentile('jump'),
                              turn: getCategoryPercentile('turn'),
                              performance: getCategoryPercentile('performance'),
                              execution: getCategoryPercentile('execution'),
                              technique: getCategoryPercentile('technique')
                            };
                            
                            const getPercentileLabel = (pct: number) => {
                              if (pct >= 90) return { label: 'Excellent', color: '#28a745', bgColor: '#d4edda' };
                              if (pct >= 75) return { label: 'Very Good', color: '#5cb85c', bgColor: '#d4edda' };
                              if (pct >= 60) return { label: 'Good', color: '#17a2b8', bgColor: '#d1ecf1' };
                              if (pct >= 40) return { label: 'Average', color: '#856404', bgColor: '#fff3cd' };
                              return { label: 'Needs Work', color: '#721c24', bgColor: '#f8d7da' };
                            };
                            
                            return (
                              <div style={{
                                backgroundColor: '#e7f3ff',
                                padding: '1rem',
                                borderRadius: '0.5rem',
                                marginBottom: '1rem',
                                border: '2px solid #17a2b8'
                              }}>
                                <h4 style={{ margin: '0 0 1rem 0', color: '#17a2b8', fontWeight: '600' }}>Statistical Analysis</h4>
                                
                                {/* Overview Stats Cards */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                                  <div style={{ backgroundColor: 'white', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #17a2b8' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>Overall Ranking</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#17a2b8' }}>#{rank}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>out of {dancers.length} dancers</div>
                                  </div>
                                  
                                  <div style={{ 
                                    backgroundColor: getPercentileLabel(percentile).bgColor, 
                                    padding: '0.75rem', 
                                    borderRadius: '0.5rem', 
                                    border: `2px solid ${getPercentileLabel(percentile).color}` 
                                  }}>
                                    <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>PERCENTILE</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: getPercentileLabel(percentile).color }}>{percentile}th</div>
                                    <div style={{ fontSize: '0.8rem', color: getPercentileLabel(percentile).color, fontWeight: '600' }}>
                                      {getPercentileLabel(percentile).label}
                                    </div>
                                  </div>
                                  
                                  <div style={{ backgroundColor: 'white', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #17a2b8' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>Judge Agreement</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: confidenceColor }}>{confidence}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>SD: {stats.stdDev}</div>
                                  </div>
                                  
                                  <div style={{ backgroundColor: 'white', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #17a2b8' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>Score Range</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#495057' }}>
                                      {stats.min} - {stats.max}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>Spread: {stats.range} pts</div>
                                  </div>
                                </div>
                                
                                {/* Category Performance */}
                                <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #17a2b8', marginBottom: '1rem' }}>
                                  <h5 style={{ margin: '0 0 0.75rem 0', color: '#495057' }}>Category Performance</h5>
                                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    {Object.entries(categoryPercentiles).map(([category, pct]) => {
                                      const label = getPercentileLabel(pct as number);
                                      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
                                      const categoryKey = category as 'kick' | 'jump' | 'turn' | 'performance' | 'execution' | 'technique';
                                      const scores = Object.values(dancer.scores);
                                      const avgScore = scores.reduce((sum, s) => sum + s[categoryKey], 0) / scores.length;
                                      const maxScore = ['kick', 'jump', 'turn', 'performance'].includes(category) ? 4 : 8;
                                      
                                      return (
                                        <div key={category}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                                            <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>{categoryName}</span>
                                            <span style={{ fontSize: '0.8rem' }}>
                                              <span style={{ fontWeight: '700' }}>{(avgScore || 0).toFixed(2)}</span>
                                              <span style={{ color: '#6c757d' }}> / {maxScore}</span>
                                              <span style={{ marginLeft: '0.5rem', color: label.color, fontWeight: '700' }}>
                                                ({pct}th %)
                                              </span>
                                            </span>
                                          </div>
                                          <div style={{ 
                                            height: '6px', 
                                            backgroundColor: '#e9ecef', 
                                            borderRadius: '3px',
                                            overflow: 'hidden'
                                          }}>
                                            <div style={{ 
                                              height: '100%', 
                                              width: `${pct}%`, 
                                              backgroundColor: label.color,
                                              transition: 'width 0.3s ease'
                                            }} />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  
                                  {/* Strengths and Areas for Improvement */}
                                  <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                      <div style={{ fontWeight: '600', color: '#28a745', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                        Strengths
                                      </div>
                                      {Object.entries(categoryPercentiles)
                                        .filter(([_, pct]) => pct >= 75)
                                        .sort((a, b) => b[1] - a[1])
                                        .slice(0, 3)
                                        .map(([cat, pct]) => (
                                          <div key={cat} style={{ fontSize: '0.8rem', color: '#28a745', marginLeft: '0.5rem' }}>
                                            • {cat.charAt(0).toUpperCase() + cat.slice(1)} ({pct}th %)
                                          </div>
                                        ))}
                                      {Object.entries(categoryPercentiles).filter(([_, pct]) => pct >= 75).length === 0 && (
                                        <div style={{ fontSize: '0.8rem', color: '#6c757d', fontStyle: 'italic', marginLeft: '0.5rem' }}>
                                          No categories above 75th percentile
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <div style={{ fontWeight: '600', color: '#f0ad4e', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                        Areas for Improvement
                                      </div>
                                      {Object.entries(categoryPercentiles)
                                        .filter(([_, pct]) => pct < 50)
                                        .sort((a, b) => a[1] - b[1])
                                        .slice(0, 3)
                                        .map(([cat, pct]) => (
                                          <div key={cat} style={{ fontSize: '0.8rem', color: '#ffc107', marginLeft: '0.5rem' }}>
                                            • {cat.charAt(0).toUpperCase() + cat.slice(1)} ({pct}th %)
                                          </div>
                                        ))}
                                      {Object.entries(categoryPercentiles).filter(([_, pct]) => pct < 50).length === 0 && (
                                        <div style={{ fontSize: '0.8rem', color: '#6c757d', fontStyle: 'italic', marginLeft: '0.5rem' }}>
                                          All categories above 50th percentile
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Interpretation Guide */}
                                <div style={{ 
                                  padding: '0.75rem', 
                                  backgroundColor: '#f8f9fa', 
                                  borderRadius: '0.5rem',
                                  fontSize: '0.8rem',
                                  color: '#495057',
                                  border: '1px solid #dee2e6'
                                }}>
                                  <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Guide:</div>
                                  <ul style={{ margin: '0', padding: '0 0 0 1.25rem' }}>
                                    <li><strong>Percentile:</strong> {percentile}th means scored better than {percentile}% of all dancers</li>
                                    <li><strong>Judge Agreement:</strong> {confidence} - {confidence === 'High' ? 'Judges agree closely' : confidence === 'Moderate' ? 'Normal variation' : 'Significant disagreement'}</li>
                                    <li><strong>Variance:</strong> {stats.variance} - Lower values mean more consistent judging</li>
                                  </ul>
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              </tbody>
            </table>
            )}
          </div>
        </>
      )}

      {/* Videos Tab - Admin Only */}
      {activeTab === 'videos' && isAdmin() && (
        <div className="admin-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2>Audition Videos</h2>
          </div>

          {/* Group Selection for Recording */}
          {!isCompleted && id && (
            <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '0.5rem', border: '1px solid #dee2e6' }}>
              <h3 style={{ marginBottom: '1rem' }}>Record Video for Group</h3>
              <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                Select a group to record their audition session
              </p>
              {Object.keys(dancersByGroup).length === 0 ? (
                <div style={{ padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '0.5rem', border: '1px solid #ffc107', color: '#856404' }}>
                  <p style={{ margin: 0, fontWeight: '600' }}>No groups available yet</p>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                    Dancers need to be assigned to groups before you can record videos. You can still record videos by using the "Record Video" button from the Admin Dashboard.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {Object.keys(dancersByGroup).sort((a, b) => {
                    const aNum = parseInt(a.replace('Group ', '')) || 0;
                    const bNum = parseInt(b.replace('Group ', '')) || 0;
                    return aNum - bNum;
                  }).map(group => {
                    const groupDancers = dancers.filter(d => d.group === group);
                    return (
                      <button
                        key={group}
                        onClick={() => {
                          // Navigate to recording view with group pre-selected
                          navigate(`/recording/${id}?group=${encodeURIComponent(group)}`);
                        }}
                        style={{
                          padding: '1rem 1.5rem',
                          fontSize: '1rem',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          fontWeight: '600',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.25rem',
                          minWidth: '150px'
                        }}
                        title={`Record video for ${group}`}
                      >
                        <span>Record {group}</span>
                        <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                          {dancersByGroup[group]} dancer{dancersByGroup[group] !== 1 ? 's' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Videos List - Grouped by Group */}
          {videos.length === 0 ? (
            <div style={{ 
              padding: '3rem', 
              textAlign: 'center', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '0.5rem',
              border: '1px solid #dee2e6',
              color: '#6c757d'
            }}>
              <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: '600' }}>No videos recorded yet</p>
              <p style={{ fontSize: '0.95rem' }}>
                {!isCompleted 
                  ? 'Select a group above to start recording their audition session'
                  : 'No videos were recorded for this audition'}
              </p>
            </div>
          ) : (
            <div>
              {/* Group videos by group */}
              {Object.keys(
                videos.reduce((acc, video) => {
                  acc[video.group] = acc[video.group] || [];
                  acc[video.group].push(video);
                  return acc;
                }, {} as Record<string, Video[]>)
              ).sort((a, b) => {
                const aNum = parseInt(a.replace('Group ', '')) || 0;
                const bNum = parseInt(b.replace('Group ', '')) || 0;
                return aNum - bNum;
              }).map(group => {
                const groupVideos = videos.filter(v => v.group === group);
                const groupDancersList = dancers.filter(d => d.group === group);
                return (
                  <div key={group} style={{ marginBottom: '2.5rem' }}>
                    <h3 style={{ 
                      marginBottom: '1rem', 
                      fontSize: '1.3rem', 
                      fontWeight: '600',
                      color: '#495057',
                      paddingBottom: '0.5rem',
                      borderBottom: '2px solid #dee2e6'
                    }}>
                      {group} - {groupVideos.length} video{groupVideos.length !== 1 ? 's' : ''}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
                      {groupVideos.map(video => {
                        // Get token from localStorage for video URL
                        const token = localStorage.getItem('token');
                        const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
                        // Add token as query parameter for video streaming (browser video tag can't send auth headers)
                        const separator = video.videoUrl.includes('?') ? '&' : '?';
                        const videoUrl = `${baseUrl}${video.videoUrl}${token ? `${separator}token=${encodeURIComponent(token)}` : ''}`;
                        // Get dancer names for this video
                        const videoDancers = groupDancersList.filter(d => video.dancerIds && video.dancerIds.includes(d.id));
                        return (
                          <div
                            key={video.id}
                            style={{
                              backgroundColor: 'white',
                              borderRadius: '0.5rem',
                              border: '1px solid #dee2e6',
                              overflow: 'hidden',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                          >
                            <video
                              controls
                              src={videoUrl}
                              style={{
                                width: '100%',
                                aspectRatio: '16/9',
                                backgroundColor: '#000',
                                display: 'block'
                              }}
                            >
                              Your browser does not support the video tag.
                            </video>
                            <div style={{ padding: '1rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', flex: 1 }}>
                                  {video.description || `${group} - ${videoDancers.length > 0 ? videoDancers.map(d => `#${d.auditionNumber}`).join(', ') : ''}`}
                                </h4>
                                <button
                                  onClick={() => handleDeleteVideo(video.id, video.description || video.group)}
                                  style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.85rem',
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.25rem',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    marginLeft: '0.5rem'
                                  }}
                                  title="Delete this video"
                                >
                                  Delete
                                </button>
                              </div>
                              <div style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: '0.5rem' }}>
                                {videoDancers.length > 0 && (
                                  <div>Dancers: {videoDancers.map(d => `#${d.auditionNumber} ${d.name}`).join(', ')}</div>
                                )}
                                <div>Recorded by: {video.recordedByName || 'Unknown'}</div>
                                <div>
                                  Recorded: {new Date(video.recordedAt).toLocaleString()}
                                </div>
                                {video.size && (
                                  <div>Size: {(video.size / (1024 * 1024)).toFixed(2)} MB</div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditionDetail;
