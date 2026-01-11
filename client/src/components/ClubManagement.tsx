import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

interface Club {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt?: any;
  isDefault?: boolean;
}

const ClubManagement: React.FC = () => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newClub, setNewClub] = useState({
    name: '',
    slug: ''
  });

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/clubs/all');
      setClubs(response.data);
    } catch (error: any) {
      console.error('Error fetching clubs:', error);
      if (error.response?.status === 403) {
        toast.error('Access denied: Admin only');
      } else {
        toast.error('Failed to fetch clubs');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newClub.name.trim() || !newClub.slug.trim()) {
      toast.error('Club name and slug are required');
      return;
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-_]+$/;
    if (!slugRegex.test(newClub.slug)) {
      toast.error('Slug must contain only lowercase letters, numbers, hyphens, and underscores');
      return;
    }

    try {
      setCreating(true);
      const response = await api.post('/api/clubs', newClub);
      toast.success(`Club "${response.data.name}" created successfully!`);
      setNewClub({ name: '', slug: '' });
      setShowCreateForm(false);
      fetchClubs(); // Refresh list
    } catch (error: any) {
      console.error('Error creating club:', error);
      const errorMsg = error.response?.data?.error || 'Failed to create club';
      toast.error(errorMsg);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (club: Club) => {
    try {
      await api.put(`/api/clubs/${club.id}`, {
        active: !club.active
      });
      toast.success(`Club ${!club.active ? 'activated' : 'deactivated'} successfully`);
      fetchClubs(); // Refresh list
    } catch (error: any) {
      console.error('Error updating club:', error);
      toast.error('Failed to update club status');
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    if (date.toDate) {
      return date.toDate().toLocaleDateString();
    }
    if (typeof date === 'string') {
      return new Date(date).toLocaleDateString();
    }
    return 'N/A';
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h2 style={{ 
            margin: 0, 
            fontSize: '1.75rem', 
            fontWeight: '700', 
            color: '#8B6FA8',
            marginBottom: '0.5rem'
          }}>
            Club Management
          </h2>
          <p style={{ 
            margin: 0, 
            color: '#666', 
            fontSize: '0.95rem' 
          }}>
            Create and manage dance clubs using this system
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#8B6FA8',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(139, 111, 168, 0.3)'
          }}
        >
          {showCreateForm ? 'Cancel' : '+ Create New Club'}
        </button>
      </div>

      {showCreateForm && (
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '2rem',
          borderRadius: '16px',
          marginBottom: '2rem',
          border: '2px solid #FFB3D1'
        }}>
          <h3 style={{ 
            marginTop: 0, 
            marginBottom: '1.5rem', 
            color: '#8B6FA8',
            fontSize: '1.25rem'
          }}>
            Create New Club
          </h3>
          <form onSubmit={handleCreateClub}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '600', 
                  color: '#8B6FA8' 
                }}>
                  Club Name *
                </label>
                <input
                  type="text"
                  value={newClub.name}
                  onChange={(e) => setNewClub({ ...newClub, name: e.target.value })}
                  placeholder="e.g., MSU Dance Club"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #FFB3D1',
                    borderRadius: '12px',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '600', 
                  color: '#8B6FA8' 
                }}>
                  Club Slug *
                </label>
                <input
                  type="text"
                  value={newClub.slug}
                  onChange={(e) => setNewClub({ ...newClub, slug: e.target.value.toLowerCase() })}
                  placeholder="e.g., msu-dance-club"
                  required
                  pattern="[a-z0-9-_]+"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #FFB3D1',
                    borderRadius: '12px',
                    fontSize: '1rem'
                  }}
                />
                <p style={{ 
                  margin: '0.5rem 0 0 0', 
                  fontSize: '0.85rem', 
                  color: '#666' 
                }}>
                  Lowercase letters, numbers, hyphens, and underscores only
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="submit"
                disabled={creating}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#8B6FA8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: creating ? 'not-allowed' : 'pointer',
                  opacity: creating ? 0.6 : 1
                }}
              >
                {creating ? 'Creating...' : 'Create Club'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewClub({ name: '', slug: '' });
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          Loading clubs...
        </div>
      ) : clubs.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem', 
          backgroundColor: '#f8f9fa',
          borderRadius: '16px',
          border: '2px dashed #FFB3D1'
        }}>
          <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '1rem' }}>
            No clubs found
          </p>
          <p style={{ color: '#999', fontSize: '0.95rem' }}>
            Create your first club to get started
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gap: '1rem'
        }}>
          {clubs.map((club) => (
            <div
              key={club.id}
              style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '16px',
                border: '2px solid #FFB3D1',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.25rem', 
                    fontWeight: '700', 
                    color: '#8B6FA8' 
                  }}>
                    {club.name}
                  </h3>
                  {club.isDefault && (
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      backgroundColor: '#B380FF',
                      color: 'white',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      Default
                    </span>
                  )}
                  {!club.active && (
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      Inactive
                    </span>
                  )}
                </div>
                <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                  <strong>Slug:</strong> {club.slug}
                </div>
                {club.createdAt && (
                  <div style={{ color: '#999', fontSize: '0.85rem' }}>
                    Created: {formatDate(club.createdAt)}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleToggleActive(club)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: club.active ? '#dc3545' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {club.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClubManagement;
