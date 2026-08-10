'use client';

import ProtectedRoute from '../../src/ProtectedRoute';
import AlertsPage from '../../src/components/alerts/AlertsPage';

export default function AlertsRoute() {
  return (
    <ProtectedRoute>
      <AlertsPage />
    </ProtectedRoute>
  );
}
