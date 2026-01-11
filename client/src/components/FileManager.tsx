import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

interface FileItem {
  id: string;
  type: 'video' | 'makeup';
  name: string;
  filename: string;
  size: number;
  mimeType: string;
  createdAt: string | Date;
  url: string;
  path?: string;
  // Video-specific
  recordedAt?: string | Date;
  recordedBy?: string;
  auditionId?: string;
  auditionName?: string;
  group?: string;
  description?: string;
  // Make-up specific
  submittedBy?: string;
  dancerLevel?: string;
  eventId?: string;
  eventName?: string;
  status?: string;
}

interface FilesData {
  videos: FileItem[];
  makeUpSubmissions: FileItem[];
  exports: FileItem[];
}

const FileManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FilesData>({ videos: [], makeUpSubmissions: [], exports: [] });
  const [activeCategory, setActiveCategory] = useState<'all' | 'videos' | 'makeup'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/files');
      setFiles(response.data);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: string | Date): string => {
    if (!date) return 'Unknown';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString();
  };

  const getFileIcon = (mimeType: string, type: string): string => {
    if (type === 'video') return '🎥';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('word')) return '📝';
    return '📎';
  };

  const handleDelete = async (file: FileItem) => {
    if (!window.confirm(`Are you sure you want to delete "${file.name}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(file.id);
      const fileType = file.type === 'video' ? 'video' : 'makeup';
      await api.delete(`/api/files/${fileType}/${file.id}`);
      toast.success('File deleted successfully');
      fetchFiles(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file: ' + (error.response?.data?.error || error.message));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (file: FileItem) => {
    // For videos, use the stream URL with token
    // For make-up files, use the stored URL
    const token = localStorage.getItem('token');
    let url = file.url;
    
    if (file.type === 'video') {
      url = `${file.url}${file.url.includes('?') ? '&' : '?'}token=${token}`;
    }
    
    window.open(url, '_blank');
  };

  const allFiles: FileItem[] = [
    ...files.videos.map(f => ({ ...f, category: 'videos' })),
    ...files.makeUpSubmissions.map(f => ({ ...f, category: 'makeup' }))
  ].sort((a, b) => {
    const aDate = new Date(a.createdAt || a.recordedAt || 0).getTime();
    const bDate = new Date(b.createdAt || b.recordedAt || 0).getTime();
    return bDate - aDate;
  }) as FileItem[];

  const filteredFiles = activeCategory === 'all' 
    ? allFiles 
    : activeCategory === 'videos'
    ? files.videos
    : files.makeUpSubmissions;

  const totalSize = filteredFiles.reduce((sum, file) => sum + (file.size || 0), 0);

  return (
    <div className="admin-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, color: '#8B6FA8', fontSize: '1.8rem', fontWeight: '700' }}>
          File Manager
        </h2>
        <button
          onClick={fetchFiles}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: 'none',
            backgroundColor: '#B380FF',
            color: 'white',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '0.9rem'
          }}
        >
          {loading ? 'Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #FFE5F1' }}>
        {[
          { key: 'all', label: `All Files (${allFiles.length})` },
          { key: 'videos', label: `Videos (${files.videos.length})` },
          { key: 'makeup', label: `Make-Up Files (${files.makeUpSubmissions.length})` }
        ].map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key as any)}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderBottom: activeCategory === cat.key ? '3px solid #B380FF' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeCategory === cat.key ? '#B380FF' : '#666',
              cursor: 'pointer',
              fontWeight: activeCategory === cat.key ? '700' : '500',
              fontSize: '0.95rem',
              transition: 'all 0.2s ease'
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem', 
        marginBottom: '2rem' 
      }}>
        <div style={{
          padding: '1rem',
          backgroundColor: '#FFE5F1',
          borderRadius: '0.5rem',
          border: '1px solid #FFB3D1'
        }}>
          <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Total Files</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#8B6FA8' }}>
            {filteredFiles.length}
          </div>
        </div>
        <div style={{
          padding: '1rem',
          backgroundColor: '#FFE5F1',
          borderRadius: '0.5rem',
          border: '1px solid #FFB3D1'
        }}>
          <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Total Size</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#8B6FA8' }}>
            {formatFileSize(totalSize)}
          </div>
        </div>
      </div>

      {/* Files List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Loading files...</div>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No files found</div>
          <div style={{ fontSize: '0.9rem' }}>
            {activeCategory === 'all' 
              ? 'Upload videos or make-up submissions to see them here'
              : activeCategory === 'videos'
              ? 'Upload videos during auditions to see them here'
              : 'Make-up submissions will appear here'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredFiles.map(file => (
            <div
              key={`${file.type}-${file.id}`}
              style={{
                padding: '1.5rem',
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                border: '1px solid #FFE5F1',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                {/* File Icon */}
                <div style={{ 
                  fontSize: '2.5rem',
                  flexShrink: 0
                }}>
                  {getFileIcon(file.mimeType, file.type)}
                </div>

                {/* File Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    marginBottom: '0.5rem',
                    gap: '1rem'
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ 
                        margin: 0, 
                        fontSize: '1.1rem', 
                        fontWeight: '600', 
                        color: '#333',
                        wordBreak: 'break-word'
                      }}>
                        {file.name}
                      </h3>
                      <div style={{ 
                        fontSize: '0.85rem', 
                        color: '#666', 
                        marginTop: '0.25rem' 
                      }}>
                        {formatFileSize(file.size)} • {file.mimeType}
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: '0.85rem', 
                      color: '#666',
                      flexShrink: 0
                    }}>
                      {file.type === 'video' 
                        ? formatDate(file.recordedAt || file.createdAt)
                        : formatDate(file.createdAt)}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '0.75rem',
                    marginTop: '0.75rem',
                    fontSize: '0.85rem',
                    color: '#666'
                  }}>
                    {file.type === 'video' && (
                      <>
                        {file.auditionName && (
                          <span style={{ 
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#E5F3FF',
                            borderRadius: '0.25rem',
                            color: '#1976D2'
                          }}>
                            📅 {file.auditionName}
                          </span>
                        )}
                        {file.group && (
                          <span style={{ 
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#FFF3E0',
                            borderRadius: '0.25rem',
                            color: '#F57C00'
                          }}>
                            👥 Group: {file.group}
                          </span>
                        )}
                        {file.recordedBy && (
                          <span style={{ 
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#F3E5F5',
                            borderRadius: '0.25rem',
                            color: '#7B1FA2'
                          }}>
                            👤 {file.recordedBy}
                          </span>
                        )}
                        {file.description && (
                          <div style={{ 
                            width: '100%',
                            marginTop: '0.5rem',
                            padding: '0.5rem',
                            backgroundColor: '#F5F5F5',
                            borderRadius: '0.25rem',
                            fontSize: '0.85rem',
                            color: '#555'
                          }}>
                            {file.description}
                          </div>
                        )}
                      </>
                    )}
                    {file.type === 'makeup' && (
                      <>
                        {file.eventName && (
                          <span style={{ 
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#E5F3FF',
                            borderRadius: '0.25rem',
                            color: '#1976D2'
                          }}>
                            📅 {file.eventName}
                          </span>
                        )}
                        {file.submittedBy && (
                          <span style={{ 
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#F3E5F5',
                            borderRadius: '0.25rem',
                            color: '#7B1FA2'
                          }}>
                            👤 {file.submittedBy}
                          </span>
                        )}
                        {file.dancerLevel && (
                          <span style={{ 
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#FFF3E0',
                            borderRadius: '0.25rem',
                            color: '#F57C00'
                          }}>
                            🎭 {file.dancerLevel}
                          </span>
                        )}
                        {file.status && (
                          <span style={{ 
                            padding: '0.25rem 0.5rem',
                            backgroundColor: file.status === 'approved' ? '#E8F5E9' : file.status === 'denied' ? '#FFEBEE' : '#FFF3E0',
                            borderRadius: '0.25rem',
                            color: file.status === 'approved' ? '#2E7D32' : file.status === 'denied' ? '#C62828' : '#F57C00'
                          }}>
                            {file.status === 'approved' ? '✅ Approved' : file.status === 'denied' ? '❌ Denied' : '⏳ Pending'}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.5rem',
                  flexShrink: 0
                }}>
                  <button
                    onClick={() => handleDownload(file)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #B380FF',
                      backgroundColor: 'white',
                      color: '#B380FF',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#B380FF';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.color = '#B380FF';
                    }}
                  >
                    📥 View/Download
                  </button>
                  <button
                    onClick={() => handleDelete(file)}
                    disabled={deletingId === file.id}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #dc3545',
                      backgroundColor: deletingId === file.id ? '#ccc' : 'white',
                      color: deletingId === file.id ? '#666' : '#dc3545',
                      cursor: deletingId === file.id ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (deletingId !== file.id) {
                        e.currentTarget.style.backgroundColor = '#dc3545';
                        e.currentTarget.style.color = 'white';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (deletingId !== file.id) {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.color = '#dc3545';
                      }
                    }}
                  >
                    {deletingId === file.id ? '⏳ Deleting...' : '🗑️ Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileManager;