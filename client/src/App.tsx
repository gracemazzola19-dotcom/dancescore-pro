import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Landing from './components/Landing';
import Login from './components/Login';
import OrganizationSignUp from './components/OrganizationSignUp';
import JudgeDashboard from './components/JudgeDashboard';
import AdminDashboard from './components/AdminDashboard';
import DancerRegistration from './components/DancerRegistration';
import AuditionDetail from './components/AuditionDetail';
import Deliberations from './components/Deliberations';
import PublicAttendance from './components/PublicAttendance';
import AbsenceRequest from './components/AbsenceRequest';
import DancerLogin from './components/DancerLogin';
import DancerAttendance from './components/DancerAttendance';
import CoordinatorDashboard from './components/CoordinatorDashboard';
import RecordingView from './components/RecordingView';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Toaster position="top-right" />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<OrganizationSignUp />} />
            <Route path="/dancer-login" element={<DancerLogin />} />
            <Route path="/register/:auditionId" element={<DancerRegistration />} />
            <Route path="/register" element={<DancerRegistration />} />
            <Route path="/judge" element={<ProtectedRoute role="judge"><JudgeDashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/coordinator" element={<ProtectedRoute role="coordinator"><CoordinatorDashboard /></ProtectedRoute>} />
            <Route path="/dancer" element={<ProtectedRoute role="dancer"><DancerAttendance /></ProtectedRoute>} />
            <Route path="/audition/:id" element={<ProtectedRoute role="admin"><AuditionDetail /></ProtectedRoute>} />
            <Route path="/deliberations/:id" element={<ProtectedRoute role="admin"><Deliberations /></ProtectedRoute>} />
            <Route path="/recording/:id" element={<ProtectedRoute role="admin"><RecordingView /></ProtectedRoute>} />
            {/* Secretary can access all admin routes via ProtectedRoute logic */}
            <Route path="/attendance/:eventId" element={<PublicAttendance />} />
            <Route path="/absence/:eventId" element={<AbsenceRequest />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

function ProtectedRoute({ children, role }: { children: React.ReactNode; role: string }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  if (!user) {
    console.log('ProtectedRoute: No user, redirecting to login');
    return <Navigate to={role === 'dancer' ? '/dancer-login' : '/login'} />;
  }
  
  console.log('ProtectedRoute check:', { routeRole: role, userRole: user.role, user });
  
  // Allow secretary to access admin routes
  const isAdminRoute = role === 'admin';
  const canAccessAdmin = user.role === 'admin' || user.role === 'secretary';
  
  if (isAdminRoute && canAccessAdmin) {
    // Secretary and admin can access admin routes
    console.log('ProtectedRoute: Allowing admin access');
    return <>{children}</>;
  }
  
  // Allow admin, judge, eboard, and secretary roles to access judge routes
  const isJudgeRoute = role === 'judge';
  const canAccessJudge = user.role === 'judge' || user.role === 'eboard' || user.role === 'admin' || user.role === 'secretary';
  
  if (isJudgeRoute && canAccessJudge) {
    // Judge, eboard, admin, and secretary can access judge routes
    console.log('ProtectedRoute: Allowing judge access');
    return <>{children}</>;
  }
  
  // Allow coordinators (users with position containing "Coordinator") to access coordinator routes
  const isCoordinatorRoute = role === 'coordinator';
  const isCoordinator = user.position && user.position.includes('Coordinator');
  
  if (isCoordinatorRoute && isCoordinator) {
    console.log('ProtectedRoute: Allowing coordinator access');
    return <>{children}</>;
  }
  
  console.log('ProtectedRoute: Role mismatch, redirecting. Expected:', role, 'Got:', user.role);
  if (user.role !== role) {
    if (role === 'dancer') return <Navigate to="/dancer-login" />;
    if (role === 'coordinator') return <Navigate to="/login" />;
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
}

export default App;
