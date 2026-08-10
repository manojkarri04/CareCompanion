'use client';

import ProtectedRoute from '../../src/ProtectedRoute';
import HomePage from '../../src/components/home/HomePage';

export default function HomeRoute() {
  return (
    <ProtectedRoute>
      <HomePage />
    </ProtectedRoute>
  );
}
