// This module maps directly to the Google OAuth Authentication and Guest Access functionalities. By extracting these, you isolate the grid layout and the SVG icons from the main file.  
// components/AlternativeAuth.tsx
import React from 'react';
import { UserCircle2 } from 'lucide-react';

interface AlternativeAuthProps {
  onGoogleLogin: () => void;
  onGuestLogin: () => void;
}

export default function AlternativeAuth({ onGoogleLogin, onGuestLogin }: AlternativeAuthProps) {
  const buttonStyle = {
    height: '72px', border: '1px solid #E5E7EB', borderRadius: '6px', backgroundColor: '#ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' as const,
    alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer'
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
      <button type="button" onClick={onGoogleLogin} style={buttonStyle}>
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Google</span>
      </button>

      <button type="button" onClick={onGuestLogin} style={buttonStyle}>
        <UserCircle2 size={18} color="#6B7280" />
        <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Continue as Guest</span>
      </button>
    </div>
  );
}