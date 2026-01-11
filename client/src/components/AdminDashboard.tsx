import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import ClubMembers from './ClubMembers';
import Attendance from './Attendance';
import FileManager from './FileManager';

interface Audition {
  id: string;
  name: string;
  date: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  judges: string[];
  dancers: number;
  createdAt: string;
}

interface Judge {
  id: string;
  name: string;
  email: string;
  role: 'judge' | 'admin' | 'secretary';
  position: string;
  password?: string; // User's password (stored for admin visibility)
  active: boolean;
}

const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [expandedAnalytics, setExpandedAnalytics] = useState<Set<string>>(new Set());
  const [scoringFormat, setScoringFormat] = useState<'slider' | 'input' | 'checkbox'>('slider');
  const [expandedSettingsSection, setExpandedSettingsSection] = useState<string>('scoring');
  
  // Edit Mode & Custom Text Settings
  const [editMode, setEditMode] = useState<boolean>(false);
  const [customTexts, setCustomTexts] = useState({
    // Attendance Labels
    attendanceSheetTitle: 'Attendance Sheet',
    pointSheetTitle: 'Point Sheet',
    // Request Labels
    missingPracticeLabel: 'Missing Practice',
    excusedAbsenceLabel: 'Excused Absence',
    // Button Labels
    requestButtonLabel: 'Request',
    submitRequestLabel: 'Submit Request',
    // Status Labels
    pendingLabel: 'Pending',
    approvedLabel: 'Approved',
    deniedLabel: 'Denied',
    // Make-Up Labels
    makeUpSubmissionLabel: 'Make-Up Submissions',
    submitMakeUpLabel: 'Submit Make-Up Work',
    // Instructions
    absenceRequestInstructions: 'Submit proof of your make-up work to earn points back for the missed practice.',
    // Tab Names
    absenceRequestsTabLabel: 'Absence Requests',
    makeUpSubmissionsTabLabel: 'Make-Up Submissions',
  });
  
  // Comprehensive Settings State
  const [auditionSettings, setAuditionSettings] = useState({
    defaultGroupSize: 5,
    autoAssignGroups: false,
    requireMinimumJudges: true,
    minimumJudgesCount: 3,
    allowMultipleSessions: true,
    defaultStatus: 'draft' as 'draft' | 'active' | 'completed',
  });
  
  const [scoringSettings, setScoringSettings] = useState({
    scoreCategories: [
      { name: 'kick', label: 'Kick', maxScore: 4, enabled: true },
      { name: 'jump', label: 'Jump', maxScore: 4, enabled: true },
      { name: 'turn', label: 'Turn', maxScore: 4, enabled: true },
      { name: 'performance', label: 'Performance', maxScore: 4, enabled: true },
      { name: 'execution', label: 'Execution', maxScore: 8, enabled: true },
      { name: 'technique', label: 'Technique', maxScore: 8, enabled: true },
    ],
    totalPossibleScore: 32,
    allowDecimalScores: true,
    showScoreBreakdown: true,
  });
  
  const [dancerSettings, setDancerSettings] = useState({
    requiredFields: ['name', 'auditionNumber', 'email', 'phone', 'shirtSize', 'previousMember'],
    shirtSizeOptions: ['XS', 'Small', 'Medium', 'Large', 'XL', 'XXL'],
    previousLevelOptions: ['Level 1', 'Level 2', 'Level 3', 'Level 4'],
    autoNumberingEnabled: false,
    autoNumberingStart: 1,
    allowSelfRegistration: true,
    requireEmailVerification: false,
    allowDuplicateAuditionNumbers: false,
  });
  
  const [attendanceSettings, setAttendanceSettings] = useState({
    pointPerPractice: 1,
    excusedAbsencePoints: 0,
    unexcusedAbsencePoints: 0,
    makeUpWorkEnabled: true,
    makeUpWorkPointsMultiplier: 1.0,
    requiredMakeUpProof: true,
    maxPointsPerPractice: 1,
    attendanceTrackingEnabled: true,
  });
  
  const [videoSettings, setVideoSettings] = useState({
    videoRecordingEnabled: true,
    maxVideoSizeMB: 500,
    allowedVideoFormats: ['webm', 'mp4', 'mov'],
    requireVideoDescription: false,
    autoGroupVideos: true,
    videoRetentionDays: 365,
    allowVideoDownload: true,
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotificationsEnabled: false,
    notifyOnNewDancer: false,
    notifyOnScoreSubmission: false,
    notifyOnAbsenceRequest: true,
    notifyOnMakeUpSubmission: true,
    adminEmail: '',
    smtpConfigured: false,
  });
  
  const [appearanceSettings, setAppearanceSettings] = useState({
    clubName: 'MSU Dance Club',
    siteTitle: 'DanceScore Pro',
    primaryColor: '#B380FF',
    secondaryColor: '#FFB3D1',
    logoUrl: '',
    showLogoInHeader: true,
    customFavicon: '',
  });
  
  const [systemSettings, setSystemSettings] = useState({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    firstDayOfWeek: 'Sunday',
    language: 'en',
    enableAnalytics: false,
    enableErrorReporting: true,
    sessionTimeoutMinutes: 60,
  });

  const [securitySettings, setSecuritySettings] = useState({
    requireEmailVerificationForLogin: true,
    emailVerificationCodeExpiryMinutes: 10,
    maxVerificationAttempts: 5,
  });

  const [emailConfigStatus, setEmailConfigStatus] = useState<{
    configured: boolean;
    testing: boolean;
    lastTestResult?: { success: boolean; message: string };
  }>({
    configured: false,
    testing: false,
  });
  
  // New Hub State
  const [activeTab, setActiveTab] = useState<'overview' | 'auditions' | 'judges' | 'dancers' | 'attendance' | 'absenceRequests' | 'makeUpSubmissions' | 'files' | 'settings'>('overview');
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [absenceRequests, setAbsenceRequests] = useState<any[]>([]);
  const [makeUpSubmissions, setMakeUpSubmissions] = useState<any[]>([]);
  const [auditions, setAuditions] = useState<Audition[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [currentAudition, setCurrentAudition] = useState<Audition | null>(null);
  const [clubMembers, setClubMembers] = useState<any[]>([]);
  const [newAudition, setNewAudition] = useState({
    name: '',
    date: '',
    judges: [] as string[]
  });
  const [newJudge, setNewJudge] = useState({
    name: '',
    email: '',
    role: 'judge' as 'judge' | 'admin' | 'secretary',
    position: ''
  });

  useEffect(() => {
    fetchSettings();
    fetchAuditions();
    fetchJudges();
    fetchClubMembers();
  }, []);

  useEffect(() => {
    if (activeTab === 'absenceRequests') {
      fetchAbsenceRequests();
    }
    if (activeTab === 'makeUpSubmissions') {
      fetchMakeUpSubmissions();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAbsenceRequests = async () => {
    try {
      const response = await api.get('/api/absence-requests');
      setAbsenceRequests(response.data);
    } catch (error) {
      console.error('Error fetching absence requests:', error);
      toast.error('Failed to load absence requests');
    }
  };

  const fetchMakeUpSubmissions = async () => {
    try {
      const response = await api.get('/api/make-up-submissions');
      setMakeUpSubmissions(response.data);
    } catch (error) {
      console.error('Error fetching make-up submissions:', error);
      toast.error('Failed to load make-up submissions');
    }
  };

  const handleReviewRequest = async (requestId: string, status: 'approved' | 'denied' | 'partial', points?: number) => {
    try {
      await api.put(`/api/absence-requests/${requestId}`, {
        status,
        finalPoints: points
      });
      
      toast.success(`Request ${status}!`);
      fetchAbsenceRequests();
      fetchClubMembers(); // Refresh club members to update points
    } catch (error) {
      console.error('Error reviewing request:', error);
      toast.error('Failed to review request');
    }
  };

  const handleReviewMakeUp = async (submissionId: string, approved: boolean, pointsAwarded: number) => {
    try {
      await api.put(`/api/make-up-submissions/${submissionId}`, {
        approved,
        pointsAwarded
      });
      
      toast.success(`Make-up submission ${approved ? 'approved' : 'denied'}!`);
      fetchMakeUpSubmissions();
      fetchClubMembers(); // Refresh club members to update points
    } catch (error) {
      console.error('Error reviewing make-up:', error);
      toast.error('Failed to review make-up submission');
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/settings');
      const settings = response.data;
      
      // Load all settings categories
      setScoringFormat(settings.scoringFormat || 'slider');
      if (settings.customTexts) {
        setCustomTexts(prev => ({ ...prev, ...settings.customTexts }));
      }
      if (settings.editMode !== undefined) {
        setEditMode(settings.editMode);
      }
      if (settings.auditionSettings) {
        setAuditionSettings(prev => ({ ...prev, ...settings.auditionSettings }));
      }
      if (settings.scoringSettings) {
        setScoringSettings(prev => ({ ...prev, ...settings.scoringSettings }));
      }
      if (settings.dancerSettings) {
        setDancerSettings(prev => ({ ...prev, ...settings.dancerSettings }));
      }
      if (settings.attendanceSettings) {
        setAttendanceSettings(prev => ({ ...prev, ...settings.attendanceSettings }));
      }
      if (settings.videoSettings) {
        setVideoSettings(prev => ({ ...prev, ...settings.videoSettings }));
      }
      if (settings.notificationSettings) {
        setNotificationSettings(prev => ({ ...prev, ...settings.notificationSettings }));
      }
      if (settings.appearanceSettings) {
        setAppearanceSettings(prev => ({ ...prev, ...settings.appearanceSettings }));
      }
      if (settings.systemSettings) {
        setSystemSettings(prev => ({ ...prev, ...settings.systemSettings }));
      }
      if (settings.securitySettings) {
        setSecuritySettings(prev => ({ ...prev, ...settings.securitySettings }));
      }
      
      // Check email configuration status
      checkEmailConfigStatus();
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const checkEmailConfigStatus = async () => {
    try {
      const response = await api.get('/api/auth/verification-required');
      setEmailConfigStatus({
        configured: response.data.emailConfigured || false,
        testing: false,
      });
    } catch (error) {
      console.error('Error checking email config status:', error);
      setEmailConfigStatus({
        configured: false,
        testing: false,
      });
    }
  };

  const testEmailConfiguration = async () => {
    setEmailConfigStatus(prev => ({ ...prev, testing: true }));
    try {
      // Call the test email configuration endpoint
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth/test-email-config`
      );
      
      if (response.data.success && response.data.emailConfigured) {
        setEmailConfigStatus({
          configured: true,
          testing: false,
          lastTestResult: {
            success: true,
            message: response.data.message || 'Email service is configured and ready to use.',
          },
        });
        toast.success(response.data.message || 'Email service is configured correctly!');
      } else {
        setEmailConfigStatus({
          configured: false,
          testing: false,
          lastTestResult: {
            success: false,
            message: response.data.message || 'Email service is not configured. Please set up SMTP environment variables.',
          },
        });
        toast.error(response.data.message || 'Email service is not configured. Check environment variables.');
      }
    } catch (error: any) {
      console.error('Error testing email configuration:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to test email configuration. Check server logs.';
      setEmailConfigStatus({
        configured: false,
        testing: false,
        lastTestResult: {
          success: false,
          message: errorMessage,
        },
      });
      toast.error(errorMessage);
    }
  };

  const handleUpdateCustomText = async (key: string, value: string) => {
    const updatedTexts = { ...customTexts, [key]: value };
    setCustomTexts(updatedTexts);
    
    try {
      await api.put('/api/settings', {
        customTexts: updatedTexts
      });
      toast.success('Text updated successfully');
    } catch (error) {
      console.error('Error updating text:', error);
      toast.error('Failed to update text');
    }
  };

  const handleToggleEditMode = async () => {
    const newEditMode = !editMode;
    setEditMode(newEditMode);
    
    try {
      await api.put('/api/settings', {
        editMode: newEditMode
      });
      toast.success(`Edit mode ${newEditMode ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling edit mode:', error);
      toast.error('Failed to toggle edit mode');
    }
  };

  const fetchAuditions = async () => {
    try {
      // Check if we have cached data (less than 2 minutes old)
      const cacheKey = 'auditions';
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(`${cacheKey}_time`);
      
      if (cachedData && cacheTime) {
        const timeDiff = Date.now() - parseInt(cacheTime);
        if (timeDiff < 120000) { // 2 minutes
          const auditionsData = JSON.parse(cachedData);
          setAuditions(auditionsData);
          const activeAudition = auditionsData?.find((a: Audition) => a.status === 'active');
          setCurrentAudition(activeAudition || auditionsData?.[0] || null);
          return;
        }
      }

      const response = await api.get('/api/auditions');
      const auditionsData = response.data || [];
      
      setAuditions(auditionsData);
      // Set current audition to the first active one, or first one if none active
      const activeAudition = auditionsData?.find((a: Audition) => a.status === 'active');
      setCurrentAudition(activeAudition || auditionsData?.[0] || null);
      
      // Cache the data
      localStorage.setItem(cacheKey, JSON.stringify(auditionsData));
      localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
      
    } catch (error) {
      console.error('Error fetching auditions:', error);
    }
  };

  const fetchJudges = async () => {
    try {
      const response = await api.get('/api/judges');
      setJudges(response.data || []);
    } catch (error) {
      console.error('Error fetching judges:', error);
    }
  };

  const fetchClubMembers = async () => {
    try {
      // Check if we have cached data (less than 5 minutes old)
      const cacheKey = 'clubMembers';
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(`${cacheKey}_time`);
      
      if (cachedData && cacheTime) {
        const timeDiff = Date.now() - parseInt(cacheTime || '0');
        if (timeDiff < 300000) { // 5 minutes
          const members = JSON.parse(cachedData || '[]');
          setClubMembers(members);
          return;
        }
      }

      const response = await api.get('/api/club-members');
      const members = response.data || [];
      
      // Sort by level first (Level 1 to Level 4), then by average score within each level
      const levelOrder = ['Level 1', 'Level 2', 'Level 3', 'Level 4'];
      members.sort((a: any, b: any) => {
        const levelA = a.assignedLevel || 'Level 4';
        const levelB = b.assignedLevel || 'Level 4';
        
        const levelIndexA = levelOrder.indexOf(levelA);
        const levelIndexB = levelOrder.indexOf(levelB);
        
        if (levelIndexA !== levelIndexB) {
          return levelIndexA - levelIndexB;
        }
        
        // Within same level, sort by average score (highest first)
        return (b.averageScore || 0) - (a.averageScore || 0);
      });
      
      setClubMembers(members);
      
      // Cache the data
      localStorage.setItem(cacheKey, JSON.stringify(members));
      localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
      
    } catch (error) {
      console.error('Error fetching club members:', error);
    }
  };

  const clearCache = () => {
    localStorage.removeItem('clubMembers');
    localStorage.removeItem('clubMembers_time');
    localStorage.removeItem('auditions');
    localStorage.removeItem('auditions_time');
    localStorage.removeItem('judges');
    localStorage.removeItem('judges_time');
    toast.success('Cache cleared successfully');
  };

  const handleScoringFormatChange = async (format: 'slider' | 'input' | 'checkbox') => {
    try {
      await api.put('/api/settings', { scoringFormat: format });
      setScoringFormat(format);
      const formatName = format === 'slider' ? 'Sliders' : format === 'input' ? 'Text Input' : 'Rubric Checkboxes';
      toast.success(`Scoring format changed to ${formatName}`);
    } catch (error) {
      toast.error('Failed to update scoring format');
    }
  };
  
  const toggleSettingsSection = (section: string) => {
    setExpandedSettingsSection(expandedSettingsSection === section ? '' : section);
  };
  
  // Helper functions to update settings
  const updateSetting = async (category: string, updates: any) => {
    try {
      await api.put('/api/settings', { [category]: updates });
      toast.success(`${category} settings updated successfully`);
      return true;
    } catch (error) {
      console.error(`Error updating ${category}:`, error);
      toast.error(`Failed to update ${category} settings`);
      return false;
    }
  };
  
  // Helper component for collapsible settings section
  const SettingsSection: React.FC<{
    title: string;
    id: string;
    description?: string;
    children: React.ReactNode;
  }> = ({ title, id, description, children }) => {
    const isExpanded = expandedSettingsSection === id;
    return (
      <div style={{ marginBottom: '1.5rem' }}>
        <div
          onClick={() => toggleSettingsSection(id)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.25rem 1.5rem',
            backgroundColor: isExpanded ? '#FFE5F1' : 'white',
            border: `2px solid ${isExpanded ? '#FFB3D1' : '#FFE5F1'}`,
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            marginBottom: isExpanded ? '1rem' : 0,
            boxShadow: isExpanded ? '0 4px 12px rgba(255, 179, 209, 0.2)' : 'none'
          }}
        >
          <div>
            <h3 style={{ margin: 0, color: '#8B6FA8', fontSize: '1.3rem', fontWeight: '700' }}>{title}</h3>
            {description && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#6B6B6B' }}>{description}</p>}
          </div>
          <span style={{ fontSize: '1.2rem', color: '#8B6FA8', transition: 'transform 0.3s ease', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            ▼
          </span>
        </div>
        {isExpanded && (
          <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #FFE5F1', boxShadow: '0 2px 8px rgba(255, 179, 209, 0.1)' }}>
            {children}
          </div>
        )}
      </div>
    );
  };
  
  // Refresh settings when settings tab is opened
  useEffect(() => {
    if (activeTab === 'settings') {
      fetchSettings(); // Refresh settings when tab is opened
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateAudition = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/auditions', newAudition);
      setAuditions(prev => [...prev, response.data]);
      setNewAudition({ name: '', date: '', judges: [] });
      toast.success('Audition created successfully');
    } catch (error) {
      toast.error('Failed to create audition');
    }
  };

  const handleAuditionStatusChange = async (auditionId: string, status: string) => {
    try {
      if (status === 'archived') {
        // Archive audition (exports data and stores in File Manager)
        const response = await api.post(`/api/archive/audition/${auditionId}`);
        toast.success('Audition archived successfully! Data exported and stored in Files.');
        fetchAuditions();
      } else {
        // Regular status change
        await api.put(`/api/auditions/${auditionId}/status`, { status });
        toast.success('Audition status updated successfully');
        fetchAuditions();
      }
    } catch (error: any) {
      console.error('Error updating audition status:', error);
      toast.error(error.response?.data?.error || 'Failed to update audition status');
    }
  };

  const handleCreateJudge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/judges', newJudge);
      setJudges(prev => [...prev, response.data]);
      setNewJudge({ name: '', email: '', role: 'judge', position: '' });
      toast.success('Judge added successfully');
    } catch (error) {
      toast.error('Failed to add judge');
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Level 1': return '#ffb3d1'; // Pastel pink
      case 'Level 2': return '#d1b3ff'; // Pastel purple
      case 'Level 3': return '#fff2b3'; // Pastel yellow
      case 'Level 4': return '#b3ffb3'; // Pastel green
      default: return '#e9ecef'; // Light gray
    }
  };

  const handleDeleteClubMember = async (memberId: string, memberName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${memberName}" from the club members database? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/api/dancers/${memberId}`);
      setClubMembers(clubMembers.filter(m => m.id !== memberId));
      
      // Invalidate cache
      localStorage.removeItem('clubMembers');
      localStorage.removeItem('clubMembers_time');
      
      toast.success(`${memberName} deleted successfully`);
    } catch (error: any) {
      console.error('Error deleting club member:', error);
      toast.error(error.response?.data?.error || 'Failed to delete club member');
    }
  };

  const handleDeleteAudition = async (auditionId: string, auditionName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${auditionName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/api/auditions/${auditionId}`);
      setAuditions(prev => prev.filter(a => a.id !== auditionId));
      
      // Invalidate cache
      localStorage.removeItem('auditions');
      localStorage.removeItem('auditions_time');
      
      toast.success(`Audition "${auditionName}" deleted successfully`);
    } catch (error) {
      toast.error('Failed to delete audition');
    }
  };

  const handleJudgeStatusChange = async (judgeId: string, active: boolean) => {
    try {
      await api.put(`/api/judges/${judgeId}/status`, { active });
      setJudges(prev => 
        prev.map(j => j.id === judgeId ? { ...j, active } : j)
      );
      toast.success(`Judge ${active ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      toast.error('Failed to update judge status');
    }
  };

  const handleDeleteJudge = async (judgeId: string, judgeName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${judgeName}? This action cannot be undone.`)) {
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const response = await api.delete(`/api/judges/${judgeId}`);
      setJudges(prev => prev.filter(j => j.id !== judgeId));
      toast.success(`${judgeName} deleted successfully`);
    } catch (error: any) {
      console.error('Error deleting judge:', error);
      toast.error(`Failed to delete judge: ${error.response?.data?.error || error.message}`);
    }
  };

  return (
    <div className="dashboard">
      {/* Club Header - Dynamic Club Name */}
      <div className="msu-header">
        <h1>{appearanceSettings.clubName || 'MSU Dance Club'}</h1>
        <p className="subtitle">DanceScore Pro - Audition Management System</p>
      </div>
      
      <div className="dashboard-header" style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', backgroundColor: '#fff', borderBottom: '2px solid #FFE5F1' }}>
        <div>
          <h1 className="dashboard-title" style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700', color: '#8B6FA8' }}>Admin Dashboard</h1>
          <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.25rem', margin: 0 }}>
            Full access for Admins and Secretaries
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => setSettingsMenuOpen(!settingsMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              borderRadius: '8px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f9fa';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div style={{ width: '24px', height: '3px', backgroundColor: '#8B6FA8', borderRadius: '2px' }}></div>
            <div style={{ width: '24px', height: '3px', backgroundColor: '#8B6FA8', borderRadius: '2px' }}></div>
            <div style={{ width: '24px', height: '3px', backgroundColor: '#8B6FA8', borderRadius: '2px' }}></div>
          </button>
          <button className="logout-button" onClick={logout}>
            Logout
          </button>
        </div>
        
        {/* Settings Menu Dropdown */}
        {settingsMenuOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: '2rem',
            backgroundColor: '#fff',
            border: '2px solid #FFE5F1',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 1000,
            minWidth: '200px',
            marginTop: '0.5rem',
            overflow: 'hidden'
          }}>
            <button
              onClick={() => {
                setActiveTab('settings');
                setSettingsMenuOpen(false);
              }}
              style={{
                width: '100%',
                padding: '1rem',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#8B6FA8',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#FFE5F1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Settings
            </button>
          </div>
        )}
      </div>
      
      {/* Widget-based Home Screen */}
      {activeTab === 'overview' && (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {/* Auditions Widget */}
            <div
              onClick={() => setActiveTab('auditions')}
              style={{
                backgroundColor: '#fff',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '2px solid #FFE5F1',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(139, 111, 168, 0.15)';
                e.currentTarget.style.borderColor = '#B380FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                e.currentTarget.style.borderColor = '#FFE5F1';
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎭</div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', fontWeight: '700', color: '#8B6FA8' }}>Auditions</h3>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#B380FF', marginBottom: '0.5rem' }}>
                {auditions.length}
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>Manage audition events</p>
            </div>

            {/* Judges Widget */}
            <div
              onClick={() => setActiveTab('judges')}
              style={{
                backgroundColor: '#fff',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '2px solid #FFE5F1',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(139, 111, 168, 0.15)';
                e.currentTarget.style.borderColor = '#B380FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                e.currentTarget.style.borderColor = '#FFE5F1';
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👨‍⚖️</div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', fontWeight: '700', color: '#8B6FA8' }}>Judges</h3>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#B380FF', marginBottom: '0.5rem' }}>
                {judges.filter(j => j.active).length}
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>Active judges: {judges.filter(j => j.active).length}</p>
            </div>

            {/* Dancers Widget */}
            <div
              onClick={() => setActiveTab('dancers')}
              style={{
                backgroundColor: '#fff',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '2px solid #FFE5F1',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(139, 111, 168, 0.15)';
                e.currentTarget.style.borderColor = '#B380FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                e.currentTarget.style.borderColor = '#FFE5F1';
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💃</div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', fontWeight: '700', color: '#8B6FA8' }}>Dancers</h3>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#B380FF', marginBottom: '0.5rem' }}>
                {clubMembers.length}
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>Manage dancer database</p>
            </div>

            {/* Attendance Widget */}
            <div
              onClick={() => setActiveTab('attendance')}
              style={{
                backgroundColor: '#fff',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '2px solid #FFE5F1',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(139, 111, 168, 0.15)';
                e.currentTarget.style.borderColor = '#B380FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                e.currentTarget.style.borderColor = '#FFE5F1';
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', fontWeight: '700', color: '#8B6FA8' }}>{customTexts.attendanceSheetTitle}</h3>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#B380FF', marginBottom: '0.5rem' }}>
                ✓
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>Track practice attendance</p>
            </div>

            {/* Absence Requests Widget */}
            <div
              onClick={() => setActiveTab('absenceRequests')}
              style={{
                backgroundColor: '#fff',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '2px solid #FFE5F1',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(139, 111, 168, 0.15)';
                e.currentTarget.style.borderColor = '#B380FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                e.currentTarget.style.borderColor = '#FFE5F1';
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📝</div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', fontWeight: '700', color: '#8B6FA8' }}>{customTexts.absenceRequestsTabLabel}</h3>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#B380FF', marginBottom: '0.5rem' }}>
                {absenceRequests.length}
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>Review absence requests</p>
            </div>

            {/* Make-Up Submissions Widget */}
            <div
              onClick={() => setActiveTab('makeUpSubmissions')}
              style={{
                backgroundColor: '#fff',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '2px solid #FFE5F1',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(139, 111, 168, 0.15)';
                e.currentTarget.style.borderColor = '#B380FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                e.currentTarget.style.borderColor = '#FFE5F1';
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📎</div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', fontWeight: '700', color: '#8B6FA8' }}>{customTexts.makeUpSubmissionsTabLabel}</h3>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#B380FF', marginBottom: '0.5rem' }}>
                {makeUpSubmissions.length}
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>Review make-up work</p>
            </div>

            {/* Files Widget */}
            <div
              onClick={() => setActiveTab('files')}
              style={{
                backgroundColor: '#fff',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '2px solid #FFE5F1',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(139, 111, 168, 0.15)';
                e.currentTarget.style.borderColor = '#B380FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                e.currentTarget.style.borderColor = '#FFE5F1';
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📁</div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', fontWeight: '700', color: '#8B6FA8' }}>Files</h3>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#B380FF', marginBottom: '0.5rem' }}>
                📄
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>Manage files and archives</p>
            </div>
          </div>

          {/* Back to Home Button (when on other tabs) */}
          {activeTab !== 'overview' && (
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <button
                onClick={() => setActiveTab('overview')}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#8B7FB8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#B380FF';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#8B7FB8';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                ← Back to Home
              </button>
            </div>
          )}
        </div>
      )}
      
      <div className="dashboard-content">
        <div className="admin-dashboard">
          
          
          {/* Auditions Tab */}
          {activeTab === 'auditions' && (
            <div>
              <div className="admin-section">
                <h3>Create New Audition</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                      Audition Name
                    </label>
              <input
                type="text"
                      className="form-input"
                      placeholder="e.g., Spring 2025 Audition"
                      value={newAudition.name}
                      onChange={(e) => setNewAudition({ ...newAudition, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                      Date
                    </label>
              <input
                      type="date"
                      className="form-input"
                      value={newAudition.date}
                      onChange={(e) => setNewAudition({ ...newAudition, date: e.target.value })}
                    />
                  </div>
                </div>
                <button
                  className="add-dancer-button"
                  onClick={handleCreateAudition}
                >
                  Create Audition
                </button>
              </div>
              
              <div className="admin-section">
                <h3>All Auditions</h3>
                {auditions.length === 0 ? (
                  <p style={{ color: '#6c757d', fontStyle: 'italic' }}>No auditions created yet.</p>
                ) : (
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Dancers</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditions.map(audition => (
                        <tr key={audition.id}>
                          <td>
                            <a
                              href={`/audition/${audition.id}`}
                              style={{
                                color: '#B380FF',
                                fontWeight: '700',
                                textDecoration: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.textDecoration = 'underline';
                                e.currentTarget.style.color = '#FFB3D1';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.textDecoration = 'none';
                                e.currentTarget.style.color = '#B380FF';
                              }}
                            >
                              {audition.name}
                            </a>
                          </td>
                          <td>{new Date(audition.date).toLocaleDateString()}</td>
                          <td>
                            <span style={{
                              padding: '0.5rem 1rem',
                              borderRadius: '12px',
                              fontSize: '0.85rem',
                              fontWeight: '700',
                              backgroundColor: 
                                audition.status === 'active' ? '#FFE5B3' :
                                audition.status === 'completed' ? '#F0E6FF' :
                                audition.status === 'archived' ? '#E0D4F7' : '#FFF9E5',
                              color:
                                audition.status === 'active' ? '#8B6FA8' :
                                audition.status === 'completed' ? '#8B6FA8' :
                                audition.status === 'archived' ? '#6B6B6B' : '#8B6FA8',
                              border: `2px solid ${
                                audition.status === 'active' ? '#FFC4A3' :
                                audition.status === 'completed' ? '#D1B3FF' :
                                audition.status === 'archived' ? '#D1B3FF' : '#FFE5B3'
                              }`
                            }}>
                              {audition.status.toUpperCase()}
                            </span>
                          </td>
                          <td>{audition.dancers}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              <button
                                onClick={() => navigate(`/audition/${audition.id}`)}
                                style={{
                                  padding: '0.625rem 1.25rem',
                                  borderRadius: '12px',
                                  border: 'none',
                                  background: 'linear-gradient(135deg, #D1B3FF 0%, #FFB3D1 100%)',
                                  color: 'white',
                                  fontSize: '0.9rem',
                                  cursor: 'pointer',
                                  fontWeight: '700',
                                  transition: 'all 0.3s ease',
                                  boxShadow: '0 2px 8px rgba(179, 128, 255, 0.25)'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(179, 128, 255, 0.35)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(179, 128, 255, 0.25)';
                                }}
                              >
                                View Details
                              </button>
                              {audition.status === 'active' && (
                                <button
                                  onClick={() => navigate(`/recording/${audition.id}`)}
                                  style={{
                                    padding: '0.625rem 1.25rem',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #FFB3D1 0%, #FFC4A3 100%)',
                                    color: 'white',
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    fontWeight: '700',
                                    transition: 'all 0.3s ease',
                                    boxShadow: '0 2px 8px rgba(255, 179, 209, 0.25)'
                                  }}
                                  title="Record video for this audition"
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 179, 209, 0.35)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 179, 209, 0.25)';
                                  }}
                                >
                                  Record Video
                                </button>
                              )}
              <select
                value={audition.status}
                onChange={(e) => handleAuditionStatusChange(audition.id, e.target.value as any)}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.25rem',
                  border: '1px solid #ced4da',
                  fontSize: '0.9rem'
                }}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archive (Exports & Stores)</option>
              </select>
                              <button
                                onClick={() => handleDeleteAudition(audition.id, audition.name)}
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
          </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
          
          {/* Judges Tab */}
          {activeTab === 'judges' && (
            <div>
          <div className="admin-section">
                <h3>Add New Judge</h3>
                <p style={{ fontSize: '0.9rem', color: '#8b7fb8', marginBottom: '1.5rem', fontStyle: 'italic' }}>
                  All judges can score dancers. Admins and Secretaries have full access to manage auditions, dancers, and all settings.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                      Name
                    </label>
              <input
                      type="text"
                      className="form-input"
                      placeholder="Judge name"
                      value={newJudge.name}
                      onChange={(e) => setNewJudge({ ...newJudge, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="judge@example.com"
                      value={newJudge.email}
                      onChange={(e) => setNewJudge({ ...newJudge, email: e.target.value })}
                    />
            </div>
          </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                      Role
                    </label>
                    <select
                      className="form-input"
                      value={newJudge.role}
                      onChange={(e) => setNewJudge({ ...newJudge, role: e.target.value as any })}
                    >
                      <option value="judge">Judge Only</option>
                      <option value="admin">Judge + Admin Access</option>
                      <option value="secretary">Secretary (Full Admin Access)</option>
                    </select>
                    <p style={{ fontSize: '0.8rem', color: '#8b7fb8', marginTop: '0.25rem', marginBottom: '0' }}>
                      Admin/Secretary = Full edit access to all features
                    </p>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                      Position
                    </label>
                    <select
                      className="form-input"
                      value={newJudge.position}
                      onChange={(e) => setNewJudge({ ...newJudge, position: e.target.value })}
                    >
                      <option value="">Select Position</option>
                      <option value="President">President (Admin Role)</option>
                      <option value="Vice President">Vice President (Admin Role)</option>
                      <option value="Secretary">Secretary (Admin Role)</option>
                      <option value="Historian">Historian</option>
                      <option value="Level 1 Coordinator">Level 1 Coordinator</option>
                      <option value="Level 2 Coordinator">Level 2 Coordinator</option>
                      <option value="Level 3 Coordinator">Level 3 Coordinator</option>
                      <option value="Level 4 Coordinator">Level 4 Coordinator</option>
                      <option value="Extra Dance Coordinator">Extra Dance Coordinator</option>
                      <option value="Special Events">Special Events</option>
                      <option value="Treasurer">Treasurer</option>
                    </select>
                  </div>
                </div>
              <button 
                className="add-dancer-button"
                  onClick={handleCreateJudge}
              >
                  Add Judge
              </button>
              </div>
              
              <div className="admin-section">
                <h3>All Judges</h3>
                {judges.length === 0 ? (
                  <p style={{ color: '#6c757d', fontStyle: 'italic' }}>No judges registered yet.</p>
                ) : (
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Position</th>
                        <th>Password</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {judges.map(judge => (
                        <tr key={judge.id}>
                          <td>{judge.name}</td>
                          <td>{judge.email}</td>
                          <td>{judge.position || '-'}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                            {judge.password || judge.position || '-'}
                          </td>
                          <td>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              backgroundColor: (judge.role === 'admin' || judge.role === 'secretary') ? '#e7f3ff' : '#f8f9fa',
                              color: (judge.role === 'admin' || judge.role === 'secretary') ? '#667eea' : '#495057'
                            }}>
                              {judge.role.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              backgroundColor: judge.active ? '#d4edda' : '#f8d7da',
                              color: judge.active ? '#155724' : '#721c24'
                            }}>
                              {judge.active ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                                onClick={() => handleJudgeStatusChange(judge.id, !judge.active)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.25rem',
                                  border: 'none',
                                  backgroundColor: judge.active ? '#dc3545' : '#28a745',
                                  color: 'white',
                                  fontSize: '0.85rem',
                  cursor: 'pointer',
                                  fontWeight: '600'
                }}
              >
                                {judge.active ? 'Deactivate' : 'Activate'}
              </button>
              <button
                                onClick={() => handleDeleteJudge(judge.id, judge.name)}
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
            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
          </div>
            </div>
          )}

          {/* Dancers Tab - Now Club Members Database */}
          {activeTab === 'dancers' && (
            <ClubMembers 
              clubMembers={clubMembers}
              onDeleteMember={handleDeleteClubMember}
              getLevelColor={getLevelColor}
            />
          )}
          
          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <Attendance />
          )}
          
          {/* Absence Requests Tab */}
          {activeTab === 'absenceRequests' && (
            <div className="admin-section">
              <h2>Absence Requests Pending Review</h2>
              
              {absenceRequests.length === 0 ? (
                <div style={{ 
                  backgroundColor: '#f8f9fa', 
                  border: '1px solid #dee2e6', 
                  borderRadius: '0.5rem', 
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#6c757d'
                }}>
                  <h3>No Absence Requests</h3>
                  <p>All absence requests have been reviewed.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {absenceRequests.map(request => (
                    <div 
                      key={request.id}
                      style={{
                        backgroundColor: 'white',
                        border: `2px solid ${request.status === 'pending' ? '#ffc107' : request.status === 'approved' ? '#28a745' : '#dc3545'}`,
                        borderRadius: '0.5rem',
                        padding: '1.5rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                        <div>
                          <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
                            {request.dancerName} - {request.dancerLevel}
                          </h3>
                          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                            Event: {request.eventName || 'Event'}
                          </p>
                          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                            Type: {request.requestType === 'excused' ? 'Excused Absence' : 'Missing Practice'}
                          </p>
                          <p style={{ margin: '0.5rem 0 0 0', color: '#6c757d', fontSize: '0.85rem' }}>
                            Submitted: {new Date(request.submittedAt?.seconds * 1000 || Date.now()).toLocaleString()}
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
                      
                      <div style={{ 
                        backgroundColor: '#f8f9fa', 
                        padding: '1rem', 
                        borderRadius: '0.5rem',
                        marginBottom: '1rem'
                      }}>
                        <strong>Reason:</strong>
                        <p style={{ margin: '0.5rem 0 0 0', color: '#333' }}>
                          {request.reason}
                        </p>
                      </div>

                      {request.proofUrl && (
                        <div style={{ marginBottom: '1rem' }}>
                          <strong>Proof:</strong>
                          <img 
                            src={request.proofUrl} 
                            alt="Proof document" 
                            style={{ 
                              maxWidth: '100%', 
                              marginTop: '0.5rem', 
                              borderRadius: '0.25rem',
                              border: '1px solid #dee2e6'
                            }} 
                          />
                        </div>
                      )}

                      {request.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                          {request.requestType === 'missing' ? (
                            // Missing requests: Can only approve (-1 point, pending make-up)
                            <button
                              onClick={() => handleReviewRequest(request.id, 'approved', -1)}
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                backgroundColor: '#fd7e14',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                                fontWeight: '600'
                              }}
                            >
                              Approve Missing (-1 pt, pending make-up)
                            </button>
                          ) : (
                            // Excused requests: Can approve (0 points), partial (0 points), or deny (-1 point)
                            <>
                              <button
                                onClick={() => handleReviewRequest(request.id, 'approved', 0)}
                                style={{
                                  flex: 1,
                                  padding: '0.75rem',
                                  backgroundColor: '#28a745',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '0.25rem',
                                  cursor: 'pointer',
                                  fontWeight: '600',
                                  marginBottom: '0.5rem'
                                }}
                              >
                                Approve Excused (0 pts, can earn 2 make-up)
                              </button>
                              <button
                                onClick={() => handleReviewRequest(request.id, 'partial', 0)}
                                style={{
                                  flex: 1,
                                  padding: '0.75rem',
                                  backgroundColor: '#ffc107',
                                  color: '#333',
                                  border: 'none',
                                  borderRadius: '0.25rem',
                                  cursor: 'pointer',
                                  fontWeight: '600',
                                  marginBottom: '0.5rem'
                                }}
                              >
                                Partial (0 pts, can earn 1 make-up)
                              </button>
                              <button
                                onClick={() => handleReviewRequest(request.id, 'denied', -1)}
                                style={{
                                  flex: 1,
                                  padding: '0.75rem',
                                  backgroundColor: '#dc3545',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '0.25rem',
                                  cursor: 'pointer',
                                  fontWeight: '600'
                                }}
                              >
                                Deny (-1 pt, can earn 1 make-up)
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <FileManager />
          )}
          
          {/* Make-Up Submissions Tab */}
          {activeTab === 'makeUpSubmissions' && (
            <div className="admin-section">
              <h2>Make-Up Submissions</h2>
              
              {makeUpSubmissions.length === 0 ? (
                <div style={{ 
                  backgroundColor: '#f8f9fa', 
                  border: '1px solid #dee2e6', 
                  borderRadius: '0.5rem', 
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#6c757d'
                }}>
                  <h3>No Make-Up Submissions</h3>
                  <p>No make-up submissions have been submitted yet.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {makeUpSubmissions.map(submission => (
                    <div 
                      key={submission.id}
                      style={{
                        backgroundColor: 'white',
                        border: `2px solid ${submission.status === 'pending' ? '#ffc107' : submission.approved ? '#28a745' : '#dc3545'}`,
                        borderRadius: '0.5rem',
                        padding: '1.5rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                        <div>
                          <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
                            {submission.dancerName} - {submission.dancerLevel}
                          </h3>
                          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                            Event: {submission.eventName || 'Event'}
                          </p>
                          {submission.absenceRequest && (
                            <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>
                              Absence Type: {submission.absenceRequest.requestType === 'excused' ? 'Excused Absence' : 'Missing Practice'}
                            </p>
                          )}
                          <p style={{ margin: '0.5rem 0 0 0', color: '#6c757d', fontSize: '0.85rem' }}>
                            Submitted: {new Date(submission.submittedAt?.seconds * 1000 || Date.now()).toLocaleString()}
                          </p>
                        </div>
                        <span style={{
                          backgroundColor: submission.status === 'pending' ? '#ffc107' : submission.approved ? '#28a745' : '#dc3545',
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
                        <div style={{ marginBottom: '1rem' }}>
                          <strong>Make-Up Proof:</strong>
                          <div style={{ marginTop: '0.5rem' }}>
                            {submission.makeUpUrl.startsWith('data:image') ? (
                              <img 
                                src={submission.makeUpUrl} 
                                alt="Make-up proof" 
                                style={{ 
                                  maxWidth: '100%', 
                                  borderRadius: '0.25rem',
                                  border: '1px solid #dee2e6'
                                }}
                              />
                            ) : (
                              <a href={submission.makeUpUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>
                                View File
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      <div style={{ 
                        backgroundColor: '#f8f9fa', 
                        padding: '1rem', 
                        borderRadius: '0.5rem',
                        marginBottom: '1rem'
                      }}>
                        <strong>Sent to Coordinator:</strong>
                        <p style={{ margin: '0.5rem 0 0 0', color: '#333' }}>
                          {submission.sentToCoordinator ? 'Yes' : 'No'}
                        </p>
                      </div>

                      {submission.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                          <input
                            type="number"
                            placeholder="Points to award (usually 1-2)"
                            min="0"
                            max="10"
                            defaultValue={1}
                            id={`points-${submission.id}`}
                            style={{
                              padding: '0.75rem',
                              border: '2px solid #dee2e6',
                              borderRadius: '0.25rem',
                              fontSize: '1rem'
                            }}
                          />
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => {
                                const pointsInput = document.getElementById(`points-${submission.id}`) as HTMLInputElement;
                                const points = parseInt(pointsInput?.value || '1');
                                handleReviewMakeUp(submission.id, true, points);
                              }}
                              style={{
                                flex: 1,
                                padding: '0.75rem',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                                fontWeight: '600'
                              }}
                            >
                              Approve Make-Up
                            </button>
                            <button
                              onClick={() => handleReviewMakeUp(submission.id, false, 0)}
                              style={{
                                flex: 1,
                                padding: '0.75rem',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                                fontWeight: '600'
                              }}
                            >
                              Deny Make-Up
                            </button>
                          </div>
                        </div>
                      )}

                      {submission.status === 'approved' && (
                        <div style={{
                          backgroundColor: '#d4edda',
                          border: '1px solid #c3e6cb',
                          color: '#155724',
                          padding: '0.75rem',
                          borderRadius: '0.25rem',
                          fontWeight: '600'
                        }}>
                          Approved - {submission.pointsAwarded || 0} point(s) awarded
                        </div>
                      )}

                      {submission.status === 'denied' && (
                        <div style={{
                          backgroundColor: '#f8d7da',
                          border: '1px solid #f5c6cb',
                          color: '#721c24',
                          padding: '0.75rem',
                          borderRadius: '0.25rem',
                          fontWeight: '600'
                        }}>
                          Denied - No points awarded
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Settings Tab - Comprehensive Settings */}
          {activeTab === 'settings' && (
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#8B6FA8', marginBottom: '0.5rem' }}>Settings</h1>
                <p style={{ fontSize: '1rem', color: '#6B6B6B' }}>Configure all aspects of your audition management system</p>
              </div>

              {/* 1. Scoring & Rubric Settings */}
              <SettingsSection
                id="scoring"
                title="Scoring & Rubric Settings"
                description="Configure how judges score dancers and rubric criteria"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.75rem 0', color: '#8B6FA8', fontSize: '1.1rem', fontWeight: '700' }}>Scoring Format</h4>
                    <p style={{ fontSize: '0.9rem', color: '#6B6B6B', marginBottom: '1rem' }}>
                      Select how judges will enter scores. This will apply to all judges immediately.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleScoringFormatChange('slider')}
                        style={{
                          padding: '0.875rem 1.75rem',
                          background: scoringFormat === 'slider' ? 'linear-gradient(135deg, #D1B3FF 0%, #FFB3D1 100%)' : 'white',
                          color: scoringFormat === 'slider' ? 'white' : '#8B6FA8',
                          border: `2px solid ${scoringFormat === 'slider' ? '#B380FF' : '#FFE5F1'}`,
                          borderRadius: '12px',
                          cursor: 'pointer',
                          fontSize: '0.95rem',
                          fontWeight: '700',
                          transition: 'all 0.3s ease',
                          boxShadow: scoringFormat === 'slider' ? '0 4px 12px rgba(179, 128, 255, 0.3)' : 'none'
                        }}
                      >
                        Format 1: Sliders
                      </button>
                      <button
                        onClick={() => handleScoringFormatChange('input')}
                        style={{
                          padding: '0.875rem 1.75rem',
                          background: scoringFormat === 'input' ? 'linear-gradient(135deg, #D1B3FF 0%, #FFB3D1 100%)' : 'white',
                          color: scoringFormat === 'input' ? 'white' : '#8B6FA8',
                          border: `2px solid ${scoringFormat === 'input' ? '#B380FF' : '#FFE5F1'}`,
                          borderRadius: '12px',
                          cursor: 'pointer',
                          fontSize: '0.95rem',
                          fontWeight: '700',
                          transition: 'all 0.3s ease',
                          boxShadow: scoringFormat === 'input' ? '0 4px 12px rgba(179, 128, 255, 0.3)' : 'none'
                        }}
                      >
                        Format 2: Text Input
                      </button>
                      <button
                        onClick={() => handleScoringFormatChange('checkbox')}
                        style={{
                          padding: '0.875rem 1.75rem',
                          background: scoringFormat === 'checkbox' ? 'linear-gradient(135deg, #D1B3FF 0%, #FFB3D1 100%)' : 'white',
                          color: scoringFormat === 'checkbox' ? 'white' : '#8B6FA8',
                          border: `2px solid ${scoringFormat === 'checkbox' ? '#B380FF' : '#FFE5F1'}`,
                          borderRadius: '12px',
                          cursor: 'pointer',
                          fontSize: '0.95rem',
                          fontWeight: '700',
                          transition: 'all 0.3s ease',
                          boxShadow: scoringFormat === 'checkbox' ? '0 4px 12px rgba(179, 128, 255, 0.3)' : 'none'
                        }}
                      >
                        Format 3: Rubric Checkboxes
                      </button>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: '#FFE5F1', borderRadius: '12px', border: '1px solid #FFB3D1' }}>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#8B6FA8', fontWeight: '600' }}>
                        <strong>Current Format:</strong> {scoringFormat === 'slider' ? 'Sliders (0-10 scale)' : 
                         scoringFormat === 'input' ? 'Text Input (0-10 scale)' : 
                         'Rubric Checkboxes (0-4 scale)'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 0.75rem 0', color: '#8B6FA8', fontSize: '1.1rem', fontWeight: '700' }}>Score Categories</h4>
                    <p style={{ fontSize: '0.9rem', color: '#6B6B6B', marginBottom: '1rem' }}>
                      Configure scoring categories and maximum scores. Total possible score: 32 points.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                      {scoringSettings.scoreCategories.map((category) => (
                        <div key={category.name} style={{ padding: '1rem', backgroundColor: '#FFE5F1', borderRadius: '12px', border: '1px solid #FFB3D1' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '600', color: '#8B6FA8' }}>
                              <input
                                type="checkbox"
                                checked={category.enabled}
                                onChange={async (e) => {
                                  const updated = scoringSettings.scoreCategories.map(c =>
                                    c.name === category.name ? { ...c, enabled: e.target.checked } : c
                                  );
                                  setScoringSettings({ ...scoringSettings, scoreCategories: updated });
                                  await updateSetting('scoringSettings', { ...scoringSettings, scoreCategories: updated });
                                }}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                              />
                              {category.label}
                            </label>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.85rem', color: '#6B6B6B', fontWeight: '600' }}>Max Score:</label>
                            <input
                              type="number"
                              value={category.maxScore}
                              min="1"
                              max="10"
                              onChange={async (e) => {
                                const newMaxScore = parseInt(e.target.value) || category.maxScore;
                                const updated = scoringSettings.scoreCategories.map(c =>
                                  c.name === category.name ? { ...c, maxScore: newMaxScore } : c
                                );
                                const totalPossible = updated.reduce((sum, c) => sum + (c.enabled ? c.maxScore : 0), 0);
                                setScoringSettings({ ...scoringSettings, scoreCategories: updated, totalPossibleScore: totalPossible });
                                await updateSetting('scoringSettings', { ...scoringSettings, scoreCategories: updated, totalPossibleScore: totalPossible });
                              }}
                              style={{
                                width: '80px',
                                padding: '0.5rem',
                                border: '1px solid #FFB3D1',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                color: '#8B6FA8'
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#FFF9E5', borderRadius: '12px', border: '1px solid #FFE5B3' }}>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#8B6FA8', fontWeight: '600' }}>
                        <strong>Total Possible Score:</strong> {scoringSettings.scoreCategories.filter(c => c.enabled).reduce((sum, c) => sum + c.maxScore, 0)} points
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '1rem', backgroundColor: '#FFE5F1', borderRadius: '12px', border: '1px solid #FFB3D1' }}>
                      <input
                        type="checkbox"
                        checked={scoringSettings.allowDecimalScores}
                        onChange={async (e) => {
                          const updated = { ...scoringSettings, allowDecimalScores: e.target.checked };
                          setScoringSettings(updated);
                          await updateSetting('scoringSettings', updated);
                        }}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: '600', color: '#8B6FA8' }}>Allow Decimal Scores</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '1rem', backgroundColor: '#FFE5F1', borderRadius: '12px', border: '1px solid #FFB3D1' }}>
                      <input
                        type="checkbox"
                        checked={scoringSettings.showScoreBreakdown}
                        onChange={async (e) => {
                          const updated = { ...scoringSettings, showScoreBreakdown: e.target.checked };
                          setScoringSettings(updated);
                          await updateSetting('scoringSettings', updated);
                        }}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: '600', color: '#8B6FA8' }}>Show Score Breakdown</span>
                    </label>
                  </div>
                </div>
              </SettingsSection>

              {/* 2. Audition Settings */}
              <SettingsSection
                id="audition"
                title="Audition Settings"
                description="Configure default audition behavior and group management"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#8B6FA8' }}>Default Group Size</label>
                      <input
                        type="number"
                        value={auditionSettings.defaultGroupSize}
                        min="1"
                        max="20"
                        onChange={async (e) => {
                          const updated = { ...auditionSettings, defaultGroupSize: parseInt(e.target.value) || 5 };
                          setAuditionSettings(updated);
                          await updateSetting('auditionSettings', updated);
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #FFB3D1',
                          borderRadius: '12px',
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#8B6FA8'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#8B6FA8' }}>Minimum Judges Required</label>
                      <input
                        type="number"
                        value={auditionSettings.minimumJudgesCount}
                        min="1"
                        max="20"
                        onChange={async (e) => {
                          const updated = { ...auditionSettings, minimumJudgesCount: parseInt(e.target.value) || 3 };
                          setAuditionSettings(updated);
                          await updateSetting('auditionSettings', updated);
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #FFB3D1',
                          borderRadius: '12px',
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#8B6FA8'
                        }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '1rem', backgroundColor: '#FFE5F1', borderRadius: '12px', border: '1px solid #FFB3D1' }}>
                      <input
                        type="checkbox"
                        checked={auditionSettings.autoAssignGroups}
                        onChange={async (e) => {
                          const updated = { ...auditionSettings, autoAssignGroups: e.target.checked };
                          setAuditionSettings(updated);
                          await updateSetting('auditionSettings', updated);
                        }}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: '600', color: '#8B6FA8' }}>Auto-Assign Groups</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '1rem', backgroundColor: '#FFE5F1', borderRadius: '12px', border: '1px solid #FFB3D1' }}>
                      <input
                        type="checkbox"
                        checked={auditionSettings.requireMinimumJudges}
                        onChange={async (e) => {
                          const updated = { ...auditionSettings, requireMinimumJudges: e.target.checked };
                          setAuditionSettings(updated);
                          await updateSetting('auditionSettings', updated);
                        }}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: '600', color: '#8B6FA8' }}>Require Minimum Judges</span>
                    </label>
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#8B6FA8' }}>Default Audition Status</label>
                    <select
                      value={auditionSettings.defaultStatus}
                      onChange={async (e) => {
                        const updated = { ...auditionSettings, defaultStatus: e.target.value as any };
                        setAuditionSettings(updated);
                        await updateSetting('auditionSettings', updated);
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #FFB3D1',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#8B6FA8',
                        backgroundColor: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              </SettingsSection>

              {/* 3. Dancer Registration Settings */}
              <SettingsSection
                id="dancer"
                title="Dancer Registration Settings"
                description="Configure dancer registration fields and validation rules"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.75rem 0', color: '#8B6FA8', fontSize: '1.1rem', fontWeight: '700' }}>Required Fields</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                      {['name', 'auditionNumber', 'email', 'phone', 'shirtSize', 'previousMember'].map((field) => (
                        <label key={field} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem', backgroundColor: '#FFE5F1', borderRadius: '12px', border: '1px solid #FFB3D1' }}>
                          <input
                            type="checkbox"
                            checked={dancerSettings.requiredFields.includes(field)}
                            onChange={async (e) => {
                              const updated = e.target.checked
                                ? [...dancerSettings.requiredFields, field]
                                : dancerSettings.requiredFields.filter(f => f !== field);
                              const newSettings = { ...dancerSettings, requiredFields: updated };
                              setDancerSettings(newSettings);
                              await updateSetting('dancerSettings', newSettings);
                            }}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <span style={{ fontWeight: '600', color: '#8B6FA8', textTransform: 'capitalize' }}>{field.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#8B6FA8' }}>Shirt Size Options (one per line)</label>
                      <textarea
                        value={dancerSettings.shirtSizeOptions.join('\n')}
                        onChange={async (e) => {
                          const options = e.target.value.split('\n').filter(s => s.trim());
                          const updated = { ...dancerSettings, shirtSizeOptions: options };
                          setDancerSettings(updated);
                          await updateSetting('dancerSettings', updated);
                        }}
                        rows={6}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #FFB3D1',
                          borderRadius: '12px',
                          fontSize: '0.95rem',
                          color: '#8B6FA8',
                          fontFamily: 'inherit',
                          resize: 'vertical'
                        }}
                        placeholder="Small&#10;Medium&#10;Large&#10;XL"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#8B6FA8' }}>Previous Level Options (one per line)</label>
                      <textarea
                        value={dancerSettings.previousLevelOptions.join('\n')}
                        onChange={async (e) => {
                          const options = e.target.value.split('\n').filter(s => s.trim());
                          const updated = { ...dancerSettings, previousLevelOptions: options };
                          setDancerSettings(updated);
                          await updateSetting('dancerSettings', updated);
                        }}
                        rows={6}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #FFB3D1',
                          borderRadius: '12px',
                          fontSize: '0.95rem',
                          color: '#8B6FA8',
                          fontFamily: 'inherit',
                          resize: 'vertical'
                        }}
                        placeholder="Level 1&#10;Level 2&#10;Level 3&#10;Level 4"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '1rem', backgroundColor: '#FFE5F1', borderRadius: '12px', border: '1px solid #FFB3D1' }}>
                      <input
                        type="checkbox"
                        checked={dancerSettings.allowSelfRegistration}
                        onChange={async (e) => {
                          const updated = { ...dancerSettings, allowSelfRegistration: e.target.checked };
                          setDancerSettings(updated);
                          await updateSetting('dancerSettings', updated);
                        }}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: '600', color: '#8B6FA8' }}>Allow Self-Registration (QR Code)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '1rem', backgroundColor: '#FFE5F1', borderRadius: '12px', border: '1px solid #FFB3D1' }}>
                      <input
                        type="checkbox"
                        checked={dancerSettings.allowDuplicateAuditionNumbers}
                        onChange={async (e) => {
                          const updated = { ...dancerSettings, allowDuplicateAuditionNumbers: e.target.checked };
                          setDancerSettings(updated);
                          await updateSetting('dancerSettings', updated);
                        }}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: '600', color: '#8B6FA8' }}>Allow Duplicate Audition Numbers</span>
                    </label>
                  </div>
                </div>
              </SettingsSection>

              {/* 4. Attendance & Points Settings */}
              <SettingsSection
                id="attendance"
                title="Attendance & Points Settings"
                description="Configure attendance tracking and point system"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#8B6FA8' }}>Points Per Practice</label>
                      <input
                        type="number"
                        value={attendanceSettings.pointPerPractice}
                        min="0"
                        step="0.5"
                        onChange={async (e) => {
                          const updated = { ...attendanceSettings, pointPerPractice: parseFloat(e.target.value) || 1 };
                          setAttendanceSettings(updated);
                          await updateSetting('attendanceSettings', updated);
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #FFB3D1',
                          borderRadius: '12px',
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#8B6FA8'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#8B6FA8' }}>Excused Absence Points</label>
                      <input
                        type="number"
                        value={attendanceSettings.excusedAbsencePoints}
                        min="0"
                        step="0.5"
                        onChange={async (e) => {
                          const updated = { ...attendanceSettings, excusedAbsencePoints: parseFloat(e.target.value) || 0 };
                          setAttendanceSettings(updated);
                          await updateSetting('attendanceSettings', updated);
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #FFB3D1',
                          borderRadius: '12px',
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#8B6FA8'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#8B6FA8' }}>Unexcused Absence Points</label>
                      <input
                        type="number"
                        value={attendanceSettings.unexcusedAbsencePoints}
                        min="0"
                        step="0.5"
                        onChange={async (e) => {
                          const updated = { ...attendanceSettings, unexcusedAbsencePoints: parseFloat(e.target.value) || 0 };
                          setAttendanceSettings(updated);
                          await updateSetting('attendanceSettings', updated);
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #FFB3D1',
                          borderRadius: '12px',
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#8B6FA8'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '1rem', backgroundColor: '#FFE5F1', borderRadius: '12px', border: '1px solid #FFB3D1' }}>
                      <input
                        type="checkbox"
                        checked={attendanceSettings.makeUpWorkEnabled}
                        onChange={async (e) => {
                          const updated = { ...attendanceSettings, makeUpWorkEnabled: e.target.checked };
                          setAttendanceSettings(updated);
                          await updateSetting('attendanceSettings', updated);
                        }}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: '600', color: '#8B6FA8' }}>Enable Make-Up Work Submissions</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '1rem', backgroundColor: '#FFE5F1', borderRadius: '12px', border: '1px solid #FFB3D1' }}>
                      <input
                        type="checkbox"
                        checked={attendanceSettings.requiredMakeUpProof}
                        onChange={async (e) => {
                          const updated = { ...attendanceSettings, requiredMakeUpProof: e.target.checked };
                          setAttendanceSettings(updated);
                          await updateSetting('attendanceSettings', updated);
                        }}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: '600', color: '#8B6FA8' }}>Require Proof for Make-Up Work</span>
                    </label>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#8B6FA8' }}>Make-Up Work Points Multiplier</label>
                    <input
                      type="number"
                      value={attendanceSettings.makeUpWorkPointsMultiplier}
                      min="0"
                      max="2"
                      step="0.1"
                      onChange={async (e) => {
                        const updated = { ...attendanceSettings, makeUpWorkPointsMultiplier: parseFloat(e.target.value) || 1.0 };
                        setAttendanceSettings(updated);
                        await updateSetting('attendanceSettings', updated);
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #FFB3D1',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#8B6FA8'
                      }}
                    />
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#6B6B6B' }}>
                      Multiplier applied to make-up work points (e.g., 1.0 = 100%, 1.5 = 150%)
                    </p>
                  </div>
                </div>
              </SettingsSection>

              {/* 5. Video & Recording Settings */}
              <SettingsSection
                id="video"
                title="Video & Recording Settings"
                description="Configure video recording and storage settings"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#8B6FA8' }}>Max Video Size (MB)</label>
                      <input
                        type="number"
                        value={videoSettings.maxVideoSizeMB}
                        min="10"
                        max="2000"
                        onChange={async (e) => {
                          const updated = { ...videoSettings, maxVideoSizeMB: parseInt(e.target.value) || 500 };
                          setVideoSettings(updated);
                          await updateSetting('videoSettings', updated);
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #FFB3D1',
                          borderRadius: '12px',
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#8B6FA8'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#8B6FA8' }}>Video Retention (Days)</label>
                      <input
                        type="number"
                        value={videoSettings.videoRetentionDays}
                        min="30"
                        max="3650"
                        onChange={async (e) => {
                          const updated = { ...videoSettings, videoRetentionDays: parseInt(e.target.value) || 365 };
                          setVideoSettings(updated);
                          await updateSetting('videoSettings', updated);
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #FFB3D1',
                          borderRadius: '12px',
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#8B6FA8'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '1rem', backgroundColor: '#FFE5F1', borderRadius: '12px', border: '1px solid #FFB3D1' }}>
                      <input
                        type="checkbox"
                        checked={videoSettings.videoRecordingEnabled}
                        onChange={async (e) => {
                          const updated = { ...videoSettings, videoRecordingEnabled: e.target.checked };
                          setVideoSettings(updated);
                          await updateSetting('videoSettings', updated);
                        }}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: '600', color: '#8B6FA8' }}>Enable Video Recording</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '1rem', backgroundColor: '#FFE5F1', borderRadius: '12px', border: '1px solid #FFB3D1' }}>
                      <input
                        type="checkbox"
                        checked={videoSettings.autoGroupVideos}
                        onChange={async (e) => {
                          const updated = { ...videoSettings, autoGroupVideos: e.target.checked };
                          setVideoSettings(updated);
                          await updateSetting('videoSettings', updated);
                        }}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: '600', color: '#8B6FA8' }}>Auto-Group Videos by Session</span>
                    </label>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#8B6FA8' }}>Allowed Video Formats (comma-separated)</label>
                    <input
                      type="text"
                      value={videoSettings.allowedVideoFormats.join(', ')}
                      onChange={async (e) => {
                        const formats = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                        const updated = { ...videoSettings, allowedVideoFormats: formats };
                        setVideoSettings(updated);
                        await updateSetting('videoSettings', updated);
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #FFB3D1',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        color: '#8B6FA8'
                      }}
                      placeholder="webm, mp4, mov"
                    />
                  </div>
                </div>
              </SettingsSection>

              {/* 6. Appearance & Branding Settings */}
              <SettingsSection
                id="appearance"
                title="Appearance & Branding"
                description="Customize the look and branding of your application"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#8B6FA8' }}>Club Name</label>
                      <input
                        type="text"
                        value={appearanceSettings.clubName}
                        onChange={async (e) => {
                          const updated = { ...appearanceSettings, clubName: e.target.value };
                          setAppearanceSettings(updated);
                          await updateSetting('appearanceSettings', updated);
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #FFB3D1',
                          borderRadius: '12px',
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#8B6FA8'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#8B6FA8' }}>Site Title</label>
                      <input
                        type="text"
                        value={appearanceSettings.siteTitle}
                        onChange={async (e) => {
                          const updated = { ...appearanceSettings, siteTitle: e.target.value };
                          setAppearanceSettings(updated);
                          await updateSetting('appearanceSettings', updated);
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #FFB3D1',
                          borderRadius: '12px',
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#8B6FA8'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#8B6FA8' }}>Primary Color</label>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="color"
                          value={appearanceSettings.primaryColor}
                          onChange={async (e) => {
                            const updated = { ...appearanceSettings, primaryColor: e.target.value };
                            setAppearanceSettings(updated);
                            await updateSetting('appearanceSettings', updated);
                          }}
                          style={{
                            width: '60px',
                            height: '45px',
                            border: '1px solid #FFB3D1',
                            borderRadius: '12px',
                            cursor: 'pointer'
                          }}
                        />
                        <input
                          type="text"
                          value={appearanceSettings.primaryColor}
                          onChange={async (e) => {
                            const updated = { ...appearanceSettings, primaryColor: e.target.value };
                            setAppearanceSettings(updated);
                            await updateSetting('appearanceSettings', updated);
                          }}
                          style={{
                            flex: 1,
                            padding: '0.75rem',
                            border: '1px solid #FFB3D1',
                            borderRadius: '12px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            color: '#8B6FA8'
                          }}
                          placeholder="#B380FF"
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#8B6FA8' }}>Secondary Color</label>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="color"
                          value={appearanceSettings.secondaryColor}
                          onChange={async (e) => {
                            const updated = { ...appearanceSettings, secondaryColor: e.target.value };
                            setAppearanceSettings(updated);
                            await updateSetting('appearanceSettings', updated);
                          }}
                          style={{
                            width: '60px',
                            height: '45px',
                            border: '1px solid #FFB3D1',
                            borderRadius: '12px',
                            cursor: 'pointer'
                          }}
                        />
                        <input
                          type="text"
                          value={appearanceSettings.secondaryColor}
                          onChange={async (e) => {
                            const updated = { ...appearanceSettings, secondaryColor: e.target.value };
                            setAppearanceSettings(updated);
                            await updateSetting('appearanceSettings', updated);
                          }}
                          style={{
                            flex: 1,
                            padding: '0.75rem',
                            border: '1px solid #FFB3D1',
                            borderRadius: '12px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            color: '#8B6FA8'
                          }}
                          placeholder="#FFB3D1"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#8B6FA8' }}>Logo URL</label>
                    <input
                      type="url"
                      value={appearanceSettings.logoUrl}
                      onChange={async (e) => {
                        const updated = { ...appearanceSettings, logoUrl: e.target.value };
                        setAppearanceSettings(updated);
                        await updateSetting('appearanceSettings', updated);
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #FFB3D1',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        color: '#8B6FA8'
                      }}
                      placeholder="https://example.com/logo.png"
                    />
                    {appearanceSettings.logoUrl && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <img src={appearanceSettings.logoUrl} alt="Logo Preview" style={{ maxHeight: '100px', borderRadius: '8px' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    )}
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '1rem', backgroundColor: '#FFE5F1', borderRadius: '12px', border: '1px solid #FFB3D1' }}>
                    <input
                      type="checkbox"
                      checked={appearanceSettings.showLogoInHeader}
                      onChange={async (e) => {
                        const updated = { ...appearanceSettings, showLogoInHeader: e.target.checked };
                        setAppearanceSettings(updated);
                        await updateSetting('appearanceSettings', updated);
                      }}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: '600', color: '#8B6FA8' }}>Show Logo in Header</span>
                  </label>
                </div>
              </SettingsSection>

              {/* 7. Notification & Email Settings */}
              <SettingsSection
                id="notifications"
                title="Notification & Email Settings"
                description="Configure email notifications and alerts"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '1rem', backgroundColor: '#FFE5F1', borderRadius: '12px', border: '1px solid #FFB3D1' }}>
                    <input
                      type="checkbox"
                      checked={notificationSettings.emailNotificationsEnabled}
                      onChange={async (e) => {
                        const updated = { ...notificationSettings, emailNotificationsEnabled: e.target.checked };
                        setNotificationSettings(updated);
                        await updateSetting('notificationSettings', updated);
                      }}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: '600', color: '#8B6FA8' }}>Enable Email Notifications</span>
                  </label>

                  {notificationSettings.emailNotificationsEnabled && (
                    <>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#8B6FA8' }}>Admin Email Address</label>
                        <input
                          type="email"
                          value={notificationSettings.adminEmail}
                          onChange={async (e) => {
                            const updated = { ...notificationSettings, adminEmail: e.target.value };
                            setNotificationSettings(updated);
                            await updateSetting('notificationSettings', updated);
                          }}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #FFB3D1',
                            borderRadius: '12px',
                            fontSize: '1rem',
                            color: '#8B6FA8'
                          }}
                          placeholder="admin@example.com"
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '1rem', backgroundColor: '#FFE5F1', borderRadius: '12px', border: '1px solid #FFB3D1' }}>
                          <input
                            type="checkbox"
                            checked={notificationSettings.notifyOnNewDancer}
                            onChange={async (e) => {
                              const updated = { ...notificationSettings, notifyOnNewDancer: e.target.checked };
                              setNotificationSettings(updated);
                              await updateSetting('notificationSettings', updated);
                            }}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <span style={{ fontWeight: '600', color: '#8B6FA8' }}>Notify on New Dancer Registration</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '1rem', backgroundColor: '#FFE5F1', borderRadius: '12px', border: '1px solid #FFB3D1' }}>
                          <input
                            type="checkbox"
                            checked={notificationSettings.notifyOnScoreSubmission}
                            onChange={async (e) => {
                              const updated = { ...notificationSettings, notifyOnScoreSubmission: e.target.checked };
                              setNotificationSettings(updated);
                              await updateSetting('notificationSettings', updated);
                            }}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <span style={{ fontWeight: '600', color: '#8B6FA8' }}>Notify on Score Submission</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '1rem', backgroundColor: '#FFE5F1', borderRadius: '12px', border: '1px solid #FFB3D1' }}>
                          <input
                            type="checkbox"
                            checked={notificationSettings.notifyOnAbsenceRequest}
                            onChange={async (e) => {
                              const updated = { ...notificationSettings, notifyOnAbsenceRequest: e.target.checked };
                              setNotificationSettings(updated);
                              await updateSetting('notificationSettings', updated);
                            }}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <span style={{ fontWeight: '600', color: '#8B6FA8' }}>Notify on Absence Request</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '1rem', backgroundColor: '#FFE5F1', borderRadius: '12px', border: '1px solid #FFB3D1' }}>
                          <input
                            type="checkbox"
                            checked={notificationSettings.notifyOnMakeUpSubmission}
                            onChange={async (e) => {
                              const updated = { ...notificationSettings, notifyOnMakeUpSubmission: e.target.checked };
                              setNotificationSettings(updated);
                              await updateSetting('notificationSettings', updated);
                            }}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <span style={{ fontWeight: '600', color: '#8B6FA8' }}>Notify on Make-Up Submission</span>
                        </label>
                      </div>

                      <div style={{ padding: '1rem', backgroundColor: '#FFF9E5', borderRadius: '12px', border: '1px solid #FFE5B3' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#8B6FA8', fontWeight: '600' }}>
                          <strong>Note:</strong> Email notifications require SMTP configuration. Contact your system administrator to set up email services.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </SettingsSection>

              {/* 8. System & General Settings */}
              <SettingsSection
                id="system"
                title="System & General Settings"
                description="Configure system preferences, timezone, and date formats"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#8B6FA8' }}>Timezone</label>
                      <select
                        value={systemSettings.timezone}
                        onChange={async (e) => {
                          const updated = { ...systemSettings, timezone: e.target.value };
                          setSystemSettings(updated);
                          await updateSetting('systemSettings', updated);
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #FFB3D1',
                          borderRadius: '12px',
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#8B6FA8',
                          backgroundColor: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="America/Phoenix">Arizona Time (MST)</option>
                        <option value="America/Anchorage">Alaska Time (AKT)</option>
                        <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#8B6FA8' }}>Date Format</label>
                      <select
                        value={systemSettings.dateFormat}
                        onChange={async (e) => {
                          const updated = { ...systemSettings, dateFormat: e.target.value };
                          setSystemSettings(updated);
                          await updateSetting('systemSettings', updated);
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #FFB3D1',
                          borderRadius: '12px',
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#8B6FA8',
                          backgroundColor: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY (UK)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#8B6FA8' }}>Time Format</label>
                      <select
                        value={systemSettings.timeFormat}
                        onChange={async (e) => {
                          const updated = { ...systemSettings, timeFormat: e.target.value };
                          setSystemSettings(updated);
                          await updateSetting('systemSettings', updated);
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #FFB3D1',
                          borderRadius: '12px',
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#8B6FA8',
                          backgroundColor: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="12h">12-hour (AM/PM)</option>
                        <option value="24h">24-hour</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#8B6FA8' }}>First Day of Week</label>
                      <select
                        value={systemSettings.firstDayOfWeek}
                        onChange={async (e) => {
                          const updated = { ...systemSettings, firstDayOfWeek: e.target.value };
                          setSystemSettings(updated);
                          await updateSetting('systemSettings', updated);
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #FFB3D1',
                          borderRadius: '12px',
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#8B6FA8',
                          backgroundColor: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="Sunday">Sunday</option>
                        <option value="Monday">Monday</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#8B6FA8' }}>Session Timeout (Minutes)</label>
                    <input
                      type="number"
                      value={systemSettings.sessionTimeoutMinutes}
                      min="5"
                      max="480"
                      onChange={async (e) => {
                        const updated = { ...systemSettings, sessionTimeoutMinutes: parseInt(e.target.value) || 60 };
                        setSystemSettings(updated);
                        await updateSetting('systemSettings', updated);
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #FFB3D1',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#8B6FA8'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '1rem', backgroundColor: '#FFE5F1', borderRadius: '12px', border: '1px solid #FFB3D1' }}>
                      <input
                        type="checkbox"
                        checked={systemSettings.enableAnalytics}
                        onChange={async (e) => {
                          const updated = { ...systemSettings, enableAnalytics: e.target.checked };
                          setSystemSettings(updated);
                          await updateSetting('systemSettings', updated);
                        }}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: '600', color: '#8B6FA8' }}>Enable Analytics Tracking</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '1rem', backgroundColor: '#FFE5F1', borderRadius: '12px', border: '1px solid #FFB3D1' }}>
                      <input
                        type="checkbox"
                        checked={systemSettings.enableErrorReporting}
                        onChange={async (e) => {
                          const updated = { ...systemSettings, enableErrorReporting: e.target.checked };
                          setSystemSettings(updated);
                          await updateSetting('systemSettings', updated);
                        }}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: '600', color: '#8B6FA8' }}>Enable Error Reporting</span>
                    </label>
                  </div>
                </div>
              </SettingsSection>

              {/* 9. Security & Authentication Settings */}
              <SettingsSection
                id="security"
                title="Security & Authentication Settings"
                description="Configure email verification (2FA) and login security"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Email Verification Toggle */}
                  <div style={{ padding: '1.5rem', backgroundColor: '#F0F9FF', borderRadius: '12px', border: '2px solid #8B7FB8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#8B6FA8', marginBottom: '0.5rem' }}>
                          Email Verification (Two-Factor Authentication)
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
                          Require email verification code for all login types (Admin, E-board Members, Dancers)
                        </p>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem 1rem', backgroundColor: securitySettings.requireEmailVerificationForLogin ? '#8B7FB8' : 'white', borderRadius: '12px', border: '2px solid #8B7FB8', transition: 'all 0.3s' }}>
                        <input
                          type="checkbox"
                          checked={securitySettings.requireEmailVerificationForLogin}
                          onChange={async (e) => {
                            const updated = { ...securitySettings, requireEmailVerificationForLogin: e.target.checked };
                            setSecuritySettings(updated);
                            await updateSetting('securitySettings', updated);
                            if (e.target.checked && !emailConfigStatus.configured) {
                              toast.error('Email service is not configured. Please set up SMTP environment variables first.');
                            }
                          }}
                          style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: '600', color: securitySettings.requireEmailVerificationForLogin ? 'white' : '#8B6FA8' }}>
                          {securitySettings.requireEmailVerificationForLogin ? 'Enabled' : 'Disabled'}
                        </span>
                      </label>
                    </div>

                    {/* Email Configuration Status */}
                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: emailConfigStatus.configured ? '#D4EDDA' : '#F8D7DA', 
                      borderRadius: '8px', 
                      border: `1px solid ${emailConfigStatus.configured ? '#28A745' : '#DC3545'}`,
                      marginBottom: '1rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: '600', color: emailConfigStatus.configured ? '#155724' : '#721C24' }}>
                            {emailConfigStatus.configured ? '✅ Email Service Configured' : '⚠️ Email Service Not Configured'}
                          </p>
                          {emailConfigStatus.lastTestResult && (
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: emailConfigStatus.configured ? '#155724' : '#721C24' }}>
                              {emailConfigStatus.lastTestResult.message}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={testEmailConfiguration}
                          disabled={emailConfigStatus.testing}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: emailConfigStatus.configured ? '#28A745' : '#DC3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: emailConfigStatus.testing ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            opacity: emailConfigStatus.testing ? 0.6 : 1
                          }}
                        >
                          {emailConfigStatus.testing ? 'Testing...' : 'Test Configuration'}
                        </button>
                      </div>
                    </div>

                    {!emailConfigStatus.configured && (
                      <div style={{ 
                        padding: '1rem', 
                        backgroundColor: '#FFF3CD', 
                        borderRadius: '8px', 
                        border: '1px solid #FFC107',
                        marginBottom: '1rem'
                      }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#856404', fontWeight: '600', marginBottom: '0.5rem' }}>
                          <strong>⚠️ Configuration Required:</strong>
                        </p>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#856404' }}>
                          To enable email verification, set the following environment variables on your server:
                        </p>
                        <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', fontSize: '0.85rem', color: '#856404' }}>
                          <li><code>SMTP_HOST</code> - Your SMTP server (e.g., smtp.gmail.com)</li>
                          <li><code>SMTP_PORT</code> - SMTP port (e.g., 587)</li>
                          <li><code>SMTP_USER</code> - Your email address</li>
                          <li><code>SMTP_PASSWORD</code> - Your email password or app password</li>
                          <li><code>SMTP_FROM</code> - Display name and email (optional)</li>
                        </ul>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#856404' }}>
                          See <code>EMAIL_VERIFICATION_SETUP.md</code> for detailed setup instructions.
                        </p>
                      </div>
                    )}

                    {securitySettings.requireEmailVerificationForLogin && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#8B6FA8' }}>
                              Code Expiry Time (Minutes)
                            </label>
                            <input
                              type="number"
                              value={securitySettings.emailVerificationCodeExpiryMinutes}
                              min="5"
                              max="60"
                              onChange={async (e) => {
                                const value = parseInt(e.target.value) || 10;
                                const updated = { ...securitySettings, emailVerificationCodeExpiryMinutes: value };
                                setSecuritySettings(updated);
                                await updateSetting('securitySettings', updated);
                              }}
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #FFB3D1',
                                borderRadius: '12px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                color: '#8B6FA8'
                              }}
                            />
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#666' }}>
                              How long verification codes remain valid (default: 10 minutes)
                            </p>
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#8B6FA8' }}>
                              Max Verification Attempts
                            </label>
                            <input
                              type="number"
                              value={securitySettings.maxVerificationAttempts}
                              min="3"
                              max="10"
                              onChange={async (e) => {
                                const value = parseInt(e.target.value) || 5;
                                const updated = { ...securitySettings, maxVerificationAttempts: value };
                                setSecuritySettings(updated);
                                await updateSetting('securitySettings', updated);
                              }}
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #FFB3D1',
                                borderRadius: '12px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                color: '#8B6FA8'
                              }}
                            />
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#666' }}>
                              Maximum failed attempts before requiring a new code (default: 5)
                            </p>
                          </div>
                        </div>

                        <div style={{ 
                          padding: '1rem', 
                          backgroundColor: '#E3F2FD', 
                          borderRadius: '8px', 
                          border: '1px solid #2196F3',
                          marginTop: '1rem'
                        }}>
                          <p style={{ margin: 0, fontSize: '0.9rem', color: '#1976D2', fontWeight: '600', marginBottom: '0.5rem' }}>
                            <strong>ℹ️ How Email Verification Works:</strong>
                          </p>
                          <ol style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', fontSize: '0.85rem', color: '#1976D2' }}>
                            <li>User enters their email and password</li>
                            <li>System sends a 6-digit verification code to their email</li>
                            <li>User enters the code to complete login</li>
                            <li>Codes expire after the configured time period</li>
                          </ol>
                          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#1976D2' }}>
                            <strong>Note:</strong> This applies to all login types: Admin, E-board Members, and Dancers. Ensure all users have valid email addresses configured.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </SettingsSection>

              {/* 10. Custom Text & Labels */}
              <SettingsSection
                id="customText"
                title="Custom Text & Labels"
                description="Customize the wording and labels throughout the application"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Edit Mode Toggle */}
                  <div style={{ 
                    padding: '1.5rem', 
                    backgroundColor: editMode ? '#FFE5F1' : '#FFF9E5',
                    borderRadius: '12px',
                    border: `2px solid ${editMode ? '#FFB3D1' : '#FFE5B3'}` 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#8B6FA8', fontSize: '1.1rem', fontWeight: '700' }}>Edit Mode</h4>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#6B6B6B' }}>
                          {editMode ? 'Enabled - You can now edit text fields throughout the app' : 'Disabled - Click to enable inline text editing'}
                        </p>
                      </div>
                      <button
                        onClick={handleToggleEditMode}
                        style={{
                          padding: '0.875rem 2rem',
                          background: editMode ? 'linear-gradient(135deg, #FFB3D1 0%, #FF8CC8 100%)' : 'linear-gradient(135deg, #FFE5B3 0%, #FFC4A3 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          fontWeight: '700',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 2px 8px rgba(255, 179, 209, 0.25)'
                        }}
                      >
                        {editMode ? 'Disable Edit Mode' : 'Enable Edit Mode'}
                      </button>
                    </div>
                  </div>

                  {/* Custom Text Fields */}
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <h4 style={{ color: '#8B6FA8', marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: '700' }}>Customize Labels</h4>
                    
                    {/* Attendance Sheet Title */}
                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: '#FFE5F1', 
                      border: '1px solid #FFB3D1', 
                      borderRadius: '12px' 
                    }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '0.95rem', color: '#8B6FA8' }}>
                        Attendance Sheet Title
                      </label>
                      <input
                        type="text"
                        value={customTexts.attendanceSheetTitle}
                        onChange={(e) => handleUpdateCustomText('attendanceSheetTitle', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #FFB3D1',
                          borderRadius: '12px',
                          fontSize: '0.95rem',
                          backgroundColor: 'white',
                          color: '#8B6FA8'
                        }}
                      />
                    </div>

                    {/* Point Sheet Title */}
                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: '#FFE5F1', 
                      border: '1px solid #FFB3D1', 
                      borderRadius: '12px' 
                    }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '0.95rem', color: '#8B6FA8' }}>
                        Point Sheet Title
                      </label>
                      <input
                        type="text"
                        value={customTexts.pointSheetTitle}
                        onChange={(e) => handleUpdateCustomText('pointSheetTitle', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #FFB3D1',
                          borderRadius: '12px',
                          fontSize: '0.95rem',
                          backgroundColor: 'white',
                          color: '#8B6FA8'
                        }}
                      />
                    </div>

                    {/* Missing Practice Label */}
                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: '#FFE5F1', 
                      border: '1px solid #FFB3D1', 
                      borderRadius: '12px' 
                    }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '0.95rem', color: '#8B6FA8' }}>
                        Missing Practice Label
                      </label>
                      <input
                        type="text"
                        value={customTexts.missingPracticeLabel}
                        onChange={(e) => handleUpdateCustomText('missingPracticeLabel', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #FFB3D1',
                          borderRadius: '12px',
                          fontSize: '0.95rem',
                          backgroundColor: 'white',
                          color: '#8B6FA8'
                        }}
                      />
                    </div>

                    {/* Excused Absence Label */}
                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: '#FFE5F1', 
                      border: '1px solid #FFB3D1', 
                      borderRadius: '12px' 
                    }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '0.95rem', color: '#8B6FA8' }}>
                        Excused Absence Label
                      </label>
                      <input
                        type="text"
                        value={customTexts.excusedAbsenceLabel}
                        onChange={(e) => handleUpdateCustomText('excusedAbsenceLabel', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #FFB3D1',
                          borderRadius: '12px',
                          fontSize: '0.95rem',
                          backgroundColor: 'white',
                          color: '#8B6FA8'
                        }}
                      />
                    </div>

                    {/* Request Button Label */}
                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: '#FFE5F1', 
                      border: '1px solid #FFB3D1', 
                      borderRadius: '12px' 
                    }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '0.95rem', color: '#8B6FA8' }}>
                        Request Button Label
                      </label>
                      <input
                        type="text"
                        value={customTexts.requestButtonLabel}
                        onChange={(e) => handleUpdateCustomText('requestButtonLabel', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #FFB3D1',
                          borderRadius: '12px',
                          fontSize: '0.95rem',
                          backgroundColor: 'white',
                          color: '#8B6FA8'
                        }}
                      />
                    </div>

                    {/* Pending/Approved/Denied Labels */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                      <div style={{ 
                        padding: '1rem', 
                        backgroundColor: '#FFE5F1', 
                        border: '1px solid #FFB3D1', 
                        borderRadius: '12px' 
                      }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '0.95rem', color: '#8B6FA8' }}>
                          Pending Label
                        </label>
                        <input
                          type="text"
                          value={customTexts.pendingLabel}
                          onChange={(e) => handleUpdateCustomText('pendingLabel', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #FFB3D1',
                            borderRadius: '12px',
                            fontSize: '0.95rem',
                            backgroundColor: 'white',
                            color: '#8B6FA8'
                          }}
                        />
                      </div>
                      <div style={{ 
                        padding: '1rem', 
                        backgroundColor: '#FFE5F1', 
                        border: '1px solid #FFB3D1', 
                        borderRadius: '12px' 
                      }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '0.95rem', color: '#8B6FA8' }}>
                          Approved Label
                        </label>
                        <input
                          type="text"
                          value={customTexts.approvedLabel}
                          onChange={(e) => handleUpdateCustomText('approvedLabel', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #FFB3D1',
                            borderRadius: '12px',
                            fontSize: '0.95rem',
                            backgroundColor: 'white',
                            color: '#8B6FA8'
                          }}
                        />
                      </div>
                      <div style={{ 
                        padding: '1rem', 
                        backgroundColor: '#FFE5F1', 
                        border: '1px solid #FFB3D1', 
                        borderRadius: '12px' 
                      }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '0.95rem', color: '#8B6FA8' }}>
                          Denied Label
                        </label>
                        <input
                          type="text"
                          value={customTexts.deniedLabel}
                          onChange={(e) => handleUpdateCustomText('deniedLabel', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #FFB3D1',
                            borderRadius: '12px',
                            fontSize: '0.95rem',
                            backgroundColor: 'white',
                            color: '#8B6FA8'
                          }}
                        />
                      </div>
                    </div>

                    {/* Tab Labels */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ 
                        padding: '1rem', 
                        backgroundColor: '#FFE5F1', 
                        border: '1px solid #FFB3D1', 
                        borderRadius: '12px' 
                      }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '0.95rem', color: '#8B6FA8' }}>
                          Absence Requests Tab Label
                        </label>
                        <input
                          type="text"
                          value={customTexts.absenceRequestsTabLabel}
                          onChange={(e) => handleUpdateCustomText('absenceRequestsTabLabel', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #FFB3D1',
                            borderRadius: '12px',
                            fontSize: '0.95rem',
                            backgroundColor: 'white',
                            color: '#8B6FA8'
                          }}
                        />
                      </div>
                      <div style={{ 
                        padding: '1rem', 
                        backgroundColor: '#FFE5F1', 
                        border: '1px solid #FFB3D1', 
                        borderRadius: '12px' 
                      }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '0.95rem', color: '#8B6FA8' }}>
                          Make-Up Submissions Tab Label
                        </label>
                        <input
                          type="text"
                          value={customTexts.makeUpSubmissionsTabLabel}
                          onChange={(e) => handleUpdateCustomText('makeUpSubmissionsTabLabel', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #FFB3D1',
                            borderRadius: '12px',
                            fontSize: '0.95rem',
                            backgroundColor: 'white',
                            color: '#8B6FA8'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </SettingsSection>

              {/* 11. Database Management & Maintenance */}
              <SettingsSection
                id="database"
                title="Database Management & Maintenance"
                description="End of season cleanup and database maintenance tools"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ 
                    padding: '1.25rem', 
                    backgroundColor: '#FFF9E5', 
                    borderRadius: '12px',
                    border: '2px solid #FFE5B3',
                    marginBottom: '0.5rem'
                  }}>
                    <p style={{ margin: 0, fontSize: '1rem', color: '#8B6FA8', fontWeight: '700' }}>
                      Warning: These actions cannot be undone. Use with extreme caution.
                    </p>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#8B6FA8', fontSize: '1.1rem', fontWeight: '700' }}>Data Cleanup</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                      <button
                        onClick={async () => {
                          if (window.confirm('Are you sure you want to clear all club members? This will remove all dancers from the club members database. This action cannot be undone.')) {
                            try {
                              await api.delete('/api/club-members/clear');
                              toast.success('Club members cleared successfully!');
                              fetchClubMembers();
                            } catch (error: any) {
                              console.error('Error clearing club members:', error);
                              toast.error('Failed to clear club members: ' + (error.response?.data?.error || error.message));
                            }
                          }
                        }}
                        style={{
                          padding: '1rem 1.5rem',
                          background: 'linear-gradient(135deg, #FFB3D1 0%, #FF8CC8 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          fontSize: '0.95rem',
                          fontWeight: '700',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 2px 8px rgba(255, 179, 209, 0.25)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 179, 209, 0.35)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 179, 209, 0.25)';
                        }}
                      >
                        Clear Club Members
                      </button>
                      
                      <button
                        onClick={async () => {
                          if (window.confirm('Are you sure you want to clear all auditions? This will remove all audition data including dancers and scores. This action cannot be undone.')) {
                            try {
                              await api.delete('/api/auditions/clear');
                              toast.success('Auditions cleared successfully!');
                              fetchAuditions();
                            } catch (error: any) {
                              console.error('Error clearing auditions:', error);
                              toast.error('Failed to clear auditions: ' + (error.response?.data?.error || error.message));
                            }
                          }
                        }}
                        style={{
                          padding: '1rem 1.5rem',
                          background: 'linear-gradient(135deg, #FFC4A3 0%, #FFB380 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          fontSize: '0.95rem',
                          fontWeight: '700',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 2px 8px rgba(255, 196, 163, 0.25)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 196, 163, 0.35)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 196, 163, 0.25)';
                        }}
                      >
                        Clear Auditions
                      </button>
                      
                      <button
                        onClick={async () => {
                          if (window.confirm('DANGER: Are you sure you want to perform a FULL RESET?\n\nThis will clear:\n- All auditions\n- All dancers\n- All club members\n- All scores\n- All attendance records\n- All videos\n\nThis will PRESERVE:\n- Judges\n- Settings\n\nThis action CANNOT be undone. Type "RESET" to confirm.')) {
                            const confirmation = window.prompt('Type "RESET" (all caps) to confirm full reset:');
                            if (confirmation === 'RESET') {
                              try {
                                await api.delete('/api/database/reset');
                                toast.success('Full reset completed successfully!');
                                fetchAuditions();
                                fetchClubMembers();
                              } catch (error: any) {
                                console.error('Error performing full reset:', error);
                                toast.error('Failed to perform full reset: ' + (error.response?.data?.error || error.message));
                              }
                            } else {
                              toast.error('Reset cancelled - confirmation text did not match');
                            }
                          }
                        }}
                        style={{
                          padding: '1rem 1.5rem',
                          background: 'linear-gradient(135deg, #D1B3FF 0%, #B380FF 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          fontSize: '0.95rem',
                          fontWeight: '700',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 2px 8px rgba(179, 128, 255, 0.25)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(179, 128, 255, 0.35)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(179, 128, 255, 0.25)';
                        }}
                      >
                        Full Reset (DANGER)
                      </button>
                    </div>
                  </div>

                  <div style={{ 
                    padding: '1.25rem', 
                    backgroundColor: '#F0E6FF', 
                    borderRadius: '12px',
                    border: '1px solid #D1B3FF'
                  }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: '#8B6FA8', fontWeight: '700' }}>
                      End of Season Tips:
                    </p>
                    <ul style={{ margin: '0', padding: '0 0 0 1.5rem', fontSize: '0.9rem', color: '#6B6B6B', lineHeight: '1.6' }}>
                      <li>Use "Clear Club Members" to remove all dancers while preserving auditions, judges, and settings for next season</li>
                      <li>Use "Clear Auditions" to remove past audition data while keeping current club members</li>
                      <li>Only use "Full Reset" when starting completely fresh - this removes almost everything</li>
                    </ul>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#8B6FA8', fontSize: '1.1rem', fontWeight: '700' }}>Cache Management</h4>
                    <button
                      onClick={clearCache}
                      style={{
                        padding: '0.875rem 1.75rem',
                        background: 'linear-gradient(135deg, #FFE5B3 0%, #FFC4A3 100%)',
                        color: '#8B6FA8',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: '700',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 8px rgba(255, 229, 179, 0.25)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 229, 179, 0.35)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 229, 179, 0.25)';
                      }}
                    >
                      Clear Browser Cache
                    </button>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#6B6B6B' }}>
                      Clears cached data to force fresh data reload from server
                    </p>
                  </div>
                </div>
              </SettingsSection>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
