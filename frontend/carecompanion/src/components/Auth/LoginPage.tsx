'use client';

// LoginPage.tsx
import { useState } from 'react';
import { useAuth } from './useAuth';
import EmailAuthForm from './EmailAuthForm';
import AlternativeAuth from './AlternativeAuth';

interface LoginPageProps {
  onLogin: () => void;
  onGuestLogin: () => void;
}

export default function LoginPage({ onLogin, onGuestLogin }: LoginPageProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Bring in the logic from the custom hook
  const { loginWithEmail, registerWithEmail, loginWithGoogle, loading, errorMessage } = useAuth();

  const handleEmailAuth = (email: string, password: string, isRegisteringAttempt: boolean) => {
    if (isRegisteringAttempt) {
      registerWithEmail(email, password, () => setIsRegistering(false));
    } else {
      loginWithEmail(email, password, onLogin);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Inter', sans-serif" }}>
      
      <div style={{ marginBottom: '32px' }}>
        <span style={{ fontSize: '18px', fontWeight: 700, color: '#2563EB' }}>CareCompanion</span>
      </div>

      <div style={{ width: '320px', marginBottom: '32px' }}>
        <p style={{ fontSize: '22px', fontWeight: 600, color: '#111827', margin: 0 }}>Your Health Assistant.</p>
        <p style={{ fontSize: '22px', fontWeight: 600, color: '#9CA3AF', margin: 0 }}>
          {isRegistering ? 'Create a new account' : 'Sign in to your account'}
        </p>
      </div>

      <div style={{ width: '360px' }}>
        {errorMessage && (
          <div style={{ padding: '12px', marginBottom: '16px', backgroundColor: '#FEF2F2', border: '1px solid #F87171', borderRadius: '8px', color: '#991B1B', fontSize: '13px', fontWeight: 500 }}>
            {errorMessage}
          </div>
        )}

        <EmailAuthForm 
          onSubmit={handleEmailAuth} 
          loading={loading} 
          isRegistering={isRegistering} 
        />

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '10px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#F3F4F6' }} />
          <span style={{ fontSize: '14px', color: '#9CA3AF' }}>or continue with</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#F3F4F6' }} />
        </div>

        <AlternativeAuth 
          onGoogleLogin={loginWithGoogle} 
          onGuestLogin={onGuestLogin} 
        />

        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 8px' }}>
             {isRegistering ? 'Already have an account? ' : 'New user? '}
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              style={{ color: '#2563EB', background: 'none', border: 'none', padding: 0, fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}
            >
              {isRegistering ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}