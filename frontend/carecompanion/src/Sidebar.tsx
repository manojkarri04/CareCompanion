import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Bell, FileText, Calendar, Heart } from 'lucide-react';

interface SidebarProps {
  activePage: 'home' | 'alerts' | 'notepad' | 'appointments';
}

export default function Sidebar({ activePage }: SidebarProps) {
  const location = useLocation();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/home' },
    { id: 'alerts', label: 'Alerts', icon: Bell, path: '/alerts' },
    { id: 'notepad', label: 'Notepad', icon: FileText, path: '/notepad' },
    { id: 'appointments', label: 'Appointment Scheduler', icon: Calendar, path: '/appointments' },
  ];

  return (
    <aside className="w-64 bg-gradient-to-b from-blue-50 to-blue-100 h-screen flex flex-col border-r border-blue-200">
      <div className="p-6 border-b border-blue-200">
        <div className="flex items-center gap-2">
          <Heart className="size-8 text-blue-600" fill="currentColor" />
          <span className="text-blue-900">CareCompanion</span>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            
            return (
              <li key={item.id}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-blue-800 hover:bg-blue-200'
                  }`}
                >
                  <Icon className="size-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
