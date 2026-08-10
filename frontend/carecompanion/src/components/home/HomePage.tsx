'use client';

// HomePage.tsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layout/DashboardLayout';

import { User, Settings, Plus, Send } from 'lucide-react';
import GuestBanner from './GuestBanner';
import { useAuth } from '../../AuthProvider';
import { useChat } from '../../contexts/ChatContext';

interface HomePageProps {
  isGuestMode?: boolean;
}

export default function HomePage({ isGuestMode = false }: HomePageProps) {
  const { session } = useAuth();
  
  // Extract user info from Supabase session
  const email = session?.user?.email;
  // If you store name in metadata during signup, it's usually at user_metadata.full_name or similar
  const name = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.firstName || email?.split('@')[0] || 'User';
  
  const userData = session ? {
    firstName: name,
    email: email || '',
  } : null;

  const { createNewChat, sendMessage } = useChat();
  const [inputMessage, setInputMessage] = useState('');

  const handleSend = () => {
    if (!inputMessage.trim()) return;
    const newId = createNewChat();
    setTimeout(() => {
      sendMessage(inputMessage, newId);
    }, 100);
  };

  return (
    <DashboardLayout activePage="home">
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-end items-center gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings className="size-6 text-gray-600" />
          </button>
          {userData ? (
            <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
              <span className="text-sm font-medium text-gray-700">
                {userData.firstName}
              </span>
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                {userData.firstName.charAt(0)}
              </div>
            </div>
          ) : (
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <User className="size-6 text-gray-600" />
            </button>
          )}
        </header>
         
        <GuestBanner isGuestMode={isGuestMode} />

        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-8 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-[#f0f4f9] via-white to-white -z-10 pointer-events-none" />
          
          <div className="max-w-[700px] w-full flex flex-col items-center justify-center -mt-20">
            <h1 className="text-4xl md:text-5xl font-medium mb-10 text-center tracking-tight leading-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500">
                {userData ? `Hello, ${userData.firstName}` : 'Hello there'}
              </span>
              <br />
              <span className="text-[28px] md:text-[32px] font-normal mt-4 block flex justify-center gap-4">
                <span className="text-blue-500">Understand.</span>
                <span className="text-green-500">Heal.</span>
                <span className="text-yellow-500">Grow.</span>
              </span>
            </h1>

            <div className="w-full relative shadow-[0_2px_12px_rgba(0,0,0,0.06)] rounded-full bg-white border border-gray-100 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] focus-within:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow">
              <div className="flex items-center px-4 py-4">
                <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                  <Plus className="size-6" />
                </button>
                <input 
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask CareCompanion..."
                  className="flex-1 bg-transparent px-4 outline-none text-gray-800 text-lg placeholder-gray-400"
                />
                <button onClick={handleSend} disabled={!inputMessage.trim()} className="p-2 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50">
                  <Send className="size-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}