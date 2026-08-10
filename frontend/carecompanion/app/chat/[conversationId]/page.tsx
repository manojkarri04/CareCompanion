'use client';

import { useEffect, use } from 'react';
import ChatPage from '../../../src/components/Chat_page/ChatPage';
import { useChat } from '../../../src/contexts/ChatContext';

export default function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { setActiveChat, chats } = useChat();
  const unwrappedParams = use(params);
  const conversationId = unwrappedParams.conversationId;

  useEffect(() => {
    // Only set active if the chat exists
    const chatExists = chats.some(c => c.id === conversationId);
    if (chatExists) {
      setActiveChat(conversationId);
    }
  }, [conversationId, chats, setActiveChat]);

  return <ChatPage conversationId={conversationId} />;
}

