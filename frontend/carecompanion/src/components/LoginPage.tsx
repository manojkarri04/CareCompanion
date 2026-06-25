import React, { useState } from 'react';
import { UserCircle2 } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
  onGuestLogin: () => void;
}

export default function LoginPage({ onLogin, onGuestLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) onLogin();
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Brand Mark */}
      <div style={{ marginBottom: '32px' }}>
        <span
          style={{
            fontSize: '18px',
            fontWeight: 700,
            letterSpacing: '-0.3px',
            color: '#2563EB',
          }}
        >
          CareCompanion
        </span>
      </div>

      {/* Title Block — 320px, two-line Notion style */}
      <div style={{ width: '320px', marginBottom: '32px' }}>
        <p
          style={{
            fontSize: '22px',
            fontWeight: 600,
            lineHeight: '26px',
            color: '#111827',
            margin: 0,
          }}
        >
          Your Health Assistant.
        </p>
        <p
          style={{
            fontSize: '22px',
            fontWeight: 600,
            lineHeight: '26px',
            color: '#9CA3AF',
            margin: 0,
          }}
        >
          Sign in to your CareCompanion account
        </p>
      </div>

      {/* Form Container */}
      <div style={{ width: '360px' }}>
        <form onSubmit={handleSubmit}>
          {/* Email Label */}
          <label
            htmlFor="email"
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 500,
              color: '#6B7280',
              marginBottom: '8px',
            }}
          >
            Email
          </label>

          {/* Email Input */}
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Enter your email address..."
            required
            style={{
              width: '100%',
              height: '40px',
              paddingLeft: '16px',
              paddingRight: '12px',
              border: `1px solid ${focused ? '#2563EB' : '#E5E7EB'}`,
              borderRadius: '8px',
              fontSize: '14px',
              color: '#111827',
              backgroundColor: '#ffffff',
              outline: 'none',
              boxSizing: 'border-box',
              boxShadow: focused ? '0 0 0 3px rgba(37,99,235,0.08)' : 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
          />

          {/* Helper Text */}
          <p
            style={{
              fontSize: '12px',
              lineHeight: '16px',
              color: '#9CA3AF',
              margin: '6px 0 18px',
            }}
          >
            Access your health records, reports, and AI assistance securely.
          </p>

          {/* Continue Button */}
          <button
            type="submit"
            style={{
              width: '100%',
              height: '40px',
              backgroundColor: '#2563EB',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
          >
            Continue
          </button>
        </form>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '20px 0',
            gap: '10px',
          }}
        >
          <div style={{ flex: 1, height: '1px', backgroundColor: '#F3F4F6' }} />
          <span style={{ fontSize: '14px', fontWeight: 400, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
            or continue with
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#F3F4F6' }} />
        </div>

        {/* Auth Options */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {/* Google */}
          <button
            type="button"
            onClick={onLogin}
            style={{
              height: '72px',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F9FAFB';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Google</span>
          </button>

          {/* Continue as Guest */}
          <button
            type="button"
            onClick={onGuestLogin}
            style={{
              height: '72px',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F9FAFB';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
            }}
          >
            <UserCircle2 size={18} color="#6B7280" />
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Continue as Guest</span>
          </button>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 8px' }}>
            New user?{' '}
            <a
              href="#"
              style={{ color: '#2563EB', textDecoration: 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              Sign up
            </a>
          </p>
          <p style={{ fontSize: '12px', lineHeight: '16px', color: '#9CA3AF', margin: 0 }}>
            By continuing, you agree to the{' '}
            <a href="#" style={{ color: '#2563EB', textDecoration: 'none' }}>Terms of Service</a>
            {' '}and{' '}
            <a href="#" style={{ color: '#2563EB', textDecoration: 'none' }}>Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
