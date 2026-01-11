import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface Audition {
  id: string;
  name: string;
  date: string;
  status: string;
}

interface Dancer {
  id: string;
  name: string;
  auditionNumber: string;
  group: string;
}

const RecordingView: React.FC = () => {
  const { id: auditionId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [audition, setAudition] = useState<Audition | null>(null);
  const [currentGroup, setCurrentGroup] = useState('');
  const [dancers, setDancers] = useState<Dancer[]>([]);
  const [groupDancers, setGroupDancers] = useState<Dancer[]>([]);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clubName, setClubName] = useState<string>('MSU Dance Club');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (auditionId) {
      fetchAudition();
      fetchDancers();
    }
    fetchSettings();
    return () => {
      // Cleanup: stop recording and release camera
      if (recording) {
        stopRecording();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [auditionId]);

  useEffect(() => {
    if (currentGroup) {
      const filtered = dancers.filter(d => d.group === currentGroup);
      setGroupDancers(filtered);
    }
  }, [currentGroup, dancers]);

  const fetchAudition = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/auditions/${auditionId}`);
      setAudition(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching audition:', error);
      toast.error('Failed to fetch audition');
      setLoading(false);
    }
  };

  const fetchDancers = async () => {
    try {
      const response = await api.get(`/api/auditions/${auditionId}/dancers`);
      const dancersData = response.data.dancers || response.data;
      setDancers(dancersData);
      
      // Check for group query parameter first
      const groupFromQuery = searchParams.get('group');
      
      if (dancersData.length > 0) {
        const allGroups = Array.from(new Set(dancersData.map((d: Dancer) => d.group))) as string[];
        const groups = allGroups.filter((g: string) => Boolean(g) && g !== 'Unassigned').sort();
        
        if (groupFromQuery && groups.includes(groupFromQuery)) {
          // Use group from query parameter if it exists and is valid
          setCurrentGroup(groupFromQuery);
        } else if (groups.length > 0) {
          // Otherwise, auto-select first group
          setCurrentGroup(groups[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching dancers:', error);
      toast.error('Failed to fetch dancers');
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/settings');
      if (response.data.appearanceSettings?.clubName) {
        setClubName(response.data.appearanceSettings.clubName);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Keep default
    }
  };

  const startRecording = async () => {
    try {
      // Request camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }, // Use front camera
        audio: true
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Create MediaRecorder
      const options = { mimeType: 'video/webm;codecs=vp9,opus' };
      const recorder = new MediaRecorder(stream, options);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setVideoBlob(blob);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to access camera/microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Stop camera preview
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      toast.success('Recording stopped');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUpload = async () => {
    if (!videoBlob || !auditionId || !currentGroup) {
      toast.error('No video to upload or missing information');
      return;
    }

    try {
      setUploading(true);

      // Create FormData
      const formData = new FormData();
      formData.append('video', videoBlob, `recording-${Date.now()}.webm`);
      formData.append('group', currentGroup);
      formData.append('dancerIds', JSON.stringify(groupDancers.map(d => d.id)));
      formData.append('description', `Video for ${currentGroup} - Dancers ${groupDancers.map(d => d.auditionNumber).join(', ')}`);

      await api.post(`/api/auditions/${auditionId}/videos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Video uploaded successfully!');
      setVideoBlob(null);
      setRecordingTime(0);
    } catch (error: any) {
      console.error('Error uploading video:', error);
      toast.error('Failed to upload video: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setVideoBlob(null);
    setRecordingTime(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const allGroups = Array.from(new Set(dancers.map(d => d.group))) as string[];
  const groups = allGroups.filter((g: string) => Boolean(g) && g !== 'Unassigned').sort();

  return (
    <div className="dashboard">
      <div className="msu-header">
        <h1>{clubName}</h1>
        <p className="subtitle">DanceScore Pro - Video Recording</p>
      </div>

      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Record Audition Video</h1>
          {audition && (
            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.25rem' }}>
              {audition.name} - {new Date(audition.date).toLocaleDateString()}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => navigate('/admin')}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Back to Admin
          </button>
          <button className="logout-button" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-content" style={{ padding: '2rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
        ) : (
          <>
            {/* Group Selection */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Select Group to Record:
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {groups.map(group => (
                  <button
                    key={group}
                    onClick={() => setCurrentGroup(group)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      fontSize: '1rem',
                      backgroundColor: currentGroup === group ? '#8b7fb8' : '#e9ecef',
                      color: currentGroup === group ? 'white' : '#495057',
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    {group}
                  </button>
                ))}
              </div>
            </div>

            {/* Dancers in Selected Group */}
            {currentGroup && groupDancers.length > 0 && (
              <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '0.5rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>Dancers in {currentGroup}:</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {groupDancers.map(dancer => (
                    <span
                      key={dancer.id}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: 'white',
                        borderRadius: '0.25rem',
                        border: '1px solid #dee2e6',
                        fontSize: '0.9rem'
                      }}
                    >
                      #{dancer.auditionNumber} - {dancer.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Video Preview/Recording */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{
                width: '100%',
                maxWidth: '800px',
                margin: '0 auto',
                backgroundColor: '#000',
                borderRadius: '0.5rem',
                overflow: 'hidden',
                aspectRatio: '16/9',
                position: 'relative'
              }}>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
                {recording && (
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    left: '1rem',
                    backgroundColor: 'rgba(220, 53, 69, 0.9)',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.25rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: 'white',
                      animation: 'pulse 1s infinite'
                    }} />
                    REC {formatTime(recordingTime)}
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem' }}>
              {!recording && !videoBlob && (
                <button
                  onClick={startRecording}
                  disabled={!currentGroup}
                  style={{
                    padding: '1rem 2rem',
                    fontSize: '1.2rem',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: currentGroup ? 'pointer' : 'not-allowed',
                    fontWeight: '600',
                    opacity: currentGroup ? 1 : 0.6
                  }}
                >
                  Start Recording
                </button>
              )}

              {recording && (
                <button
                  onClick={stopRecording}
                  style={{
                    padding: '1rem 2rem',
                    fontSize: '1.2rem',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Stop Recording
                </button>
              )}

              {videoBlob && !recording && (
                <>
                  <button
                    onClick={handleUpload}
                    disabled={uploading || !currentGroup}
                    style={{
                      padding: '1rem 2rem',
                      fontSize: '1.2rem',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: (uploading || !currentGroup) ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      opacity: (uploading || !currentGroup) ? 0.6 : 1
                    }}
                  >
                    {uploading ? 'Uploading...' : 'Upload Video'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={uploading}
                    style={{
                      padding: '1rem 2rem',
                      fontSize: '1.2rem',
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
                </>
              )}
            </div>

            <style>{`
              @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
              }
            `}</style>
          </>
        )}
      </div>
    </div>
  );
};

export default RecordingView;
