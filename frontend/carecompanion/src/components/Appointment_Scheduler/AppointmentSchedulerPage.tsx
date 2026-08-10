'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { User, Settings, Plus, X, Info, RefreshCw } from 'lucide-react';
import { supabase } from '../../db/supabaseClient';
import { API_URL } from '../../lib/env';

// This tells React what an Appointment looks like
interface Appointment {
  id: string;
  date: string;
  time: string;
  doctor: string;
  specialty: string;
  location: string;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
}

export default function AppointmentSchedulerPage() {
  // 2. THE MEMORY (State)
  // These hold the data while the user interacts with the page
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // Remembers which appointment we are fixing
  const [selectedDetailApt, setSelectedDetailApt] = useState<Appointment | null>(null);
  
  const [newAppointment, setNewAppointment] = useState({
    date: '',
    time: '',
    doctor: '',
    specialty: '',
    location: '',
  });

  // 3. LOAD DATA FROM BACKEND
  // This runs once when you open the page

  useEffect(() => {
    const fetchAppointments = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      fetch(`${API_URL}/api/appointments`,{
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      .then((response) => response.json())
      .then((data) => {
        // Fix the IDs to be text instead of numbers
        const realApts = data.map((apt: { id: string | number; [key: string]: unknown }) => ({
          ...apt,
          id: String(apt.id)
        }));
        setAppointments(realApts);
      })
      .catch((error) => console.error("Error loading appointments:", error));
    };
     fetchAppointments(); 
  }, []);
  // 4. HELPER: CLOSE THE POPUP
  const handleCloseModal = () => {
    setShowNewAppointmentModal(false);
    setEditingId(null);
    setNewAppointment({ date: '', time: '', doctor: '', specialty: '', location: '' }); // Clear the form
  };

  // 5. SAVE DATA (Create or Update)
  const handleSaveAppointment = async () => {
    if (!newAppointment.date || !newAppointment.time || !newAppointment.doctor || !newAppointment.specialty) {
      alert("⚠️ Please fill out the Date, Time, Doctor, and Specialty before saving!");
      return; 
    }

    // const formattedDate = new Date(newAppointment.date).toLocaleDateString('en-US', {
    //   weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    // });

    const appointmentData = {
      date: newAppointment.date,
      time: newAppointment.time,
      doctor: newAppointment.doctor,
      specialty: newAppointment.specialty,
      location: newAppointment.location || 'TBD',
      status: 'Confirmed', 
    };

    if (editingId) {
      const { data: { session } } = await supabase.auth.getSession();
      try {
        const response = await fetch(`${API_URL}/api/appointments/${editingId}`, {
          method: 'PUT',
          headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${session?.access_token}`
           },
          body: JSON.stringify(appointmentData),
        });

        if (response.ok) {
          const updatedApt = await response.json();
          updatedApt.id = String(updatedApt.id);
          setAppointments(appointments.map(apt => apt.id === editingId ? updatedApt : apt));
          handleCloseModal();
        } else {
          // If Flask sends back a bad response
          alert("❌ The backend server refused to update the appointment.");
        }
      } catch (error) {
        alert("🔌 Cannot connect to Flask. Is your backend server running?");
        console.error("Error updating:", error);
      }
    } 
    else {
      const { data: { session } } = await supabase.auth.getSession();
      try {
        const response = await fetch(`${API_URL}/api/appointments`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
           },
          body: JSON.stringify(appointmentData),
        });

        if (response.ok) {
          const savedApt = await response.json();
          savedApt.id = String(savedApt.id);
          setAppointments([savedApt, ...appointments]);
          handleCloseModal();
        } else {
          // If Flask sends back a bad response
          alert("❌ The backend server refused to save the appointment.");
        }
      } catch (error) {
        alert("🔌 Cannot connect to Flask. Is your backend server running?");
        console.error("Error saving:", error);
      }
    }
  };
  // 6. PREPARE THE EDIT FORM
  // This runs when you click "Reschedule"
  const handleEditClick = (appointment: Appointment) => {
    setEditingId(appointment.id); // Remember the ID
    // Change the nice date back into a standard format for the calendar input
    const dateObj = new Date(appointment.date);
    const standardDateStr = dateObj.toISOString().split('T')[0]; 
    // Fill the popup form with the old data
    setNewAppointment({
      date: standardDateStr,
      time: appointment.time,
      doctor: appointment.doctor,
      specialty: appointment.specialty,
      location: appointment.location
    });
    setShowNewAppointmentModal(true); // Open the popup
  };

  // 7. CANCEL APPOINTMENT
  const handleCancelAppointment = async (id: string) => {
   const { data: { session } } = await supabase.auth.getSession();
    try {
      const response = await fetch(`${API_URL}/api/appointments/${id}/cancel`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json',
             'Authorization': `Bearer ${session?.access_token}`
           },
      });

      if (response.ok) {
        // Change the status to 'Cancelled' on the screen
        setAppointments(appointments.map((apt) =>
          apt.id === id ? { ...apt, status: 'Cancelled' as const } : apt
        ));
      }
    } catch (error) {
      console.error("Error cancelling:", error);
    }
  };

  // 8. COLORS FOR STATUS
  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'Confirmed': return 'bg-green-100 text-green-800 border-green-300';
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Cancelled': return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  // 9. THE VISUAL LAYOUT (HTML/UI)
  return (
    <DashboardLayout activePage="appointments">
      <main className="flex-1 overflow-auto">
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
        <h1 className="text-gray-800">Appointment Scheduler</h1>
        <div className="flex gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="size-6 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <User className="size-6 text-gray-600" />
          </button>
        </div>
      </header>
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-gray-800">Your Appointments</h2>
            <button onClick={() => {
              setEditingId(null);
              setNewAppointment({ date: '', time: '', doctor: '', specialty: '', location: '' });
              setShowNewAppointmentModal(true);
             }}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md hover:shadow-lg">
                <Plus className="size-5" />
                New Appointment
            </button>
          </div>
          {/* Upcoming Appointments */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h3 className="text-gray-800 mb-4">Upcoming Appointments</h3>
            {
              appointments.filter((apt) => apt.status !== 'Cancelled').length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No upcoming appointments found.</p>
              <button onClick={() => {
                  setEditingId(null);
                  setNewAppointment({ date: '', time: '', doctor: '', specialty: '', location: '' });
                  setShowNewAppointmentModal(true);
                }}
              className="text-blue-600 hover:text-blue-700">
                    Schedule Your First Appointment
              </button>
            </div>
            ) : 
            <div className="space-y-4">
              {
              appointments.filter((apt) => apt.status !== 'Cancelled')
              .map((appointment) => {
                
                // 1. DO THE MATH INSIDE THE LOOP!
                const prettyDate = new Date(appointment.date + "T00:00:00").toLocaleDateString('en-US', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                });

                // 2. NOW RETURN THE HTML!
                return (
                  <div key={appointment.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">  
                      {/* Header Row: Dot, Date, Time, and Status Badge */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {/* The Status Dot */}
                          <div className={`w-3 h-3 rounded-full ${appointment.status === 'Confirmed' ? 'bg-green-500' : 'bg-yellow-500'}`}> 
                          </div>
                          {/* The Translated Date */}
                          <h4 className="text-gray-900">{prettyDate}</h4>
                        </div>
                        {/* The Time */}
                        <p className="text-gray-700">{appointment.time}</p>
                      </div>
                      
                      {/* The Status Badge on the right */}
                      <span className={`px-3 py-1 rounded-full border ${getStatusColor(appointment.status)}`}>
                        {appointment.status}
                      </span>
                    </div>

                    {/* Middle Row: Doctor and Location */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div>
                        <p className="text-gray-600">Doctor:</p>
                        <p className="text-gray-900">
                          {appointment.doctor} - {appointment.specialty}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Location:</p>
                        <p className="text-gray-900">{appointment.location}</p>
                      </div>
                    </div>

                    {/* Bottom Row: Buttons */}
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => setSelectedDetailApt(appointment)}
                        className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
                        title="View Details"
                      >
                        <Info className="size-4" />
                        Details
                      </button>
                      <button onClick={() => handleEditClick(appointment)}
                        className="px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors flex items-center gap-2"
                        title="Reschedule">
                        <RefreshCw className="size-4" />
                        Reschedule
                      </button>
                      <button onClick={() => handleCancelAppointment(appointment.id)}
                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                        title="Cancel">
                        <X className="size-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              })
            }
          </div>
        }
      </div>
      { /* Cancelled Appointments Area */}
        {appointments.filter((apt) => apt.status === 'Cancelled').length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-gray-800 mb-4">Past & Cancelled Appointments</h3>
              <div className="space-y-3">
                {appointments
                   .filter((apt) => apt.status === 'Cancelled')
                    .map((appointment) => (
                      <div
                        key={appointment.id}
                        className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-gray-900">{appointment.date}</p>
                            <p className="text-gray-600">
                              {appointment.doctor} - {appointment.specialty}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full border ${getStatusColor(
                              appointment.status
                            )}`}
                          >
                            {appointment.status}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* The Popup Form */}
      {showNewAppointmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-gray-800">
                {editingId ? "Reschedule Appointment" : "Schedule New Appointment"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={newAppointment.date}
                  onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Time</label>
                <input
                  type="text"
                  value={newAppointment.time}
                  onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
                  placeholder="e.g., 10:00 AM - 10:30 AM"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Doctor Name</label>
                <input
                  type="text"
                  value={newAppointment.doctor}
                  onChange={(e) => setNewAppointment({ ...newAppointment, doctor: e.target.value })}
                  placeholder="e.g., Dr. John Smith"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Specialty</label>
                <input
                  type="text"
                  value={newAppointment.specialty}
                  onChange={(e) => setNewAppointment({ ...newAppointment, specialty: e.target.value })}
                  placeholder="e.g., Cardiologist"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Location (Optional)</label>
                <input
                  type="text"
                  value={newAppointment.location}
                  onChange={(e) => setNewAppointment({ ...newAppointment, location: e.target.value })}
                  placeholder="e.g., City General Hospital"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAppointment}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingId ? "Save Changes" : "Schedule Appointment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedDetailApt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-gray-800 text-lg font-bold">Appointment Details</h2>
              <button
                onClick={() => setSelectedDetailApt(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="size-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3 text-sm text-gray-700">
              <p><strong>Doctor:</strong> {selectedDetailApt.doctor}</p>
              <p><strong>Specialty:</strong> {selectedDetailApt.specialty}</p>
              <p><strong>Date:</strong> {selectedDetailApt.date}</p>
              <p><strong>Time:</strong> {selectedDetailApt.time}</p>
              <p><strong>Location:</strong> {selectedDetailApt.location}</p>
              <p><strong>Status:</strong> <span className={`px-2 py-0.5 rounded-full border ${getStatusColor(selectedDetailApt.status)}`}>{selectedDetailApt.status}</span></p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedDetailApt(null)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}