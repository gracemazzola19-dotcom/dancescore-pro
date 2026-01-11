import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { RUBRIC_CRITERIA, calculateScoreFromCheckboxes } from '../utils/rubricCriteria';

interface Dancer {
  id: string;
  name: string;
  auditionNumber: string;
  email: string;
  group: string;
  hidden?: boolean;
  videoId?: string;
  videoUrl?: string;
  videoGroup?: string;
}

interface Score {
  kick: number;
  jump: number;
  turn: number;
  performance: number;
  execution: number;
  technique: number;
}

interface DancerScore {
  dancerId: string;
  scores: Score;
  comments: string;
}

interface Audition {
  id: string;
  name: string;
  date: string;
  status: string;
}

const JudgeDashboard: React.FC = () => {
  const { logout, user } = useAuth();
  const [dancers, setDancers] = useState<Dancer[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [currentDancers, setCurrentDancers] = useState<Dancer[]>([]);
  const [scores, setScores] = useState<{ [key: string]: DancerScore }>({});
  const [submissionStatus, setSubmissionStatus] = useState<Record<string, { submitted: boolean; hasScores: boolean }>>({});
  const [loading, setLoading] = useState(false);
  const [scoringFormat, setScoringFormat] = useState<'slider' | 'input' | 'checkbox'>('slider');
  const [checkboxScores, setCheckboxScores] = useState<{
    [dancerId: string]: {
      [category: string]: string[];
    }
  }>({});
  const [currentAudition, setCurrentAudition] = useState<Audition | null>(null);
  const [canHide, setCanHide] = useState(false);
  const [clubName, setClubName] = useState<string>('MSU Dance Club');
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [groupVideo, setGroupVideo] = useState<{ [group: string]: string | null }>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetchDancers();
    fetchSettings();
    fetchCurrentAudition();
    
    // Cleanup preview URL when component unmounts
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, []);

  useEffect(() => {
    if (user) {
      checkHidePermission();
    } else {
      setCanHide(false);
    }
  }, [user]);

  const checkHidePermission = async () => {
    if (!user) {
      setCanHide(false);
      return;
    }
    
    // First check from user object (quick check)
    const hasPermissionInUserObject = user.canAccessAdmin === true || 
                                      user.role === 'admin' || 
                                      user.role === 'secretary' || 
                                      user.position === 'President' || 
                                      user.position === 'Vice President';
    
    if (hasPermissionInUserObject) {
      console.log('Hide permission granted from user object:', { 
        canAccessAdmin: user.canAccessAdmin, 
        role: user.role, 
        position: user.position 
      });
      setCanHide(true);
      return;
    }
    
    // If not in user object, check with server (for users logged in before this feature was added)
    try {
      const response = await api.get('/api/user/permissions');
      const { canHideDancer } = response.data;
      console.log('Hide permission from server:', { canHideDancer, user: response.data });
      setCanHide(canHideDancer);
    } catch (error) {
      console.error('Error checking hide permission from server:', error);
      // Fallback to user object check
      setCanHide(hasPermissionInUserObject);
    }
  };

  // Auto-select first group when dancers are loaded
  useEffect(() => {
    if (dancers.length > 0 && !selectedGroup) {
      const availableGroups = Array.from(new Set(dancers.map(dancer => dancer.group)))
        .filter(group => group !== 'Unassigned')
        .sort((a, b) => {
          const aNum = parseInt(a.replace('Group ', '')) || 0;
          const bNum = parseInt(b.replace('Group ', '')) || 0;
          if (isNaN(aNum) && isNaN(bNum)) return a.localeCompare(b);
          if (isNaN(aNum)) return 1;
          if (isNaN(bNum)) return -1;
          return aNum - bNum;
        });
      
      if (availableGroups.length > 0) {
        setSelectedGroup(availableGroups[0]);
      }
    }
  }, [dancers, selectedGroup]);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/settings');
      setScoringFormat(response.data.scoringFormat || 'slider');
      // Fetch club name from appearance settings
      if (response.data.appearanceSettings?.clubName) {
        setClubName(response.data.appearanceSettings.clubName);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchCurrentAudition = async () => {
    try {
      const response = await api.get('/api/auditions');
      const auditions = response.data;
      // Find the active audition
      const activeAudition = auditions.find((audition: Audition) => audition.status === 'active');
      if (activeAudition) {
        setCurrentAudition(activeAudition);
      }
    } catch (error) {
      console.error('Error fetching current audition:', error);
    }
  };

  useEffect(() => {
    const groupDancers = dancers
      .filter(dancer => dancer.group === selectedGroup)
      .sort((a, b) => {
        // Sort by audition number (convert to number for proper sorting)
        const aNum = parseInt(a.auditionNumber) || 0;
        const bNum = parseInt(b.auditionNumber) || 0;
        // Handle NaN cases gracefully
        if (isNaN(aNum) && isNaN(bNum)) return 0;
        if (isNaN(aNum)) return 1;
        if (isNaN(bNum)) return -1;
        return aNum - bNum;
      });
    setCurrentDancers(groupDancers.slice(0, 5)); // Limit to 5 dancers
    
    // Fetch submission status for each dancer
    if (groupDancers.length > 0) {
      fetchSubmissionStatus(groupDancers.slice(0, 5));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dancers, selectedGroup]);

  const fetchDancers = async () => {
    try {
      const response = await api.get('/api/dancers');
      setDancers(response.data);
    } catch (error) {
      console.error('Error fetching dancers:', error);
      toast.error('Failed to fetch dancers');
    }
  };

  const fetchSubmissionStatus = async (dancers: Dancer[]) => {
    try {
      const statusPromises = dancers.map(async (dancer) => {
        try {
          const response = await api.get(`/api/scores/submission-status/${dancer.id}`);
          return { dancerId: dancer.id, ...response.data };
        } catch (error) {
          console.error(`Error fetching submission status for dancer ${dancer.id}:`, error);
          return { dancerId: dancer.id, submitted: false, hasScores: false };
        }
      });
      
      const statuses = await Promise.all(statusPromises);
      const statusMap: Record<string, { submitted: boolean; hasScores: boolean }> = {};
      
      statuses.forEach(status => {
        statusMap[status.dancerId] = {
          submitted: status.submitted,
          hasScores: status.hasScores
        };
        
        // Only load scores if they exist and we don't already have local changes
        if (status.hasScores && status.scores && !scores[status.dancerId]) {
          setScores(prev => ({
            ...prev,
            [status.dancerId]: {
              dancerId: status.dancerId,
              scores: status.scores,
              comments: status.comments || ''
            }
          }));
        }
      });
      
      setSubmissionStatus(statusMap);
    } catch (error) {
      console.error('Error fetching submission status:', error);
    }
  };

  const handleScoreChange = (dancerId: string, category: keyof Score, value: number) => {
    setScores(prev => {
      const existingScore = prev[dancerId];
      const existingScores = existingScore?.scores || {
        kick: 0,
        jump: 0,
        turn: 0,
        performance: 0,
        execution: 0,
        technique: 0
      };
      
      return {
        ...prev,
        [dancerId]: {
          dancerId,
          scores: {
            ...existingScores,
            [category]: value
          },
          comments: existingScore?.comments || ''
        }
      };
    });
  };

  const handleCommentsChange = (dancerId: string, comments: string) => {
    setScores(prev => ({
      ...prev,
      [dancerId]: {
        ...prev[dancerId],
        dancerId,
        scores: prev[dancerId]?.scores || {
          kick: 0,
          jump: 0,
          turn: 0,
          performance: 0,
          execution: 0,
          technique: 0
        },
        comments
      }
    }));
  };

  const handleCheckboxChange = (dancerId: string, category: keyof Score, criteriaId: string, checked: boolean) => {
    setCheckboxScores(prev => {
      const dancerCheckboxes = prev[dancerId] || {};
      const categoryCheckboxes = dancerCheckboxes[category] || [];
      
      const updatedCheckboxes = checked
        ? [...categoryCheckboxes, criteriaId]
        : categoryCheckboxes.filter(id => id !== criteriaId);
      
      const newCheckboxScores = {
        ...prev,
        [dancerId]: {
          ...dancerCheckboxes,
          [category]: updatedCheckboxes
        }
      };
      
      // Calculate score based on checkboxes
      const calculatedScore = calculateScoreFromCheckboxes(category, updatedCheckboxes);
      
      // Update the scores state
      setScores(prevScores => ({
        ...prevScores,
        [dancerId]: {
          ...prevScores[dancerId],
          dancerId,
          scores: {
            ...(prevScores[dancerId]?.scores || {
              kick: 0,
              jump: 0,
              turn: 0,
              performance: 0,
              execution: 0,
              technique: 0
            }),
            [category]: calculatedScore
          },
          comments: prevScores[dancerId]?.comments || ''
        }
      }));
      
      return newCheckboxScores;
    });
  };

  const handleUnsubmitScores = async (dancerId: string) => {
    try {
      setLoading(true);
      
      await api.put(`/api/scores/unsubmit/${dancerId}`, {});
      
      toast.success('Scores unlocked! You can now edit and resubmit.');
      
      // Immediately update submission status to allow editing
      setSubmissionStatus(prev => {
        const updated = {
          ...prev,
          [dancerId]: { submitted: false, hasScores: true }
        };
        console.log('Updated submission status after unsubmit:', updated[dancerId]);
        return updated;
      });
      
    } catch (error: any) {
      console.error('Unsubmit error:', error);
      toast.error('Failed to unsubmit scores: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleIndividualSubmit = async (dancerId: string) => {
    try {
      setLoading(true);
      const scoreData = scores[dancerId];
      
      
      if (!scoreData || !scoreData.scores) {
        toast.error('No scores to submit for this dancer');
        setLoading(false);
        return;
      }
      
      // Validate that at least some scores are entered
      const hasAnyScore = Object.values(scoreData.scores).some(score => score > 0);
      if (!hasAnyScore) {
        toast.error('Please enter at least one score before submitting');
        setLoading(false);
        return;
      }
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const response = await api.post('/api/scores', scoreData);
      
      toast.success(`Scores submitted for ${currentDancers.find(d => d.id === dancerId)?.name || 'dancer'}!`);
      
      // Update submission status for this dancer only
      setSubmissionStatus(prev => {
        const updated = {
          ...prev,
          [dancerId]: { submitted: true, hasScores: true }
        };
        return updated;
      });
    } catch (error: any) {
      console.error('Submit error:', error);
      if (error.response?.status === 400) {
        toast.error('You have already submitted scores for this dancer. Use "Unsubmit" to make changes.');
      } else {
        const errorMsg = error.response?.data?.error || error.message;
        toast.error('Failed to submit scores: ' + errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Check if user has permission to hide/show dancers
  const canHideDancer = () => {
    // Use the state value which is checked on mount and when user changes
    return canHide;
  };

  // Handle hiding/showing a dancer
  const handleToggleDancerVisibility = async (dancerId: string, currentlyHidden: boolean) => {
    try {
      setLoading(true);
      await api.put(`/api/dancers/${dancerId}/hide`, { hidden: !currentlyHidden });
      
      // Update local state
      setDancers(prev => prev.map(d => 
        d.id === dancerId ? { ...d, hidden: !currentlyHidden } : d
      ));
      setCurrentDancers(prev => prev.map(d => 
        d.id === dancerId ? { ...d, hidden: !currentlyHidden } : d
      ));
      
      toast.success(`Dancer ${!currentlyHidden ? 'hidden' : 'shown'} successfully`);
    } catch (error: any) {
      console.error('Error toggling dancer visibility:', error);
      const errorMsg = error.response?.data?.error || error.message;
      toast.error('Failed to update dancer: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    // Validate file size (500MB limit)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      toast.error('Video file is too large. Maximum size is 500MB');
      return;
    }

    setSelectedVideo(file);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);
  };

  const uploadVideo = async () => {
    if (!selectedVideo || !currentAudition?.id || !selectedGroup) {
      toast.error('Please select a video file and group');
      return;
    }

    try {
      setUploading(true);

      const groupDancers = dancers.filter(d => d.group === selectedGroup);

      // Create FormData
      const formData = new FormData();
      formData.append('video', selectedVideo);
      formData.append('group', selectedGroup);
      formData.append('dancerIds', JSON.stringify(groupDancers.map(d => d.id)));
      formData.append('description', `Video for ${selectedGroup} - Dancers ${groupDancers.map(d => d.auditionNumber).join(', ')}`);

      await api.post(`/api/auditions/${currentAudition.id}/videos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Video uploaded successfully!');
      
      // Refresh dancers to get updated video info
      await fetchDancers();
      
      // Clear selection
      setSelectedVideo(null);
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
        setVideoPreviewUrl(null);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error uploading video:', error);
      toast.error('Failed to upload video: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleCancelVideo = () => {
    setSelectedVideo(null);
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const groups = Array.from(new Set(dancers.map(dancer => dancer.group)))
    .filter(group => group !== 'Unassigned')
    .sort((a, b) => {
      // Extract numbers from group names for proper sorting
      const aNum = parseInt(a.replace('Group ', '')) || 0;
      const bNum = parseInt(b.replace('Group ', '')) || 0;
      // Handle NaN cases gracefully
      if (isNaN(aNum) && isNaN(bNum)) return a.localeCompare(b);
      if (isNaN(aNum)) return 1;
      if (isNaN(bNum)) return -1;
      return aNum - bNum;
    });


  return (
    <div className="dashboard">
      {/* Club Header - Dynamic Club Name */}
      <div className="msu-header">
        <h1>{clubName}</h1>
        <p className="subtitle">DanceScore Pro - Judge Scoring System</p>
      </div>
      
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">Judge Dashboard</h1>
          {currentAudition && (
            <div className="audition-info">
              <h2 className="audition-title">{currentAudition.name}</h2>
              <p className="audition-date">{new Date(currentAudition.date).toLocaleDateString()}</p>
            </div>
          )}
        </div>
        <button className="logout-button" onClick={logout}>
          Logout
        </button>
      </div>
      
      <div className="dashboard-content">
        <div className="judge-dashboard">
          <div className="group-selector">
            <h3>Select Group</h3>
            <div className="group-buttons">
              {groups.map(group => (
                <button
                  key={group}
                  className={`group-button ${selectedGroup === group ? 'active' : ''}`}
                  onClick={() => setSelectedGroup(group)}
                >
                  {group}
                </button>
              ))}
            </div>
            
            {/* Video Upload Section */}
            {selectedGroup && currentAudition && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '0.5rem',
                border: '1px solid #dee2e6'
              }}>
                <h4 style={{ marginBottom: '0.75rem', fontSize: '1rem', fontWeight: '600' }}>
                  Video for {selectedGroup}
                </h4>
                
                {/* Show existing video if available */}
                {groupVideo[selectedGroup] && (
                  <div style={{ marginBottom: '1rem' }}>
                    <video
                      controls
                      src={`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}${groupVideo[selectedGroup]}`}
                      style={{
                        width: '100%',
                        maxWidth: '400px',
                        borderRadius: '0.5rem',
                        backgroundColor: '#000'
                      }}
                    />
                  </div>
                )}
                
                {/* Video Upload */}
                {!selectedVideo ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      capture="environment"
                      onChange={handleVideoSelect}
                      style={{ display: 'none' }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      style={{
                        padding: '0.75rem 1.5rem',
                        fontSize: '0.9rem',
                        backgroundColor: uploading ? '#6c757d' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        width: '100%'
                      }}
                    >
                      📹 Record or Select Video
                    </button>
                  </div>
                ) : (
                  <div>
                    {videoPreviewUrl && (
                      <div style={{ marginBottom: '1rem' }}>
                        <video
                          ref={videoPreviewRef}
                          src={videoPreviewUrl}
                          controls
                          style={{
                            width: '100%',
                            maxWidth: '400px',
                            borderRadius: '0.5rem',
                            backgroundColor: '#000'
                          }}
                        />
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={uploadVideo}
                        disabled={uploading}
                        style={{
                          flex: 1,
                          padding: '0.75rem 1.5rem',
                          fontSize: '0.9rem',
                          backgroundColor: uploading ? '#6c757d' : '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          cursor: uploading ? 'not-allowed' : 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        {uploading ? 'Uploading...' : 'Upload Video'}
                      </button>
                      <button
                        onClick={handleCancelVideo}
                        disabled={uploading}
                        style={{
                          padding: '0.75rem 1.5rem',
                          fontSize: '0.9rem',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          cursor: uploading ? 'not-allowed' : 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="scoring-panel">
            <h3>Score Dancers - {selectedGroup || 'Select a Group'}</h3>
            
            {!selectedGroup ? (
              <div className="no-data">
                Please select a group to start scoring.
              </div>
            ) : currentDancers.length === 0 ? (
              <div className="no-data">
                No dancers found for this group.
              </div>
            ) : (
              <>
                <div className={scoringFormat === 'checkbox' ? 'dancers-grid-checkbox' : 'dancers-grid'}>
                  {currentDancers.map(dancer => (
                    <div 
                      key={dancer.id} 
                      className="dancer-card" 
                      style={{
                        ...(scoringFormat === 'checkbox' ? { 
                          gridColumn: 'span 1',
                          padding: '0.5rem',
                          fontSize: '0.8rem'
                        } : {}),
                        ...(dancer.hidden ? {
                          backgroundColor: '#1a1a1a',
                          opacity: 0.9,
                          filter: 'grayscale(100%) brightness(0.4)',
                          position: 'relative',
                          border: '2px solid #333'
                        } : {})
                      }}
                    >
                      <div className="dancer-header" style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: dancer.hidden ? '0.5rem' : undefined
                      }}>
                        <div className="dancer-name" style={dancer.hidden ? { color: '#fff' } : {}}>
                          {dancer.name || 'Unknown Dancer'} #{dancer.auditionNumber || 'N/A'}
                          {dancer.hidden && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#fff' }}>(Left Audition)</span>}
                        </div>
                        {canHideDancer() ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleToggleDancerVisibility(dancer.id, !!dancer.hidden);
                            }}
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.7rem',
                              backgroundColor: dancer.hidden ? '#28a745' : '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              cursor: 'pointer',
                              fontWeight: '600',
                              zIndex: 100,
                              position: dancer.hidden ? 'absolute' : 'static',
                              top: dancer.hidden ? '0.5rem' : 'auto',
                              right: dancer.hidden ? '0.5rem' : 'auto',
                              pointerEvents: 'auto'
                            }}
                            title={dancer.hidden ? 'Show dancer' : 'Hide dancer (left audition)'}
                          >
                            {dancer.hidden ? 'Show' : 'Hide'}
                          </button>
                        ) : null}
                      </div>
                      
                      <div style={dancer.hidden ? { 
                        filter: 'grayscale(100%) brightness(0.4)',
                        backgroundColor: '#1a1a1a',
                        position: 'relative',
                        color: '#ccc'
                      } : {}}>
                      {scoringFormat === 'checkbox' ? (
                        // Format 3: Compact Checkbox Rubric
                        <div style={{ width: '100%', fontSize: '0.8rem' }}>
                          {/* Skills Row */}
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr 1fr 1fr', 
                            gap: '0.5rem',
                            marginBottom: '0.75rem',
                            padding: '0.5rem',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '0.375rem',
                            border: '1px solid #dee2e6'
                          }}>
                            {(['kick', 'jump', 'turn'] as const).map(categoryKey => {
                              const rubric = RUBRIC_CRITERIA[categoryKey];
                              const checkedItems = checkboxScores[dancer.id]?.[categoryKey] || [];
                              const calculatedScore = calculateScoreFromCheckboxes(categoryKey, checkedItems);
                              
                              return (
                                <div key={categoryKey} style={{ textAlign: 'center' }}>
                                  <div style={{ 
                                    fontWeight: '600', 
                                    marginBottom: '0.25rem',
                                    color: '#495057',
                                    textTransform: 'capitalize',
                                    fontSize: '0.75rem'
                                  }}>
                                    {categoryKey} ({calculatedScore.toFixed(1)}/{rubric.maxScore})
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                                    {rubric.criteria.map(criterion => (
                                      <label
                                        key={criterion.id}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          padding: '0.125rem 0.25rem',
                                          backgroundColor: checkedItems.includes(criterion.id) ? '#e7f3ff' : 'white',
                                          border: `1px solid ${checkedItems.includes(criterion.id) ? '#667eea' : '#dee2e6'}`,
                                          borderRadius: '0.25rem',
                                          cursor: (submissionStatus[dancer.id]?.submitted || dancer.hidden) ? 'not-allowed' : 'pointer',
                                          fontSize: '0.7rem',
                                          opacity: (submissionStatus[dancer.id]?.submitted || dancer.hidden) ? 0.6 : 1
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checkedItems.includes(criterion.id)}
                                          onChange={(e) => handleCheckboxChange(dancer.id, categoryKey, criterion.id, e.target.checked)}
                                          disabled={submissionStatus[dancer.id]?.submitted || dancer.hidden}
                                          style={{
                                            width: '12px',
                                            height: '12px',
                                            marginRight: '0.25rem',
                                            cursor: (submissionStatus[dancer.id]?.submitted || dancer.hidden) ? 'not-allowed' : 'pointer'
                                          }}
                                        />
                                        <span style={{ flex: 1, fontSize: '0.65rem' }}>
                                          {criterion.label}
                                        </span>
                                        <span style={{ 
                                          fontSize: '0.6rem', 
                                          color: '#6c757d',
                                          fontWeight: '600'
                                        }}>
                                          {criterion.weight}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Performance, Execution, Technique Row */}
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr 1fr 1fr', 
                            gap: '0.5rem',
                            padding: '0.5rem',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '0.375rem',
                            border: '1px solid #dee2e6'
                          }}>
                            {(['performance', 'execution', 'technique'] as const).map(categoryKey => {
                              const rubric = RUBRIC_CRITERIA[categoryKey];
                              const checkedItems = checkboxScores[dancer.id]?.[categoryKey] || [];
                              const calculatedScore = calculateScoreFromCheckboxes(categoryKey, checkedItems);
                              
                              return (
                                <div key={categoryKey} style={{ textAlign: 'center' }}>
                                  <div style={{ 
                                    fontWeight: '600', 
                                    marginBottom: '0.25rem',
                                    color: '#495057',
                                    textTransform: 'capitalize',
                                    fontSize: '0.75rem'
                                  }}>
                                    {categoryKey} ({calculatedScore.toFixed(1)}/{rubric.maxScore})
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                                    {rubric.criteria.map(criterion => (
                                      <label
                                        key={criterion.id}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          padding: '0.125rem 0.25rem',
                                          backgroundColor: checkedItems.includes(criterion.id) ? '#e7f3ff' : 'white',
                                          border: `1px solid ${checkedItems.includes(criterion.id) ? '#667eea' : '#dee2e6'}`,
                                          borderRadius: '0.25rem',
                                          cursor: (submissionStatus[dancer.id]?.submitted || dancer.hidden) ? 'not-allowed' : 'pointer',
                                          fontSize: '0.7rem',
                                          opacity: (submissionStatus[dancer.id]?.submitted || dancer.hidden) ? 0.6 : 1
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checkedItems.includes(criterion.id)}
                                          onChange={(e) => handleCheckboxChange(dancer.id, categoryKey, criterion.id, e.target.checked)}
                                          disabled={submissionStatus[dancer.id]?.submitted || dancer.hidden}
                                          style={{
                                            width: '12px',
                                            height: '12px',
                                            marginRight: '0.25rem',
                                            cursor: (submissionStatus[dancer.id]?.submitted || dancer.hidden) ? 'not-allowed' : 'pointer'
                                          }}
                                        />
                                        <span style={{ flex: 1, fontSize: '0.65rem' }}>
                                          {criterion.label}
                                        </span>
                                        <span style={{ 
                                          fontSize: '0.6rem', 
                                          color: '#6c757d',
                                          fontWeight: '600'
                                        }}>
                                          {criterion.weight}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        // Format 1 & 2: Sliders or Text Input
                        <>
                          {([
                            { key: 'kick', max: 4, label: 'Kick' },
                            { key: 'jump', max: 4, label: 'Jump' },
                            { key: 'turn', max: 4, label: 'Turn' },
                            { key: 'performance', max: 4, label: 'Performance' },
                            { key: 'execution', max: 8, label: 'Execution' },
                            { key: 'technique', max: 8, label: 'Technique' }
                          ] as const).map(category => (
                            <div key={category.key} className="score-category">
                              <label className="score-label">
                                {category.label}:
                              </label>
                              
                              {scoringFormat === 'slider' ? (
                            // Format 1: Slider
                            <>
                              <input
                                type="range"
                                min="0"
                                max={category.max}
                                step="0.5"
                                className="score-slider"
                                value={scores[dancer.id]?.scores[category.key] || 0}
                                onChange={(e) => handleScoreChange(dancer.id, category.key, parseFloat(e.target.value))}
                                disabled={submissionStatus[dancer.id]?.submitted || dancer.hidden}
                              />
                              <div className="score-value">
                                {(scores[dancer.id]?.scores[category.key] || 0).toFixed(1)} / {category.max}
                              </div>
                            </>
                          ) : (
                            // Format 2: Text Input
                            <>
                              <input
                                type="number"
                                min="0"
                                max={category.max}
                                step="0.5"
                                className="score-input"
                                style={{
                                  width: '80px',
                                  padding: '0.5rem',
                                  fontSize: '1rem',
                                  fontWeight: '600',
                                  textAlign: 'center',
                                  border: '2px solid #dee2e6',
                                  borderRadius: '0.375rem',
                                  marginBottom: '0.25rem',
                                  boxSizing: 'border-box'
                                }}
                                placeholder="0.0"
                                value={scores[dancer.id]?.scores[category.key] || ''}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  if (e.target.value === '' || (!isNaN(value) && value >= 0 && value <= category.max)) {
                                    handleScoreChange(dancer.id, category.key, e.target.value === '' ? 0 : value);
                                  }
                                }}
                                disabled={submissionStatus[dancer.id]?.submitted || dancer.hidden}
                              />
                              <div className="score-value" style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                                / {category.max}
                              </div>
                            </>
                          )}
                            </div>
                          ))}
                        </>
                      )}
                      
                      <div className="score-category">
                        <label className="score-label">Comments</label>
                        <textarea
                          className="comments-textarea"
                          placeholder="Add comments (optional)"
                          value={scores[dancer.id]?.comments || ''}
                          onChange={(e) => handleCommentsChange(dancer.id, e.target.value)}
                          disabled={submissionStatus[dancer.id]?.submitted || dancer.hidden}
                        />
                      </div>
                      
                      <div className="total-score">
                        <div className="total-score-label">Total Score</div>
                        <div className="total-score-value">
                          {(() => {
                            const dancerScores = scores[dancer.id]?.scores;
                            if (!dancerScores) return '0.0';
                            const total = (dancerScores.kick || 0) + 
                                         (dancerScores.jump || 0) + 
                                         (dancerScores.turn || 0) + 
                                         (dancerScores.performance || 0) + 
                                         (dancerScores.execution || 0) + 
                                         (dancerScores.technique || 0);
                            return total.toFixed(1);
                          })()}
                        </div>
                      </div>
                      
                      {/* Submission Status and Controls */}
                      <div className="submission-controls">
                        {submissionStatus[dancer.id]?.submitted ? (
                          <div className="submission-status submitted">
                            <div className="status-indicator" style={{ 
                              color: '#28a745', 
                              fontWeight: '600',
                              fontSize: '0.9rem'
                            }}>
                              LOCKED
                            </div>
                            <button
                              className="unsubmit-button"
                              onClick={() => handleUnsubmitScores(dancer.id)}
                              disabled={loading}
                            >
                              Unlock to Edit
                            </button>
                          </div>
                        ) : submissionStatus[dancer.id]?.hasScores ? (
                          <div className="submission-status draft">
                            <div className="status-indicator" style={{ 
                              color: '#f0ad4e', 
                              fontWeight: '600',
                              fontSize: '0.9rem'
                            }}>
                              DRAFT
                            </div>
                            <button
                              className="submit-button"
                              onClick={() => handleIndividualSubmit(dancer.id)}
                              disabled={loading || submissionStatus[dancer.id]?.submitted}
                            >
                              Submit Scores
                            </button>
                          </div>
                        ) : (
                          <div className="submission-status empty">
                            <div className="status-indicator" style={{ 
                              color: '#6c757d', 
                              fontWeight: '600',
                              fontSize: '0.9rem'
                            }}>
                              NOT SCORED
                            </div>
                            <button
                              className="submit-button"
                              onClick={() => handleIndividualSubmit(dancer.id)}
                              disabled={loading || !scores[dancer.id] || submissionStatus[dancer.id]?.submitted}
                            >
                              Submit Scores
                            </button>
                          </div>
                        )}
                      </div>
                      </div>
                    </div>
                  ))}
                </div>
                
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JudgeDashboard;
