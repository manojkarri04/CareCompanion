/*
chats holds the entire array of all your conversations.
activeChat holds the ID string of the specific conversation you are looking at right now.
currentChat is a convenience variable that automatically finds and holds the full conversation object matching that ID.
*/

import { useState } from 'react';
import { supabase } from '../db/supabaseClient';
import { fetchWithRetry, checkNetworkSpeed } from '../lib/networkUtils';
import type { Message, BotMessage, Chat } from '../lib/types';
import { API_URL } from '../lib/env';

export function useChatManager() {
  // Lazy initialization so Date and UUID only generate once on mount
  const [chats, setChats] = useState<Chat[]>(() => {
    const initialChatId = crypto.randomUUID();
    return [{
      id: initialChatId,
      title: `New Chat - ${new Date().toLocaleDateString()}`,
      lastMessage: new Date(),
      messages: [{
        id: crypto.randomUUID(), 
        type: 'bot', 
        timestamp: new Date(),
        content: "Hello! I'm your CareCompanion AI assistant. You can ask me health questions, upload medical reports, or ask me to search for verified hospitals!",
      }],
    }];
  });
  
  const [activeChat, setActiveChat] = useState<string>(chats[0].id);
  const [isTyping, setIsTyping] = useState(false);
  const currentChat = chats.find((chat) => chat.id === activeChat);

  const createNewChat = () => {
    const newChat: Chat = {
      id: crypto.randomUUID(),
      title: `New Chat - ${new Date().toLocaleDateString()}`,
      lastMessage: new Date(),
      messages: [{
        id: crypto.randomUUID(),
        type: 'bot',
        timestamp: new Date(),
        content: 'Hello! How can I help you today?',
      }],
    };
    // BUG 13 FIX: use functional updater to avoid stale closure
    setChats((prev) => [newChat, ...prev]);
    setActiveChat(newChat.id);
  };
  
  const retryMessage = (messageId: string) => {
    if (!currentChat) return;
    const failedMessage = currentChat.messages.find(msg => msg.id === messageId);
    if (failedMessage) {
      sendMessage(failedMessage.content);
    }
  };

  const sendMessage = async (inputMessage: string) => {
    if (!inputMessage.trim() || !currentChat) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    // BUG 13 FIX: functional updater — no stale reference to `chats`
    setChats((prev) => prev.map((chat) =>
      chat.id === activeChat
        ? { ...chat, messages: [...chat.messages, userMessage], lastMessage: new Date() }
        : chat
    ));
    setIsTyping(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = API_URL;
      const response = await fetchWithRetry(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ message: userMessage.content, history: currentChat?.messages }),
      }, 3, 1500); 

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed.');

      // BUG 3 + BUG 5 FIX: Correctly map response fields.
      // /api/chat returns { reply: "..." }
      // /api/ask-database returns { answer, stats, anomaly_warning, recommendation, executed_sql, raw_data }
      // RichMessageRenderer reads message.agent_response for the structured stat/warning/recommendation cards.
      const botResponse: BotMessage = {
        id: crypto.randomUUID(),
        type: 'bot',
        timestamp: new Date(),
        content: data.answer || data.reply || 'Processing complete.',
        // Map the database-agent's structured data into the nested agent_response field
        agent_response: data.stats ? {
          answer: data.answer ?? '',
          stats: data.stats ?? [],
          anomaly_warning: data.anomaly_warning ?? null,
          recommendation: data.recommendation ?? '',
        } : undefined,
        // SQL reasoning block
        sql: data.executed_sql,
        // Evidence table
        raw_data: data.raw_data,
        // Anomaly list from hackathon agent
        anomalies: data.anomalies,
        // Mapbox map
        mapData: data.mapData,
        // Structured card (summary, food, videos, hospitals)
        specialContent: data.specialContent,
        // YouTube video link card
        video: data.video,
      };

      // BUG 13 FIX: functional updater
      setChats((prevChats) => prevChats.map((chat) =>
        chat.id === activeChat
          ? { ...chat, messages: [...chat.messages, botResponse] }
          : chat
      ));
    }
    catch (error: unknown) {
      alert(`Chat Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsTyping(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!currentChat) return;
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

    // BUG 13 FIX: functional updater
    setChats((prev) => prev.map((chat) =>
      chat.id === activeChat
        ? { ...chat, messages: [...chat.messages, userMessage] }
        : chat
    ));
    setIsTyping(true);

    const formData = new FormData();
    formData.append('file', file);
    // BUG 4 FIX: Send the active chat ID so the backend WebSocket
    // 'report_ready' event routes back to the correct chat session
    formData.append('chat_id', activeChat);

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
        // BUG 13 FIX: functional updater
        setChats((prevChats) => prevChats.map((chat) =>
          chat.id === activeChat
            ? { ...chat, messages: [...chat.messages, botResponse] }
            : chat
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

  return { chats, setChats, activeChat, setActiveChat, currentChat, isTyping, createNewChat, sendMessage, uploadFile, retryMessage };
}