'use client';

import ProtectedRoute from '../../src/ProtectedRoute';
import NotepadPage from '../../src/components/Notepad/NotepadPage';

export default function NotepadRoute() {
  return (
    <ProtectedRoute>
      <NotepadPage />
    </ProtectedRoute>
  );
}
