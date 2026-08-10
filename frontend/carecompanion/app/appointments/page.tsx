'use client';

import ProtectedRoute from '../../src/ProtectedRoute';
import AppointmentSchedulerPage from '../../src/components/Appointment_Scheduler/AppointmentSchedulerPage';

export default function AppointmentsRoute() {
  return (
    <ProtectedRoute>
      <AppointmentSchedulerPage />
    </ProtectedRoute>
  );
}
