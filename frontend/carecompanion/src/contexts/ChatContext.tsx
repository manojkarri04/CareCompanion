'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../db/supabaseClient';
import { fetchWithRetry, checkNetworkSpeed } from '../lib/networkUtils';
import type { Message, BotMessage, Chat } from '../lib/types';
import { API_URL } from '../lib/env';
import { useRouter } from 'next/navigation';

interface ChatContextType {
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  activeChat: string | null;
  setActiveChat: React.Dispatch<React.SetStateAction<string | null>>;
  currentChat: Chat | undefined;
  isTyping: boolean;
  createNewChat: () => string;
  sendMessage: (inputMessage: string, chatId?: string) => Promise<void>;
  uploadFile: (file: File, chatId?: string) => Promise<void>;
  retryMessage: (messageId: string, chatId?: string) => void;
  deleteChat: (chatId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Lazy initialization with localStorage if possible, else default empty
  const [chats, setChats] = useState<Chat[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('carecompanion_chats');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse chats from localStorage", e);
        }
      }
    }
    return [];
  });

  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const currentChat = chats.find((chat) => chat.id === activeChat);

  // Persist to localStorage on change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('carecompanion_chats', JSON.stringify(chats));
    }
  }, [chats]);

  const createNewChat = () => {
    const newChat: Chat = {
      id: crypto.randomUUID(),
      title: `New Chat - ${new Date().toLocaleDateString()}`,
      lastMessage: new Date(),
      messages: [{
        id: crypto.randomUUID(),
        type: 'bot',
        timestamp: new Date(),
        content: "Hello! I'm your CareCompanion AI assistant. How can I help you today?",
      }],
    };
    
    setChats((prev) => [newChat, ...prev]);
    setActiveChat(newChat.id);
    router.push(`/chat/${newChat.id}`);
    
    return newChat.id;
  };

  const deleteChat = async (chatId: string) => {
    // 1. Remove from local state
    setChats((prev) => prev.filter((c) => c.id !== chatId));

    // 2. Handle active chat state/routing
    if (activeChat === chatId) {
      setActiveChat(null);
      router.push('/chat/new');
    }

    // 3. Delete from backend
    try {
      const response = await fetchWithRetry(`${API_URL}/api/chat/${chatId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        console.error("Failed to delete chat from backend");
        // Optionally, display a toast or snackbar here if a toast library is available
      }
    } catch (e) {
      console.error("Error calling delete endpoint", e);
    }
  };
  
  const retryMessage = (messageId: string, overrideChatId?: string) => {
    const targetChatId = overrideChatId || activeChat;
    const chat = chats.find(c => c.id === targetChatId);
    if (!chat) return;
    
    const failedMessage = chat.messages.find(msg => msg.id === messageId);
    if (failedMessage) {
      sendMessage(failedMessage.content, targetChatId);
    }
  };

  const sendMessage = async (inputMessage: string, overrideChatId?: string) => {
    const targetChatId = overrideChatId || activeChat;
    const chat = chats.find(c => c.id === targetChatId);
    if (!inputMessage.trim() || !chat) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setChats((prev) => prev.map((c) =>
      c.id === targetChatId
        ? { ...c, messages: [...c.messages, userMessage], lastMessage: new Date() }
        : c
    ));
    
    // Auto-update title if it's the first user message
    if (chat.messages.length === 1 && chat.messages[0].type === 'bot') {
       const newTitle = inputMessage.length > 30 ? inputMessage.substring(0, 30) + '...' : inputMessage;
       setChats((prev) => prev.map((c) => 
         c.id === targetChatId ? { ...c, title: newTitle } : c
       ));
    }

    setIsTyping(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = API_URL;
      const response = await fetchWithRetry(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ message: userMessage.content, chat_id: targetChatId, history: chat.messages }),
      }, 3, 1500); 

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed.');

      const botResponse: BotMessage = {
        id: crypto.randomUUID(),
        type: 'bot',
        timestamp: new Date(),
        content: data.answer || data.reply || 'Processing complete.',
        agent_response: data.stats ? {
          answer: data.answer ?? '',
          stats: data.stats ?? [],
          anomaly_warning: data.anomaly_warning ?? null,
          recommendation: data.recommendation ?? '',
        } : undefined,
        sql: data.executed_sql,
        raw_data: data.raw_data,
        anomalies: data.anomalies,
        mapData: data.mapData,
        specialContent: data.specialContent,
        video: data.video,
      };

      setChats((prevChats) => prevChats.map((c) =>
        c.id === targetChatId
          ? { ...c, messages: [...c.messages, botResponse], lastMessage: new Date() }
          : c
      ));
    }
    catch (error: unknown) {
      alert(`Chat Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsTyping(false);
    }
  };

  const uploadFile = async (file: File, overrideChatId?: string) => {
    const targetChatId = overrideChatId || activeChat;
    const chat = chats.find(c => c.id === targetChatId);
    if (!chat) return;
    
    const apiUrl = API_URL;

    const pingMs = await checkNetworkSpeed(apiUrl);
    if (pingMs === -1) return alert("You are offline! Cannot connect to the server.");
    if (pingMs > 1000) {
      if (!window.confirm(`Your network is very slow right now (Ping: ${pingMs}ms). Proceed anyway?`)) return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      type: 'user',
      content: `📎 Uploaded: ${file.name}`,
      timestamp: new Date(),
      fileAttached: file.name,
    };

    setChats((prev) => prev.map((c) =>
      c.id === targetChatId
        ? { ...c, messages: [...c.messages, userMessage], lastMessage: new Date() }
        : c
    ));
    setIsTyping(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('chat_id', targetChatId as string);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetchWithRetry(`${apiUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
        body: formData,
      }, 3, 2000); 

      const data = await response.json();
      if (response.ok || response.status === 202) {
        const botResponse: BotMessage = {
          id: crypto.randomUUID(),
          type: 'bot',
          timestamp: new Date(),
          content: data.message || "File uploaded securely! My AI is analyzing it in the background. I'll send you the summary here when it's ready.",
        };
        setChats((prevChats) => prevChats.map((c) =>
          c.id === targetChatId
            ? { ...c, messages: [...c.messages, botResponse], lastMessage: new Date() }
            : c
        ));
      } else {
        alert("Error analyzing report: " + (data.error || "Unknown error"));
      }
    } catch {
      alert("Could not connect to the server.");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <ChatContext.Provider value={{
      chats, setChats, activeChat, setActiveChat, currentChat, isTyping, createNewChat, sendMessage, uploadFile, retryMessage, deleteChat
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
