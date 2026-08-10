'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginPage from '../../src/components/Auth/LoginPage';
import { useAuth } from '../../src/AuthProvider';
import LoadingSpinner from '../../src/LoadingSpinner';

export default function LoginPageContainer() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    if (!loading && (session || isGuest)) {
      router.push('/home');
    }
  }, [session, isGuest, loading, router]);

  if (loading) {
    return <LoadingSpinner />;
  }

  const handleLogin = () => {
    router.push('/home');
  };

  const handleGuestLogin = () => {
    setIsGuest(true);
    router.push('/home');
  };

  return <LoginPage onLogin={handleLogin} onGuestLogin={handleGuestLogin} />;
}
