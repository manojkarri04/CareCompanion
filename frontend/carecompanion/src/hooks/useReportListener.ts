// hooks/useReportListener.ts
import { useEffect, useRef } from 'react';
import { supabase } from '../db/supabaseClient';
import type { BotMessage, Chat } from '../lib/types';
import { FASTAPI_URL } from '../lib/env';

// Singleton socket instance across renders
let globalSocket: WebSocket | null = null;
let currentUserId: string | null = null;

async function getSocket() {
  if (globalSocket && globalSocket.readyState === WebSocket.OPEN) return globalSocket;

  const { data: { session } } = await supabase.auth.getSession();
  currentUserId = session?.user?.id ?? 'guest';

  // Convert http:// to ws:// and https:// to wss://
  const wsBaseUrl = FASTAPI_URL.replace(/^http/, 'ws');
  
  globalSocket = new WebSocket(`${wsBaseUrl}/ws/${currentUserId}`);
  
  return new Promise<WebSocket>((resolve, reject) => {
    if (!globalSocket) return reject();
    globalSocket.onopen = () => resolve(globalSocket as WebSocket);
    globalSocket.onerror = (err) => reject(err);
  });
}

export function useReportListener(setChats: React.Dispatch<React.SetStateAction<Chat[]>>) {
  // Use a ref to keep the latest setChats for the event listener without re-binding
  const setChatsRef = useRef(setChats);
  useEffect(() => {
    setChatsRef.current = setChats;
  }, [setChats]);

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
  
  useEffect(() => {
    const handleReportReady = (data: { chat_id: string; analysis?: string }) => {
      if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('CareCompanion', {
          body: 'Your medical report summary is ready!',
        });
      }

      const summaryText = data.analysis
        ? `I've analyzed your medical report in the background. Here's what I found:\n\n${data.analysis}`
        : "I've analyzed your medical report, but didn't find anything to summarize.";

      setChatsRef.current((prevChats) => prevChats.map((chat) => {
        // Only inject the summary into the chat that uploaded the file
        if (chat.id === data.chat_id) { 
          const botResponse: BotMessage = {
            id: crypto.randomUUID(),
            type: 'bot',
            content: summaryText,
            timestamp: new Date(),
          };
          return { ...chat, messages: [...chat.messages, botResponse] };
        }
        return chat;
      }));
    };

    getSocket().then((ws) => {
      // Set up the message listener
      ws.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          if (parsedData.event === 'report_ready') {
            handleReportReady(parsedData);
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message", e);
        }
      };
    }).catch(err => {
      console.warn("WebSocket connection failed:", err);
    });

    return () => {
      if (globalSocket) {
        globalSocket.onmessage = null;
      }
    };
  }, []);
}