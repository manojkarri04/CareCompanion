'use client';

import React from 'react';
import { Menu, Heart } from 'lucide-react';
import Sidebar from '../Sidebar/Sidebar';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '../ui/sheet';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activePage: 'home' | 'chat' | 'alerts' | 'notepad' | 'saved-docs' | 'appointments';
}

export default function DashboardLayout({ children, activePage }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden md:block h-full">
        <Sidebar activePage={activePage} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Mobile Top Navigation */}
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Heart className="size-6 text-blue-600" fill="currentColor" />
            <span className="text-blue-900 font-bold text-lg">CareCompanion</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <button className="p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <Menu className="size-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-transparent border-none">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <Sidebar activePage={activePage} />
            </SheetContent>
          </Sheet>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto flex flex-col relative">
          {children}
        </div>
      </div>
    </div>
  );
}
