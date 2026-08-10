'use client';

// components/ChatRoutingCard.tsx
import React from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';

export default function ChatRoutingCard() {
  const router = useRouter();
  const { chats } = useChat();

  const handleChatClick = () => {
    // If there are recent chats, go to the most recent one.
    // Otherwise, go to the 'new chat' route.
    if (chats.length > 0) {
      router.push(`/chat/${chats[0].id}`);
    } else {
      router.push('/chat/new');
    }
  };

  return (
    <button
      onClick={handleChatClick}
      className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-8 hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl group w-full"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="bg-white/20 p-6 rounded-full group-hover:bg-white/30 transition-colors">
          <MessageCircle className="size-12 text-white" />
        </div>
        <h2 className="text-white">Click to Chat</h2>
        <p className="text-blue-100 text-center">
          Get AI-powered health insights and personalized suggestions
        </p>
      </div>
    </button>
  );
}