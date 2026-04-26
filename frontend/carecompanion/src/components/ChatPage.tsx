import { useState, useRef, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Send, Paperclip, Plus, User, Settings } from 'lucide-react';
import { supabase } from './supabase';
import { io } from 'socket.io-client';
const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');

import { Building } from 'lucide-react';



interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  specialContent?: {
    type: 'summary' | 'food' | 'videos' | 'hospitals' | 'facilities';
    data: any;
  };
  fileAttached?: string;
}

interface Chat {
  id: string;
  title: string;
  lastMessage: Date;
  messages: Message[];
  medicalContext?: {
    conditions: string[];
    medications: string[];
    concerns: string[];
  };
}

interface ChatPageProps {
  isGuestMode?: boolean;
}


export default function ChatPage({isGuestMode = false}: ChatPageProps) {
  const [chats, setChats] = useState<Chat[]>([
    {
      id: '1',
      title: 'Health Check - Dec 10',
      lastMessage: new Date('2024-12-10'),
      messages: [
        {
          id: '1',
          type: 'bot',
          content: 'Hello! I\'m your CareCompanion AI assistant. How can I help you today?',
          timestamp: new Date('2024-12-10T10:00:00'),
        },
      ],
    },
  ]);
  const [activeChat, setActiveChat] = useState<string>('1');
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentChat = chats.find((chat) => chat.id === activeChat);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages]);
   
  useEffect(() => {
    // 1. Ask the user if we can show popups when the page loads
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // 2. Listen for a special signal from Flask (we will call it 'report_ready')
    socket.on('report_ready', (data) => {
      // 3. The WhatsApp trick: Is the user looking at another tab?
      if (document.hidden && Notification.permission === 'granted') {
        // Show the popup on their screen!
        new Notification('CareCompanion', {
          body: data.message || 'Your medical report summary is ready!',
        });
        // Bonus: You can add sound later if you want!
      }
    });

    // Clean up the listener when the user leaves the page
    return () => {
      socket.off('report_ready');
    };
  }, []); // The empty brackets mean this setup only runs once


// The Connection Doctor
  const checkNetworkSpeed = async () => {
    // 1. Start the stopwatch
    const startTime = Date.now(); 

    try {
      // 2. Send the tiny ping request to Flask
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ping`);
      
      if (response.ok) {
        // 3. Stop the stopwatch
        const endTime = Date.now(); 
        const pingTime = endTime - startTime; // The time in milliseconds
        return pingTime;
      }
      return -1;
    } catch (error)
    {
      // If the server is totally offline or the internet is down
      return -1; 
    }
  };


  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: `New Chat - ${new Date().toLocaleDateString()}`,
      lastMessage: new Date(),
      messages: [
        {
          id: '1',
          type: 'bot',
          content: 'Hello! I\'m your CareCompanion AI assistant. How can I help you today?',
          timestamp: new Date(),
        },
      ],
    };
    setChats([newChat, ...chats]);
    setActiveChat(newChat.id);
  };

  // Analyze medical report context
  const analyzeMedicalReport = (fileName: string) => {
    const lowerFileName = fileName.toLowerCase();
    
    if (lowerFileName.includes('diabetes') || lowerFileName.includes('blood sugar') || lowerFileName.includes('hba1c')) {
      return {
        condition: 'diabetes',
        medications: ['Metformin', 'Insulin'],
        concerns: ['Blood sugar management', 'Diet control'],
      };
    } else if (lowerFileName.includes('cardio') || lowerFileName.includes('heart') || lowerFileName.includes('ecg')) {
      return {
        condition: 'cardiovascular',
        medications: ['Beta blockers', 'Statins'],
        concerns: ['Blood pressure', 'Cholesterol'],
      };
    } else if (lowerFileName.includes('thyroid')) {
      return {
        condition: 'thyroid',
        medications: ['Levothyroxine'],
        concerns: ['Hormone levels', 'Metabolism'],
      };
    } else if (lowerFileName.includes('kidney') || lowerFileName.includes('renal')) {
      return {
        condition: 'kidney',
        medications: ['ACE inhibitors'],
        concerns: ['Kidney function', 'Fluid retention'],
      };
    } else {
      return {
        condition: 'general',
        medications: [],
        concerns: ['Overall health'],
      };
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !currentChat) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    const updatedChat = {
      ...currentChat,
      messages: [...currentChat.messages, userMessage],
      lastMessage: new Date(),
    };

    setChats(chats.map((chat) => (chat.id === activeChat ? updatedChat : chat)));
    setInputMessage('');
    setIsTyping(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
         },
        body: JSON.stringify({ message: userMessage.content }),
      });

      const data = await response.json();
      let replyText = data.reply;
      const videoData: any[] = [];

      if (replyText.includes('VIDEO:')) {
        const lines = replyText.split('\n');
        const newLines = [];

        for (const line of lines) {
          if (line.trim().startsWith('VIDEO:')) {
            const parts = line.replace('VIDEO:', '').split('|');
            if (parts.length >= 3) {
              videoData.push({
                title: parts[0].trim(),
                channel: parts[1].trim(),
                url: parts[2].trim(),
              });
            }
          } else {
            newLines.push(line);
          }
        }
        replyText = newLines.join('\n').trim(); 
      }

      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: replyText || "Here are some helpful recommendations for you:",
        timestamp: new Date(),
        specialContent: videoData.length > 0 ? {
          type: 'videos',
          data: videoData
        } : undefined
      };

      setChats((prevChats) => prevChats.map((chat) => 
        chat.id === activeChat 
          ? { ...updatedChat, messages: [...updatedChat.messages, botResponse] } 
          : chat
      ));

    } catch (error) {
      alert("Could not connect to the chat server. Is Flask running?");
    } finally {
      setIsTyping(false);
    }
  };

const handleExtractFacility = async () => {
    if (!inputMessage.trim() || !currentChat) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: `🏥 Facility Report:\n${inputMessage}`,
      timestamp: new Date(),
    };

    const updatedChat = {
      ...currentChat,
      messages: [...currentChat.messages, userMessage],
      lastMessage: new Date(),
    };

    setChats(chats.map((chat) => (chat.id === activeChat ? updatedChat : chat)));
    const textToSend = inputMessage;
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/hackathon-extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSend }),
      });

      const data = await response.json();

      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: "Facility data extracted successfully:",
        timestamp: new Date(),
        specialContent: {
          type: 'facilities',
          data: data.data,
        },
      };

      setChats((prevChats) => prevChats.map((chat) => 
        chat.id === activeChat ? { ...updatedChat, messages: [...updatedChat.messages, botResponse] } : chat
      ));
    } catch (error) {
      alert("Failed to extract facility data.");
    } finally {
      setIsTyping(false);
    }
  };


  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };
  

const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    if (files && files.length > 0 && currentChat) {
      const pingMs = await checkNetworkSpeed();
      if (pingMs === -1) {
         alert("You are offline! Cannot connect to the server.");
         return; // Stop the upload
      } else if (pingMs > 1000) {
        // If it takes more than 1000ms (1 full second) for a tiny ping, 
        // the network is very slow.
        const userWantsToContinue = window.confirm(
          `Your network is very slow right now (Ping: ${pingMs}ms). The medical report upload might fail. Do you still want to try?`
        );
        if (!userWantsToContinue) {
          return; // Stop the upload
        }
      }
      
      const file = files[0];
      const fileName = file.name;

      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: `📎 Uploaded: ${fileName}`,
        timestamp: new Date(),
        fileAttached: fileName,
      };

      const mockAnalysisContext = analyzeMedicalReport(fileName);

      const updatedChat = {
        ...currentChat,
        messages: [...currentChat.messages, userMessage],
        lastMessage: new Date(),
        medicalContext: {
          conditions: [mockAnalysisContext.condition],
          medications: mockAnalysisContext.medications,
          concerns: mockAnalysisContext.concerns,
        },
      };

      setChats(chats.map((chat) => (chat.id === activeChat ? updatedChat : chat)));
      setIsTyping(true);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/analyze`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${session?.access_token}` 
          },
          body: formData,
        });

        const data = await response.json();

        if (response.ok) {
          const lines = data.analysis.split('\n').filter((line: string) => line.trim() !== '');
          const title = lines[0].replace(/[*#]/g, '');
          const items = lines.slice(1).map((line: string) => line.replace(/^[-*•]\s*/, ''));

          const summaryData = {
            title: title || "Health Report Summary",
            items: items.length > 0 ? items : [data.analysis]
          };

          const botResponse: Message = {
            id: (Date.now() + 1).toString(),
            type: 'bot',
            content: `I've analyzed your medical report using Llama 3.1. Here's what I found:`,
            timestamp: new Date(),
            specialContent: {
              type: 'summary',
              data: summaryData,
            },
          };

          const chatWithBotResponse = {
            ...updatedChat,
            messages: [...updatedChat.messages, botResponse],
          };
          setChats(chats.map((chat) => (chat.id === activeChat ? chatWithBotResponse : chat)));

          setTimeout(() => {
            const followUpMessage: Message = {
              id: (Date.now() + 2).toString(),
              type: 'bot',
              content: 'Would you like me to:\n• Show relevant educational videos about your condition\n• Find specialized hospitals nearby\n• Provide dietary recommendations\n\nJust ask me!',
              timestamp: new Date(),
            };
            setChats((prevChats) => prevChats.map((chat) => 
              chat.id === activeChat 
                ? { ...chatWithBotResponse, messages: [...chatWithBotResponse.messages, followUpMessage] } 
                : chat
            ));
          }, 1500);

        } else {
          alert("Error analyzing report: " + data.error);
        }
      } catch (error) {
        alert("Could not connect to the server.");
      } finally {
        setIsTyping(false);
      }
    }
  };

  const renderSpecialContent = (specialContent: Message['specialContent']) => {
    if (!specialContent) return null;

    switch (specialContent.type) {
      case 'summary':
        return (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-blue-900 mb-2">{specialContent.data.title}</h3>
            <ul className="space-y-1">
              {specialContent.data.items.map((item: string, index: number) => (
                <li key={index} className="text-blue-800">• {item}</li>
              ))}
            </ul>
          </div>
        );
      case 'food':
        return (
          <div className="mt-3 space-y-2">
            {specialContent.data.map((food: any, index: number) => (
              <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-900">{food.name}</p>
                <p className="text-green-700">{food.benefit}</p>
              </div>
            ))}
          </div>
        );
      case 'videos':
        return (
          <div className="mt-3 space-y-2">
            {specialContent.data.map((video: any, index: number) => (
              <a
                key={index}
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-red-50 border border-red-200 rounded-lg p-3 hover:bg-red-100 transition-colors"
              >
                <p className="text-red-900">{video.title}</p>
                <p className="text-red-700">{video.channel}</p>
              </a>
            ))}
          </div>
        );
      case 'hospitals':
        return (
          <div className="mt-3 space-y-2">
            {specialContent.data.map((hospital: any, index: number) => (
              <div key={index} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-purple-900">{hospital.name}</p>
                <p className="text-purple-700">{hospital.distance} • {hospital.specialty}</p>
                <p className="text-purple-700">Phone: {hospital.phone}</p>
              </div>
            ))}
          </div>
        );

      case 'facilities':
        return (
          <div className="mt-3 bg-teal-50 border border-teal-200 rounded-lg p-4">
            <h3 className="text-teal-900 font-bold mb-2">NGO: {specialContent.data.ngos?.join(', ') || 'N/A'}</h3>
            <p className="text-teal-800"><strong>Facilities:</strong> {specialContent.data.facilities?.join(', ')}</p>
            <p className="text-teal-800"><strong>Type:</strong> {specialContent.data.facilityTypeId} ({specialContent.data.operatorTypeId})</p>
            <p className="text-teal-800"><strong>Capacity:</strong> {specialContent.data.capacity || 'Unknown'} beds</p>
            
            {specialContent.data.specialties?.length > 0 && (
              <div className="mt-2">
                <strong className="text-teal-900">Specialties:</strong>
                <ul className="list-disc pl-5 text-teal-800">
                  {specialContent.data.specialties.map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            
            {specialContent.data.equipment?.length > 0 && (
              <div className="mt-2">
                <strong className="text-teal-900">Equipment:</strong>
                <ul className="list-disc pl-5 text-teal-800">
                  {specialContent.data.equipment.map((e: string, i: number) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        );
      

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activePage="home" />

      {/* Chat History Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-gray-800 mb-3">Chats</h2>
          <button
            onClick={createNewChat}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="size-5" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-auto p-2">
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setActiveChat(chat.id)}
              className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                activeChat === chat.id
                  ? 'bg-blue-100 border border-blue-300'
                  : 'hover:bg-gray-100'
              }`}
            >
              <p className="text-gray-800 truncate">{chat.title}</p>
              <p className="text-gray-500">{chat.lastMessage.toLocaleDateString()}</p>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
          <h1 className="text-gray-800">Chat with CareCompanion Bot</h1>
          <div className="flex gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="size-6 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <User className="size-6 text-gray-600" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 space-y-4">
          {currentChat?.messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-2xl rounded-lg p-4 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {renderSpecialContent(message.specialContent)}
                <p
                  className={`mt-2 ${
                    message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex gap-3 max-w-4xl mx-auto">
            <button
              onClick={handleFileUpload}
              className="p-3 hover:bg-gray-100 rounded-lg transition-colors"
              title="Upload Report File"
            >
              <Paperclip className="size-6 text-gray-600" />
            </button>
            <button
              onClick={handleExtractFacility}
              className="p-3 hover:bg-teal-50 rounded-lg transition-colors text-teal-600"
              title="Extract Facility Data (NGO)"
            >
              <Building className="size-6" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSendMessage}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Send className="size-5" />
              Send
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}