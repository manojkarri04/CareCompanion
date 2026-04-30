import { useState, useRef, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Send, Paperclip, Plus, User, Settings, AlertTriangle, CheckCircle, Code, Play } from 'lucide-react';
import { supabase } from './supabase';
import { io } from 'socket.io-client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Papa from 'papaparse'; 

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  sql?: string;
  video?: { title: string; url: string; };
  specialContent?: { type: 'summary' | 'food' | 'videos' | 'hospitals' | 'facilities'; data: any; }; 
  fileAttached?: string;
  anomalies?: string[];
  citations?: any[];
  agent_response?: {
    answer: string;
    stats: { label: string; value: number; severity: string }[];
    anomaly_warning: string | null;
    recommendation: string;
  };
  raw_data?: any[];
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

export default function ChatPage({ isGuestMode = false }: ChatPageProps) {
  const [chats, setChats] = useState<Chat[]>([
    {
      id: '1',
      title: 'Health Check - Dec 10',
      lastMessage: new Date(),
      messages: [
        {
          id: '1',
          type: 'bot',
          content: "Hello! I'm your CareCompanion AI assistant. You can ask me health questions, or ask me to search for verified hospitals!",
          timestamp: new Date(),
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

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages]);
  
  // Background Report Processing Listener
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const handleReportReady = (data: any) => {
      if (document.hidden && Notification.permission === 'granted') {
        new Notification('CareCompanion', {
          body: 'Your medical report summary is ready!',
        });
      }

      const lines = data.analysis ? data.analysis.split('\n').filter((line: string) => line.trim() !== '') : [];
      const title = lines.length > 0 ? lines[0].replace(/[*#]/g, '') : "Health Report Summary";
      const items = lines.length > 1 ? lines.slice(1).map((line: string) => line.replace(/^[-*•]\s*/, '')) : [data.analysis];

      const summaryData = {
        title: title,
        items: items.length > 0 ? items : [data.analysis]
      };

      setChats((prevChats) => prevChats.map((chat) => {
        if (chat.id === activeChat) {
          const botResponse: Message = {
            id: Date.now().toString(),
            type: 'bot',
            content: `I've analyzed your medical report in the background. Here's what I found:`,
            timestamp: new Date(),
            specialContent: {
              type: 'summary',
              data: summaryData,
            },
          };
          return { ...chat, messages: [...chat.messages, botResponse] };
        }
        return chat;
      }));
    };

    socket.on('report_ready', handleReportReady);
    return () => { socket.off('report_ready', handleReportReady); };
  }, [activeChat]);

  const checkNetworkSpeed = async () => {
    const startTime = Date.now(); 
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ping`);
      if (response.ok) return Date.now() - startTime;
      return -1;
    } catch (error) {
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
          content: 'Hello! How can I help you today?',
          timestamp: new Date(),
        },
      ],
    };
    setChats([newChat, ...chats]);
    setActiveChat(newChat.id);
  };

  // --- HACKATHON HELPERS ---
  
  const getConfidenceScore = (row: any) => {
    let score = 0;
    if (row.capability && row.capability.length > 0) score += 40;
    if (row.equipment && row.equipment.length > 0) score += 30;
    if (row.procedure && row.procedure.length > 0) score += 20;
    if (row.numberdoctors || row.capacity) score += 10;
    return score;
  };

  const downloadCSV = (data: any[], filename = 'vf_ghana_results.csv') => {
    if (!data || data.length === 0) return;
    
    // Map the raw data into clean objects for PapaParse
    const exportData = data.map(row => {
      const score = getConfidenceScore(row);
      const hasEq = row.equipment && row.equipment.length > 0;
      const hasCap = row.capability && row.capability.length > 0;
      const hasProc = row.procedure && row.procedure.length > 0;
      
      let statusText = "Partial";
      if (row.is_anomaly) statusText = "Anomaly";
      else if (!hasEq && !hasCap && !hasProc) statusText = "Desert";
      else if (hasCap && hasEq) statusText = "Documented";

      return {
        'ID': row.pk_unique_id,
        'Facility Name': row.name || 'Unknown',
        'City': row.address_city || 'Unknown',
        'Region': row.address_stateorregion || row.address_stateOrRegion || 'Unknown',
        'Confidence Score': `${score}%`,
        'Status': statusText
      };
    });

    const csvString = Papa.unparse(exportData);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename.replace('.csv', '')}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };



  const detectIntent = (msg: string): 'DATABASE' | 'IDP' | 'HEALTH' => {
  const lower = msg.toLowerCase();
  const dbKeywords = [
    'how many', 'list', 'show', 'find', 'facilities', 'hospitals', 'region',
    'ghana', 'anomal', 'equipment', 'specialty', 'specialties', 'desert',
    'coverage', 'doctors', 'capacity', 'which', 'count', 'where'
  ];
  const idpKeywords = [
    'extract', 'analyze this', 'analyse this', 'verify', 'parse',
    'facility data', 'ngo', 'procedures listed', 'document says'
  ];
  if (idpKeywords.some(k => lower.includes(k))) return 'IDP';
  if (dbKeywords.some(k => lower.includes(k))) return 'DATABASE';
  return 'HEALTH';
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
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const intent = detectIntent(userMessage.content);

  if (intent === 'IDP') {
    // Route to IDP extraction pipeline
    const response = await fetch(`${apiUrl}/api/hackathon-analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({ text: userMessage.content, fileName: 'Chat Message' }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'IDP analysis failed.');
    const botResponse: Message = {
      id: (Date.now() + 1).toString(),
      type: 'bot',
      content: 'Facility data extracted. Verification results below:',
      timestamp: new Date(),
      anomalies: data.anomalies,
      citations: data.citations,
      specialContent: { type: 'facilities', data: data.facility_data },
    };
    setChats((prevChats) => prevChats.map((chat) =>
      chat.id === activeChat
        ? { ...updatedChat, messages: [...updatedChat.messages, botResponse] }
        : chat
    ));

  } 
  else if (intent === 'DATABASE') {
    // Route to Ghana database pipeline
    const response = await fetch(`${apiUrl}/api/ask-database`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({ question: userMessage.content }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Database query failed.');
    const botResponse: Message = {
      id: (Date.now() + 1).toString(),
      type: 'bot',
      content: data.answer || 'Query complete.',
      timestamp: new Date(),
      sql: data.executed_sql,
      agent_response: {
        answer: data.answer,
        stats: data.stats || [],
        anomaly_warning: data.anomaly_warning,
        recommendation: data.recommendation,
      },
      raw_data: data.raw_data,
    };
    setChats((prevChats) => prevChats.map((chat) =>
      chat.id === activeChat
        ? { ...updatedChat, messages: [...updatedChat.messages, botResponse] }
        : chat
    ));

  } else {
    // Route to general health chat
    const response = await fetch(`${apiUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage.content,
        context: currentChat?.medicalContext || 'No report uploaded yet.',
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.reply || 'Chat failed.');
    const botResponse: Message = {
      id: (Date.now() + 1).toString(),
      type: 'bot',
      content: data.reply || 'I could not process that.',
      timestamp: new Date(),
    };
    setChats((prevChats) => prevChats.map((chat) =>
      chat.id === activeChat
        ? { ...updatedChat, messages: [...updatedChat.messages, botResponse] }
        : chat
    ));
  }
}
  catch (error: any) {
      alert(`Chat Error: ${error.message}`);
    } finally {
      setIsTyping(false);
    }
  };

  const handleExtractFacility = async () => {
    if (!inputMessage.trim() || !currentChat) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: `🏥 Analyzing Facility Data:\n${inputMessage}`,
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
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/hackathon-analyze`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ text: textToSend, fileName: 'Chat Paste' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze document. Please ensure you are logged in.");
      }

      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: "Facility data extracted and saved to the database. See verification results below:",
        timestamp: new Date(),
        anomalies: data.anomalies,
        citations: data.citations, 
        specialContent: {
          type: 'facilities',
          data: data.facility_data,
        },
      };

      setChats((prevChats) => prevChats.map((chat) => 
        chat.id === activeChat ? { ...updatedChat, messages: [...updatedChat.messages, botResponse] } : chat
      ));
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      console.error(error);
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
         return; 
      } else if (pingMs > 1000) {
        const userWantsToContinue = window.confirm(
          `Your network is very slow right now (Ping: ${pingMs}ms). The medical report upload might fail. Do you still want to try?`
        );
        if (!userWantsToContinue) return;
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

      const updatedChat = {
        ...currentChat,
        messages: [...currentChat.messages, userMessage],
        lastMessage: new Date(),
      };

      setChats(chats.map((chat) => (chat.id === activeChat ? updatedChat : chat)));
      setIsTyping(true);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`${import.meta.env.VITE_API_URL|| 'http://localhost:5000' }/api/analyze`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session?.access_token}` },
          body: formData,
        });

        const data = await response.json();

        if (response.ok || response.status === 202) {
          const botResponse: Message = {
            id: (Date.now() + 1).toString(),
            type: 'bot',
            content: data.message || "File uploaded securely! My AI is analyzing it in the background. I will notify you when the summary is ready.",
            timestamp: new Date()
          };

          setChats(chats.map((chat) => 
            chat.id === activeChat 
              ? { ...updatedChat, messages: [...updatedChat.messages, botResponse] } 
              : chat
          ));
        } else {
          alert("Error analyzing report: " + (data.error || "Unknown error"));
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
            <h3 className="text-blue-900 mb-2 font-bold">{specialContent.data.title}</h3>
            <ul className="space-y-1">
              {specialContent.data.items.map((item: string, index: number) => (
                <li key={index} className="text-blue-800 text-sm">• {item}</li>
              ))}
            </ul>
          </div>
        );
      case 'facilities':
        const facilityData = specialContent.data;
        return (
          <div className="mt-3 bg-teal-50 border border-teal-200 rounded-lg p-4 shadow-sm text-left">
            <h3 className="text-teal-900 text-lg font-bold border-b border-teal-200 pb-2 mb-2">
              {facilityData.facilityName || 'Facility Details Extracted'}
            </h3>
            
            {facilityData.specialties?.length > 0 && (
              <div className="mt-3">
                <strong className="text-teal-900 block mb-1 text-sm">Specialties:</strong>
                <div className="flex flex-wrap gap-1">
                  {facilityData.specialties.map((s: string, i: number) => (
                    <span key={i} className="bg-teal-200 text-teal-900 text-xs px-2 py-1 rounded-full font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {facilityData.equipment?.length > 0 && (
              <div className="mt-3">
                <strong className="text-teal-900 text-sm">Equipment Identified:</strong>
                <ul className="list-disc pl-5 text-teal-800 text-sm mt-1 space-y-1">
                  {facilityData.equipment.map((e: string, i: number) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            {facilityData.procedures?.length > 0 && (
              <div className="mt-3">
                <strong className="text-teal-900 text-sm">Procedures Listed:</strong>
                <ul className="list-disc pl-5 text-teal-800 text-sm mt-1 space-y-1">
                  {facilityData.procedures.map((p: string, i: number) => <li key={i}>{p}</li>)}
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
    <div className="flex h-screen bg-gray-50 font-sans">
      <Sidebar activePage="home" />

      {/* Chat History Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-gray-800 mb-3 font-bold">Chats</h2>
          <button
            onClick={createNewChat}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium shadow-sm"
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
                  ? 'bg-blue-50 border border-blue-200'
                  : 'hover:bg-gray-100'
              }`}
            >
              <p className="text-gray-800 truncate font-medium">{chat.title}</p>
              <p className="text-gray-500 text-xs mt-1">{chat.lastMessage.toLocaleDateString()}</p>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shadow-sm z-10">
          <div>
            <h1 className="text-gray-800 font-bold text-xl">CareCompanion AI</h1>
            <p className="text-xs text-gray-500">Education & Facility Coordinator</p>
          </div>
          <div className="flex gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="size-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <User className="size-5 text-gray-600" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 space-y-6 bg-slate-50">
          {currentChat?.messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-2xl p-5 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm shadow-md'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                }`}
              >
                {/* 1. Base Text Content */}
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>

                {/* --- HACKATHON: RICH IDP RENDERER --- */}
                {message.agent_response && (
                  <div className="mt-4 flex flex-col gap-4 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
                    
                    {/* 1. Stats Pills */}
                    {message.agent_response.stats && message.agent_response.stats.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {message.agent_response.stats.map((stat: any, i: number) => {
                          const colors: Record<string, string> = {
                            success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                            danger: 'bg-red-100 text-red-800 border-red-200',
                            warning: 'bg-amber-100 text-amber-800 border-amber-200',
                            normal: 'bg-slate-100 text-slate-800 border-slate-200'
                          };
                          return (
                            <span key={i} className={`px-3 py-1.5 text-xs font-bold border rounded-full shadow-sm ${colors[stat.severity] || colors.normal}`}>
                              {stat.value} · {stat.label}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* 2. Anomaly Warning Banner */}
                    {message.agent_response.anomaly_warning && (
                      <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-xl flex gap-3 items-start shadow-sm">
                        <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                        <p className="text-amber-900 text-sm font-medium m-0 leading-relaxed">{message.agent_response.anomaly_warning}</p>
                      </div>
                    )}

                    {/* 3. Regional Bar Chart (Dynamic Recharts) */}
                    {message.raw_data && message.raw_data.length > 0 && (
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mt-2">
                        <h4 className="text-sm font-bold text-slate-700 mb-4 tracking-tight">Regional Coverage Breakdown</h4>
                        <div className="h-56 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                              layout="vertical" 
                              data={Object.entries(
                                message.raw_data.reduce((acc: any, row: any) => {
                                  const region = row.address_stateorregion || row.address_stateOrRegion || 'Unknown';
                                  acc[region] = (acc[region] || 0) + 1;
                                  return acc;
                                }, {})
                              ).map(([name, count]) => ({ name, count: Number(count) }))}
                              margin={{ top: 0, right: 20, left: 40, bottom: 0 }}
                            >
                              <XAxis type="number" hide />
                              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b', fontWeight: 500}} />
                              <Tooltip 
                                cursor={{fill: '#f1f5f9'}} 
                                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                              />
                              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                                {Object.entries(message.raw_data.reduce((acc: any, row: any) => {
                                  const region = row.address_stateorregion || row.address_stateOrRegion || 'Unknown';
                                  acc[region] = (acc[region] || 0) + 1;
                                  return acc;
                                }, {})).map((entry: any, index) => (
                                  <Cell key={`cell-${index}`} fill={entry[1] >= 3 ? '#10B981' : entry[1] === 0 ? '#EF4444' : '#F59E0B'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* 4. Evidence Table (with Confidence Scores & CSV Export) */}
                    {message.raw_data && message.raw_data.length > 0 && (
                      <div className="mt-2 flex flex-col gap-2">
                        <div className="overflow-hidden border border-slate-200 rounded-xl shadow-sm">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                              <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-bold border-b border-slate-200 tracking-wider">
                                <tr>
                                  <th className="px-4 py-3">ID</th>
                                  <th className="px-4 py-3">Facility</th>
                                  <th className="px-4 py-3">Region</th>
                                  <th className="px-4 py-3">Confidence</th>
                                  <th className="px-4 py-3">Status</th>
                                  <th className="px-4 py-3">Source</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 bg-white">
                                {message.raw_data.slice(0, 10).map((row: any, i: number) => {
                                  
                                  // Status Badge Logic
                                  let statusClass = "bg-slate-100 text-slate-800 border-slate-200";
                                  let statusText = "Unknown";
                                  const hasEq = row.equipment && row.equipment.length > 0;
                                  const hasCap = row.capability && row.capability.length > 0;
                                  const hasProc = row.procedure && row.procedure.length > 0;

                                  if (row.is_anomaly) {
                                    statusClass = "bg-blue-100 text-blue-800 border-blue-200";
                                    statusText = "Anomaly";
                                  } else if (!hasEq && !hasCap && !hasProc) {
                                    statusClass = "bg-red-100 text-red-800 border-red-200";
                                    statusText = "Desert";
                                  } else if (hasCap && hasEq) {
                                    statusClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
                                    statusText = "Documented";
                                  } else {
                                    statusClass = "bg-amber-100 text-amber-800 border-amber-200";
                                    statusText = "Partial";
                                  }

                                  // Confidence Score Logic
                                  const score = getConfidenceScore(row);
                                  let scoreColor = "text-amber-600";
                                  if (score >= 70) scoreColor = "text-emerald-600";
                                  if (score < 40) scoreColor = "text-red-500";

                                  return (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-4 py-3 font-mono text-xs text-slate-400">#{row.pk_unique_id}</td>
                                      <td className="px-4 py-3 font-semibold text-slate-900">{row.name}</td>
                                      <td className="px-4 py-3">{row.address_city}, {row.address_stateorregion || row.address_stateOrRegion}</td>
                                      <td className="px-4 py-3 font-mono font-medium">
                                        <span className={scoreColor}>{score}%</span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs font-bold border rounded-md ${statusClass}`}>
                                          {statusText}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3">
                                         {row.source_url && (
                                             <a href={row.source_url} target="_blank" rel="noopener noreferrer"
                                                className="text-blue-500 hover:underline text-xs">
                                                {new URL(row.source_url).hostname.replace('www.','')}
                                               </a>
                                          )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          {message.raw_data.length > 10 && (
                            <div className="bg-slate-50 p-3 text-center text-xs text-slate-500 font-medium border-t border-slate-200">
                              Showing 10 of {message.raw_data.length} results. Use specific queries to narrow down.
                            </div>
                          )}
                        </div>
                        
                        {/* CSV Export Button */}
                        <div className="flex justify-end">
                          <button 
                            onClick={() => downloadCSV(message.raw_data || [])}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                            Export Results as CSV
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 5. Recommendation Box */}
                    {message.agent_response.recommendation && (
                      <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded-r-xl mt-2 shadow-sm">
                        <p className="text-teal-900 text-xs font-bold uppercase mb-1 tracking-wide">Suggested Action</p>
                        <p className="text-teal-800 text-sm font-medium m-0 leading-relaxed">{message.agent_response.recommendation}</p>
                      </div>
                    )}

                  </div>
                )}
                {/* --- END HACKATHON RENDERER --- */}

                {/* 2. Hackathon: Education Path (Video Recommendation) */}
                {message.video && (
                  <a 
                    href={message.video.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center gap-4 bg-red-50 border border-red-200 p-4 rounded-xl hover:bg-red-100 transition-colors max-w-md no-underline group"
                  >
                    <div className="bg-red-600 group-hover:bg-red-700 text-white p-3 rounded-full shrink-0 transition-colors shadow-sm">
                      <Play size={20} fill="currentColor" />
                    </div>
                    <div>
                      <p className="text-red-900 font-bold text-sm m-0 leading-tight mb-1">Recommended Video</p>
                      <p className="text-red-700 text-sm m-0 line-clamp-2">{message.video.title}</p>
                    </div>
                  </a>
                )}

                {/* 3. Hackathon: Coordination Path (SQL Transparency) */}
                {message.sql && (
                  <details className="mt-4 cursor-pointer outline-none group">
                    <summary className="text-xs font-bold text-blue-600 flex items-center gap-1 select-none hover:text-blue-800 transition-colors">
                      <Code size={14} /> View Agent Reasoning (SQL)
                    </summary>
                    <div className="mt-2 bg-slate-900 text-green-400 text-xs p-4 rounded-xl overflow-x-auto font-mono text-left shadow-inner">
                      {message.sql}
                    </div>
                  </details>
                )}

                {/* 4. Hackathon: IDP Pipeline Anomalies */}
                {message.anomalies && message.anomalies.length > 0 && (
                  <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm">
                    <h3 className="text-red-800 font-bold text-sm mb-2 flex items-center gap-2">
                      <AlertTriangle size={18} /> Critical Anomalies Detected
                    </h3>
                    <ul className="list-disc pl-5 text-red-700 text-sm space-y-1 text-left">
                      {message.anomalies.map((anomaly: string, idx: number) => (
                        <li key={idx}>{anomaly}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {message.anomalies && message.anomalies.length === 0 && (
                  <div className="mt-4 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl shadow-sm flex items-center gap-2">
                    <CheckCircle size={18} className="text-green-600" />
                    <h3 className="text-green-800 font-bold text-sm m-0">Facility Verified - No Discrepancies</h3>
                  </div>
                )}

                {/* 5. Special Formatting Data (JSON Tables/Lists) */}
                {renderSpecialContent(message.specialContent)}

                {/* Timestamp */}
                <p className={`mt-3 text-xs font-medium ${message.type === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm p-5 shadow-sm">
                <div className="flex gap-2">
                  <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                  <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex gap-3 max-w-5xl mx-auto">
            <button
              onClick={handleFileUpload}
              className="p-3 hover:bg-gray-100 rounded-xl transition-colors text-gray-500 hover:text-blue-600"
              title="Upload Patient Report"
            >
              <Paperclip className="size-6" />
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
              placeholder="Ask a medical question, search for a hospital, or paste text to verify..."
              className="flex-1 px-5 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-400"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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