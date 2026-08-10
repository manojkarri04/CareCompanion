'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Info } from 'lucide-react';

interface GuestBannerProps {
  isGuestMode?: boolean;
}

export default function GuestBanner({ isGuestMode = false }: GuestBannerProps) {
  const router = useRouter();
  if (!isGuestMode) return null;

  return (
    <div className="mx-8 mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
      <Info className="size-5 text-blue-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-blue-900 font-medium">
          You are using guest mode
        </p>
        <p className="text-blue-700 text-sm mt-1">
          Your data won't be saved permanently. Sign up to unlock all features and save your health records.
        </p>
      </div>
      <button 
        onClick={() => router.push('/login')}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
      >
        Sign Up Now
      </button>
    </div>
  );
}