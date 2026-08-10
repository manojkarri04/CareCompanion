// This component maps directly to the Email & Password Login and New User Registration functionalities. It handles the form inputs, the password visibility toggle (Eye, EyeOff), and the switch that toggles between "Sign In" and "Sign Up" modes.

// components/EmailAuthForm.tsx
import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface EmailAuthFormProps {
  onSubmit: (email: string, password: string, isRegistering: boolean) => void;
  loading: boolean;
  isRegistering: boolean;
}

export default function EmailAuthForm({ onSubmit, loading, isRegistering }: EmailAuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(email, password, isRegistering);
    if (isRegistering) setPassword(''); // Clear password on successful registration
  };

  return (
    <form onSubmit={handleSubmit}>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B7280', marginBottom: '8px' }}>
        Email
      </label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Enter your email address..."
        required
        style={{
          width: '100%', height: '40px', paddingLeft: '16px', paddingRight: '12px',
          border: `1px solid ${focused ? '#2563EB' : '#E5E7EB'}`, borderRadius: '8px',
          fontSize: '14px', outline: 'none',
          boxShadow: focused ? '0 0 0 3px rgba(37,99,235,0.08)' : 'none',
        }}
      />

      <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B7280', marginTop: '16px', marginBottom: '8px' }}>
        Password
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password..."
          required
          style={{
            width: '100%', height: '40px', paddingLeft: '16px', paddingRight: '12px',
            border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {showPassword ? <EyeOff size={18} color="#9CA3AF" /> : <Eye size={18} color="#9CA3AF" />}
        </button>
      </div>

      <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '6px 0 18px' }}>
        Access your health records, reports, and AI assistance securely.
      </p>

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%', height: '40px', backgroundColor: '#2563EB', color: '#ffffff',
          border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Processing...' : (isRegistering ? 'Sign Up' : 'Sign In')}
      </button>
    </form>
  );
}