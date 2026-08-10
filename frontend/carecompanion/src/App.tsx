import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/Auth/LoginPage';
import HomePage from './components/home/HomePage';
import ChatPage from './components/Chat_page/ChatPage';
import AlertsPage from './components/alerts/AlertsPage';
import NotepadPage from './components/Notepad/NotepadPage';
import AppointmentSchedulerPage from './components/Appointment_Scheduler/AppointmentSchedulerPage';
import SavedDocumentsPage from './components/Saved_documents/SavedDocumentsPage';
import { AuthProvider, useAuth } from "./AuthProvider";
import ProtectedRoute from './ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

function AppRoutes() {
  const { session, loading } = useAuth();
  const [isGuestMode, setIsGuestMode] = useState(false);

  const handleGuestLogin = () => {
    setIsGuestMode(true);
  };

  const handleLogin = () => {
    setIsGuestMode(false);
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  return (
      <Routes>
        <Route path="/" element={(session || isGuestMode) ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />} />
        <Route 
          path="/login" 
          element={
            (session || isGuestMode) ? (
              <Navigate to="/home" replace />
            ) : (
              <LoginPage onLogin={handleLogin} onGuestLogin={handleGuestLogin} />
            )
          } 
        />
        <Route
          path="/home"
          element={
            <ProtectedRoute isGuestMode={isGuestMode}>
              <HomePage isGuestMode={isGuestMode} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute isGuestMode={isGuestMode}>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/alerts"
          element={
            <ProtectedRoute isGuestMode={isGuestMode}>
              <AlertsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notepad"
          element={
            <ProtectedRoute isGuestMode={isGuestMode}>
              <NotepadPage />
            </ProtectedRoute>
          }
        />
       <Route
          path="/saved-docs"
          element={
            <ProtectedRoute isGuestMode={isGuestMode}>
              <SavedDocumentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/appointments"
          element={
            <ProtectedRoute isGuestMode={isGuestMode}>
              <AppointmentSchedulerPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
  );
}
