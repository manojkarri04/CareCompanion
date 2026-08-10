'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  isGuestMode?: boolean;
}

export default function ProtectedRoute({ children, isGuestMode = false }: ProtectedRouteProps) {
  const { session, loading } = useAuth();
  const router = useRouter();

  const isAllowedIn = Boolean(session) || isGuestMode;

  useEffect(() => {
    if (!loading && !isAllowedIn) {
      router.push('/login');
    }
  }, [loading, isAllowedIn, router]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAllowedIn) {
    return null;
  }

  return <>{children}</>;
}