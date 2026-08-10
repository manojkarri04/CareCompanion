// hooks/useAuth.ts
import { useState } from 'react';
// @ts-expect-error supabase client is lacking exact types for some edge cases
import { supabase } from '../../db/supabaseClient';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formatError = (error: unknown) => {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('Failed to fetch') || msg.includes('getaddrinfo') || msg.includes('NetworkError')) {
      return "🚨 Database Connection Failure: Unable to reach the database service. Please check your network connection or database setup.";
    }
    return msg;
  };

  const loginWithEmail = async (email: string, password: string, onSuccess: () => void) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      onSuccess();
    } catch (error: unknown) {
      setErrorMessage(formatError(error));
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (email: string, password: string, onSuccess: () => void) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      alert("🎉 Registration successful! You can now log in.");
      onSuccess(); // Triggers the UI to switch back to login mode
    } catch (error: unknown) {
      setErrorMessage(formatError(error));
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) throw error;
    } catch (error: unknown) {
      setErrorMessage(formatError(error));
    }
  };

  return { loginWithEmail, registerWithEmail, loginWithGoogle, loading, errorMessage };
}