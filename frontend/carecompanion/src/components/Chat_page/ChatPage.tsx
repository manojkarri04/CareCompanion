'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Plus } from 'lucide-react'; // Removed unused User & Settings icons

// 1. Sidebar is one folder up in components/
import DashboardLayout from '../layout/DashboardLayout';

// 2. RichMessageRenderer is in the exact same 'chat' folder
import RichMessageRenderer from './RichMessageRender'; 
import { useChat } from '../../contexts/ChatContext';
import { useReportListener } from '../../hooks/useReportListener';

interface ChatPageProps {
  conversationId?: string;
}

export default function ChatPage({ conversationId }: ChatPageProps) {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    setChats, currentChat, 
    isTyping, sendMessage, uploadFile,
    retryMessage
  } = useChat();

  // Attach background listener
  useReportListener(setChats);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages]);

  const handleSend = () => {
    if (!inputMessage.trim()) return
    sendMessage(inputMessage, conversationId);
    setInputMessage('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0)
    {
       uploadFile(files[0], conversationId);
       e.target.value = '';
    } 
  };
  
  // Node 2: Retry Handler (Missing from current code)
 
  const handleRetry = (messageId: string) => {
    if (!messageId) return;
    retryMessage(messageId, conversationId); 
  };

  return (
    <DashboardLayout activePage="chat">
      <div className="flex flex-1 h-full overflow-hidden">
      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">


        <div className="flex-1 overflow-auto bg-slate-50">
          <div className="max-w-[850px] w-full mx-auto px-4 py-8 space-y-6">
            {currentChat?.messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[720px] rounded-2xl p-5 ${message.type === 'user' ? 'bg-blue-600 text-white rounded-br-sm shadow-md' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'}`}>
                
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                
                {/* 
                  Instead of 100+ lines of messy UI logic here, 
                  we just call your dedicated rendering module. 
                */}
                <RichMessageRenderer message={message} />
                 {/* UPDATED: Timestamp and Retry Button Row */}
                    <div className="mt-3 flex items-center justify-between gap-4">
                      <p className={`text-xs font-medium ${message.type === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>

                      {/* Only show Retry if this specific message failed */}
                      {message.status === 'error' && (
                        <button 
                          onClick={() => handleRetry(message.id)} 
                          className="text-xs font-bold text-red-200 hover:text-white bg-red-500/20 px-2 py-1 rounded transition-colors"
                        >
                          Failed to send - Click to retry
                        </button>
                      )}
                    </div>
                {/* <p className={`mt-3 text-xs font-medium ${message.type === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                   {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </p> */}
              </div>
            </div>  
          ))}
          
          {isTyping && (
             <div className="flex justify-start">
               <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm p-5 shadow-sm max-w-[720px]">
                  <span className="text-gray-400 text-sm">Processing...</span>
               </div>
             </div>
          )}
          <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-slate-50 p-4 pb-8 shrink-0 z-10">
          <div className="flex items-center gap-3 max-w-[850px] w-full mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-2">
            <button onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-500 hover:text-blue-600 transition-colors rounded-xl hover:bg-gray-100">
              <Paperclip className="size-6" />
            </button>
            <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a medical question..."
              className="flex-1 px-4 py-3 bg-transparent outline-none text-gray-800"
            />
            <button onClick={handleSend} disabled={!inputMessage.trim()} className="bg-blue-600 text-white px-5 py-3 rounded-xl disabled:opacity-50 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium">
              <Send className="size-5" /> Send
            </button>
          </div>
        </div>
      </main>
      </div>
    </DashboardLayout>
  );
}