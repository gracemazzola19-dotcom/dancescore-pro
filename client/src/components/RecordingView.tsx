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
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clubName, setClubName] = useState<string>('MSU Dance Club');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (auditionId) {
      fetchAudition();
      fetchDancers();
    }
    fetchSettings();
    
    // Cleanup preview URL when component unmounts
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
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

    // Auto-upload if group is selected
    if (currentGroup && auditionId) {
      uploadVideo(file);
    }
  };

  const uploadVideo = async (file?: File) => {
    const videoFile = file || selectedVideo;
    if (!videoFile || !auditionId || !currentGroup) {
      toast.error('Please select a video file and group');
      return;
    }

    try {
      setUploading(true);

      // Create FormData
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('group', currentGroup);
      formData.append('dancerIds', JSON.stringify(groupDancers.map(d => d.id)));
      formData.append('description', `Video for ${currentGroup} - Dancers ${groupDancers.map(d => d.auditionNumber).join(', ')}`);

      await api.post(`/api/auditions/${auditionId}/videos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Video uploaded successfully!');
      
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

  const handleCancel = () => {
    setSelectedVideo(null);
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const allGroups = Array.from(new Set(dancers.map(d => d.group))) as string[];
  const groups = allGroups.filter((g: string) => Boolean(g) && g !== 'Unassigned').sort();

  return (
    <div className="dashboard">
      <div className="msu-header">
        <h1>{clubName}</h1>
        <p className="subtitle">DanceScore Pro - Video Upload</p>
      </div>

      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Upload Audition Video</h1>
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
                Select Group:
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

            {/* Video Upload Section */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{
                width: '100%',
                maxWidth: '800px',
                margin: '0 auto',
                backgroundColor: '#f8f9fa',
                borderRadius: '0.5rem',
                padding: '2rem',
                border: '2px dashed #dee2e6'
              }}>
                {!selectedVideo ? (
                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ marginBottom: '1rem', color: '#495057' }}>Select Video from Your Phone</h3>
                    <p style={{ marginBottom: '1.5rem', color: '#6c757d' }}>
                      Use your phone's camera app to record a video, then select it here to upload
                    </p>
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
                      disabled={!currentGroup || uploading}
                      style={{
                        padding: '1rem 2rem',
                        fontSize: '1.2rem',
                        backgroundColor: currentGroup && !uploading ? '#007bff' : '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: currentGroup && !uploading ? 'pointer' : 'not-allowed',
                        fontWeight: '600',
                        opacity: currentGroup && !uploading ? 1 : 0.6
                      }}
                    >
                      {!currentGroup ? 'Select Group First' : '📹 Record or Select Video'}
                    </button>
                    <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#6c757d' }}>
                      Maximum file size: 500MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 style={{ marginBottom: '1rem', color: '#495057' }}>Video Preview</h3>
                    <div style={{
                      width: '100%',
                      marginBottom: '1.5rem',
                      backgroundColor: '#000',
                      borderRadius: '0.5rem',
                      overflow: 'hidden',
                      aspectRatio: '16/9'
                    }}>
                      {videoPreviewUrl && (
                        <video
                          ref={videoPreviewRef}
                          src={videoPreviewUrl}
                          controls
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain'
                          }}
                        />
                      )}
                    </div>
                    <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#6c757d' }}>
                      <p><strong>File:</strong> {selectedVideo.name}</p>
                      <p><strong>Size:</strong> {(selectedVideo.size / (1024 * 1024)).toFixed(2)} MB</p>
                      <p><strong>Type:</strong> {selectedVideo.type}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                      <button
                        onClick={() => uploadVideo()}
                        disabled={uploading || !currentGroup}
                        style={{
                          padding: '1rem 2rem',
                          fontSize: '1.2rem',
                          backgroundColor: currentGroup && !uploading ? '#28a745' : '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          cursor: currentGroup && !uploading ? 'pointer' : 'not-allowed',
                          fontWeight: '600',
                          opacity: currentGroup && !uploading ? 1 : 0.6
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
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div style={{
              marginTop: '2rem',
              padding: '1.5rem',
              backgroundColor: '#e7f3ff',
              borderRadius: '0.5rem',
              border: '1px solid #b3d9ff'
            }}>
              <h3 style={{ marginBottom: '0.75rem', color: '#004085' }}>How to Upload Videos</h3>
              <ol style={{ margin: 0, paddingLeft: '1.5rem', color: '#004085', lineHeight: '1.8' }}>
                <li>Select a group above</li>
                <li>Tap "Record or Select Video" button</li>
                <li>Choose to record a new video or select an existing video from your phone's gallery</li>
                <li>Review the video preview</li>
                <li>Tap "Upload Video" to save it to the system</li>
              </ol>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RecordingView;
