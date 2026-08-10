'use client';

import ProtectedRoute from '../../src/ProtectedRoute';
import SavedDocumentsPage from '../../src/components/Saved_documents/SavedDocumentsPage';

export default function SavedDocsRoute() {
  return (
    <ProtectedRoute>
      <SavedDocumentsPage />
    </ProtectedRoute>
  );
}
