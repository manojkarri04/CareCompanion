'use client';

import { useState } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { User, Settings, Plus, Trash2, Edit } from 'lucide-react';
import { supabase } from '../../db/supabaseClient';
import { API_URL } from '../../lib/env';

interface Alert {
  id: string;
  medicationName: string;
  time: string;
  date: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAlert, setNewAlert] = useState({ medicationName: '', time: '', date: '' });

  const handleEditClick = (alert: Alert) => {
    setEditingAlertId(alert.id);
    setNewAlert({
      medicationName: alert.medicationName,
      time: alert.time,
      date: alert.date,
    });
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingAlertId(null);
    setNewAlert({ medicationName: '', time: '', date: '' });
  };

  // 2. Save or Update an alert in the database
  const handleAddAlert = async () => {
    if (newAlert.medicationName && newAlert.time && newAlert.date) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // 1. Auth Check: Ensure the user is actually logged in before trying to fetch
        if (!session) {
          alert("Authentication error: You must be logged in to save an alert.");
          return;
        }

        const headers = { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        };

        // 2. URL Check: Add a fallback in case your environment variable is missing
        const apiUrl = API_URL;

        if (editingAlertId) {
          const response = await fetch(`${apiUrl}/api/alerts/${editingAlertId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(newAlert),
          });
          if (response.ok) {
            const updatedAlert = await response.json();
            updatedAlert.id = String(updatedAlert.id);
            setAlerts(alerts.map((a) => a.id === editingAlertId ? updatedAlert : a));
            handleCloseModal();
          } else {
            const errorData = await response.json().catch(() => null);
            console.error("Update Error:", errorData);
            alert(`Error updating alert: ${errorData?.error || response.statusText}`);
          }
        } else {
          const response = await fetch(`${apiUrl}/api/alerts`, {
            method: 'POST',
            headers,
            body: JSON.stringify(newAlert),
          });

          if (response.ok) {
            const savedAlert = await response.json();
            savedAlert.id = String(savedAlert.id);
            setAlerts([savedAlert, ...alerts]);
            handleCloseModal();
          } else {
            // 3. Error Extraction: Pull the exact error from Flask
            const errorData = await response.json().catch(() => null);
            console.error("Save Error:", errorData);
            alert(`Error saving alert: ${errorData?.error || errorData?.message || response.statusText}`);
          }
        }
      } catch (error) {
        console.error("Network Exception:", error);
        alert("Database connection failure: Unable to reach backend server.");
      }
    }
  };

  // 3. Delete an alert from the database
  const handleDeleteAlert = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/api/alerts/${id}`,{
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}`}
      });

      if (response.ok) {
        setAlerts(alerts.filter((alert) => alert.id !== id));
      } else {
        alert("Database connection failure or error deleting alert.");
      }
    } catch {
      alert("Database connection failure: Unable to reach backend server.");
    }
  };

  return (
    <DashboardLayout activePage="alerts">
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
          <h1 className="text-gray-800">Medication Alerts</h1>
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
              <h2 className="text-gray-800">Your Alerts</h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="size-5" />
                Add Alert
              </button>
            </div>

            {alerts.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <p className="text-gray-500 mb-4">No upcoming alerts found.</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Add your first alert
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-6 py-4 text-gray-700">Medication Name</th>
                      <th className="text-left px-6 py-4 text-gray-700">Time</th>
                      <th className="text-left px-6 py-4 text-gray-700">Date</th>
                      <th className="text-left px-6 py-4 text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((alert, index) => (
                      <tr
                        key={alert.id}
                        className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-6 py-4 text-gray-800">{alert.medicationName}</td>
                        <td className="px-6 py-4 text-gray-600">{alert.time}</td>
                        <td className="px-6 py-4 text-gray-600">{alert.date}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditClick(alert)}
                              className="p-2 hover:bg-blue-100 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit className="size-4 text-blue-600" />
                            </button>
                            <button
                              onClick={() => handleDeleteAlert(alert.id)}
                              className="p-2 hover:bg-red-100 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="size-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Alert Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-gray-800 mb-4">Add New Alert</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Medication Name</label>
                <input
                  type="text"
                  value={newAlert.medicationName}
                  onChange={(e) => setNewAlert({ ...newAlert, medicationName: e.target.value })}
                  placeholder="e.g., Aspirin 100mg"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Time</label>
                <input
                  type="time"
                  value={newAlert.time}
                  onChange={(e) => setNewAlert({ ...newAlert, time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={newAlert.date}
                  onChange={(e) => setNewAlert({ ...newAlert, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAlert}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}