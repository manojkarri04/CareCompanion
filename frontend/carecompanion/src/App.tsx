import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import HomePage from './components/HomePage';
import ChatPage from './components/ChatPage';
import AlertsPage from './components/AlertsPage';
import NotepadPage from './components/NotepadPage';
import AppointmentSchedulerPage from './components/AppointmentSchedulerPage';
import SavedDocumentsPage from './components/SavedDocumentsPage';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);

 const handleGuestLogin = () => {
    setIsAuthenticated(true);
    setIsGuestMode(true);
  };

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? (
              <Navigate to="/home" replace />
            ) : (
              <LoginPage onLogin={handleLogin} onGuestLogin={handleGuestLogin} />
            )
          } 
        />
        <Route
          path="/home"
          element={
            isAuthenticated ? (
              <HomePage isGuestMode={isGuestMode}/>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/chat"
          element={
            isAuthenticated ? (
              <ChatPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/alerts"
          element={
            isAuthenticated ? (
              <AlertsPage isGuestMode={isGuestMode}/>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/notepad"
          element={
            isAuthenticated ? (
              <NotepadPage isGuestMode={isGuestMode}/>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/saved-docs"
          element={
            isAuthenticated ? (
              <SavedDocumentsPage isGuestMode={isGuestMode}/>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/appointments"
          element={
            isAuthenticated ? (
              <AppointmentSchedulerPage isGuestMode={isGuestMode}/>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
