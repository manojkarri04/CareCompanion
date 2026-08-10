'use client';

import React, { useState } from 'react';

import { supabase } from '../../db/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, Bell, FileText, Calendar, Heart, FolderOpen, LogOut, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';


interface SidebarProps {
  activePage: 'home' | 'chat' | 'alerts' | 'notepad' | 'saved-docs' | 'appointments';
}

function SidebarItem({ 
  icon: Icon, 
  label, 
  path, 
  isActive,
  isChat = false,
  chatId,
  onDeleteClick
}: { 
  icon: React.ElementType, 
  label: string, 
  path: string, 
  isActive: boolean,
  isChat?: boolean,
  chatId?: string,
  onDeleteClick?: (id: string) => void
}) {
  return (
    <li>
      <Link
        href={path}
        className={`group flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
          isActive
            ? 'bg-blue-600 text-white shadow-md font-medium'
            : 'text-blue-800 hover:bg-blue-200'
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <Icon className="size-5 shrink-0" />
          <span className="truncate text-sm">{label}</span>
        </div>
        
        {isChat && onDeleteClick && chatId && (
          <button
            aria-label="Delete conversation"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDeleteClick(chatId);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded hover:bg-red-100 hover:text-red-600 shrink-0 ml-2"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </Link>
    </li>
  );
}

export default function Sidebar({ activePage }: SidebarProps) {
  const router = useRouter();
  const { chats, activeChat, deleteChat } = useChat();
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deletingChatId) return;
    setIsDeleting(true);
    await deleteChat(deletingChatId);
    setIsDeleting(false);
    setDeletingChatId(null);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.log(e);
    }
    router.push('/login');
  };

  const navItems = [
    { id: 'chat', label: 'New Chat', icon: Plus, path: '/chat/new' },
    { id: 'alerts', label: 'Alerts', icon: Bell, path: '/alerts' },
    { id: 'notepad', label: 'Notepad', icon: FileText, path: '/notepad' },
    { id: 'saved-docs', label: 'Saved Docs', icon: FolderOpen, path: '/saved-docs' },
    { id: 'appointments', label: 'Appointment Scheduler', icon: Calendar, path: '/appointments' },
  ];

  return (
    <aside className="w-64 bg-gradient-to-b from-blue-50 to-blue-100 h-full flex flex-col border-r border-blue-200">
      <div className="p-4 border-b border-blue-200">
        <Link href="/home" className="flex items-center justify-start hover:opacity-80 transition-opacity px-3 py-2">
          <img src="/logo.svg" alt="Rama Logo" className="h-8 w-auto" />
        </Link>
      </div>
      
      <nav className="p-4 shrink-0">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              path={item.path}
              isActive={activePage === item.id && item.id !== 'chat'}
            />
          ))}
        </ul>
      </nav>

      <div className="flex-1 min-h-0 overflow-auto px-4 pb-4 border-t border-blue-200/50 pt-4">
        <h3 className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-3 px-2">Recent Chats</h3>
        <ul className="space-y-1">
          {chats.map((chat) => (
            <SidebarItem
              key={chat.id}
              icon={MessageSquare}
              label={chat.title}
              path={`/chat/${chat.id}`}
              isActive={activeChat === chat.id && activePage === 'chat'}
              isChat={true}
              chatId={chat.id}
              onDeleteClick={(id) => setDeletingChatId(id)}
            />
          ))}
        </ul>
      </div>

      <div className="p-4 border-t border-blue-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-700 hover:bg-red-100 transition-colors font-medium"
        >
          <LogOut className="size-5" />
          <span>Log Out</span>
        </button>
      </div>

      {/* Confirmation Dialog overlay */}
      {deletingChatId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete conversation?</h3>
            <p className="text-sm text-gray-500 mb-6">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingChatId(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
