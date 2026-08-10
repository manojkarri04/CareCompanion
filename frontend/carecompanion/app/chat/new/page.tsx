'use client';

import { useEffect, useRef } from 'react';
import { useChat } from '../../../src/contexts/ChatContext';
import { useRouter } from 'next/navigation';

export default function NewChatRedirect() {
  const { createNewChat } = useChat();
  const router = useRouter();
  const created = useRef(false);

  useEffect(() => {
    if (!created.current) {
      created.current = true;
      createNewChat();
    }
  }, [createNewChat]);

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <p className="text-gray-500">Creating new conversation...</p>
    </div>
  );
}
