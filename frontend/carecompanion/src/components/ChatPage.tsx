import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Send, Paperclip, Plus, User, Settings } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  specialContent?: {
    type: 'summary' | 'food' | 'videos' | 'hospitals';
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

export default function ChatPage() {
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
    // Mock analysis based on common file naming patterns
    const lowerFileName = fileName.toLowerCase();
    
    // Detect condition type from filename or simulate OCR analysis
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
      // Default general health report
      return {
        condition: 'general',
        medications: [],
        concerns: ['Overall health'],
      };
    }
  };

  const getContextualVideos = (condition: string) => {
    const videoDatabase: Record<string, any[]> = {
      diabetes: [
        { title: 'Understanding Diabetes: Complete Guide', channel: 'Mayo Clinic', url: 'https://www.youtube.com/watch?v=wZAjVQWbMlE' },
        { title: 'Best Foods for Diabetes Management', channel: 'Diabetes Strong', url: 'https://www.youtube.com/watch?v=c7xW3jB_4Qs' },
        { title: 'Exercise for Type 2 Diabetes', channel: 'Dr. Berg', url: 'https://www.youtube.com/watch?v=FMSXtTZPHtE' },
        { title: 'How to Monitor Blood Sugar Correctly', channel: 'Cleveland Clinic', url: 'https://www.youtube.com/watch?v=mMyPFZ14OhE' },
      ],
      cardiovascular: [
        { title: 'Heart Disease Prevention Tips', channel: 'American Heart Association', url: 'https://www.youtube.com/watch?v=RyY4Ai7R8xQ' },
        { title: 'Cardio Exercises for Heart Health', channel: 'Heart Foundation', url: 'https://www.youtube.com/watch?v=ml6cT4AZdqI' },
        { title: 'Understanding Your Blood Pressure', channel: 'Mayo Clinic', url: 'https://www.youtube.com/watch?v=EWjRDvYpJmE' },
        { title: 'Heart-Healthy Mediterranean Diet', channel: 'Nutrition Facts', url: 'https://www.youtube.com/watch?v=30gEiweaAVQ' },
      ],
      thyroid: [
        { title: 'Thyroid Problems Explained', channel: 'Dr. Eric Berg', url: 'https://www.youtube.com/watch?v=4VxP_JJTgNw' },
        { title: 'Foods to Support Thyroid Health', channel: 'Thomas DeLauer', url: 'https://www.youtube.com/watch?v=okNq1fmFVH8' },
        { title: 'Managing Hypothyroidism Naturally', channel: 'Dr. Josh Axe', url: 'https://www.youtube.com/watch?v=4VxP_JJTgNw' },
      ],
      kidney: [
        { title: 'Kidney Disease: What You Need to Know', channel: 'National Kidney Foundation', url: 'https://www.youtube.com/watch?v=FhkxzRxHsJk' },
        { title: 'Best Diet for Kidney Health', channel: 'Kidney Dietitian', url: 'https://www.youtube.com/watch?v=eRMOBSO3_5E' },
        { title: 'Exercises Safe for Kidney Patients', channel: 'DaVita Kidney Care', url: 'https://www.youtube.com/watch?v=yNLdcfbAFXM' },
      ],
      general: [
        { title: '10-Minute Morning Yoga Routine', channel: 'Yoga with Adriene', url: 'https://www.youtube.com/watch?v=VaoV1PrYft4' },
        { title: 'Full Body Workout at Home', channel: 'FitnessBlender', url: 'https://www.youtube.com/watch?v=ml6cT4AZdqI' },
        { title: 'Healthy Eating for Beginners', channel: 'Pick Up Limes', url: 'https://www.youtube.com/watch?v=hJNF2_dCWkg' },
      ],
    };

    return videoDatabase[condition] || videoDatabase.general;
  };

  const getSpecializedHospitals = (condition: string) => {
    const hospitalDatabase: Record<string, any[]> = {
      diabetes: [
        { name: 'Diabetes Care Center', distance: '0.9 miles', specialty: 'Endocrinology & Diabetes', phone: '(555) 123-4567' },
        { name: 'City General Hospital - Diabetes Unit', distance: '1.2 miles', specialty: 'Comprehensive Diabetes Care', phone: '(555) 234-5678' },
        { name: 'Wellness Endocrine Clinic', distance: '2.1 miles', specialty: 'Hormone & Metabolic Disorders', phone: '(555) 345-6789' },
      ],
      cardiovascular: [
        { name: 'Heart & Vascular Institute', distance: '1.4 miles', specialty: 'Cardiology & Cardiac Surgery', phone: '(555) 111-2222' },
        { name: 'St. Mary\'s Cardiac Center', distance: '2.5 miles', specialty: 'Advanced Cardiac Care', phone: '(555) 222-3333' },
        { name: 'Regional Heart Hospital', distance: '3.2 miles', specialty: 'Interventional Cardiology', phone: '(555) 333-4444' },
      ],
      thyroid: [
        { name: 'Thyroid & Endocrine Specialists', distance: '1.1 miles', specialty: 'Thyroid Disorders', phone: '(555) 444-5555' },
        { name: 'Metro Endocrinology Center', distance: '1.8 miles', specialty: 'Hormone Therapy', phone: '(555) 555-6666' },
        { name: 'City General Hospital - Endocrine Dept', distance: '2.3 miles', specialty: 'General Endocrinology', phone: '(555) 666-7777' },
      ],
      kidney: [
        { name: 'Renal Care Specialists', distance: '1.0 miles', specialty: 'Nephrology & Dialysis', phone: '(555) 777-8888' },
        { name: 'Kidney Disease Treatment Center', distance: '1.7 miles', specialty: 'Chronic Kidney Disease', phone: '(555) 888-9999' },
        { name: 'University Medical Center - Nephrology', distance: '2.9 miles', specialty: 'Advanced Kidney Care', phone: '(555) 999-0000' },
      ],
      general: [
        { name: 'City General Hospital', distance: '1.2 miles', specialty: 'General & Emergency Care', phone: '(555) 100-2000' },
        { name: 'Community Health Clinic', distance: '0.8 miles', specialty: 'Primary Care', phone: '(555) 200-3000' },
        { name: 'St. Mary\'s Medical Center', distance: '2.5 miles', specialty: 'Multi-Specialty Hospital', phone: '(555) 300-4000' },
      ],
    };

    return hospitalDatabase[condition] || hospitalDatabase.general;
  };

  // const generateBotResponse = (userMessage: string, context?: any): Message => {
  //   const lowerMessage = userMessage.toLowerCase();
    
  //   // Check if this is a file upload context
  //   if (context?.isFileUpload && context?.fileName) {
  //     const analysis = analyzeMedicalReport(context.fileName);
      
  //     // First: Summary message
  //     const summaryData = {
  //       diabetes: {
  //         title: 'Diabetes Report Analysis',
  //         items: [
  //           'HbA1c: 7.2% (Target: <7.0%) - Slightly elevated',
  //           'Fasting Blood Glucose: 135 mg/dL (Target: 80-130 mg/dL)',
  //           'Average Blood Sugar: 165 mg/dL over last 3 months',
  //           'Recommendation: Review diet and medication with endocrinologist',
  //           'Consider increasing physical activity to 150 min/week',
  //         ],
  //       },
  //       cardiovascular: {
  //         title: 'Cardiovascular Assessment',
  //         items: [
  //           'Blood Pressure: 138/88 mmHg (Stage 1 Hypertension)',
  //           'Total Cholesterol: 215 mg/dL (Borderline high)',
  //           'LDL Cholesterol: 145 mg/dL (Above optimal)',
  //           'HDL Cholesterol: 48 mg/dL (Low - Target: >60 mg/dL)',
  //           'Recommendation: Lifestyle modifications and medication review',
  //         ],
  //       },
  //       thyroid: {
  //         title: 'Thyroid Function Test Results',
  //         items: [
  //           'TSH: 4.8 mIU/L (Borderline high)',
  //           'Free T4: 0.9 ng/dL (Low normal)',
  //           'Free T3: 2.5 pg/mL (Normal)',
  //           'Thyroid antibodies: Negative',
  //           'Recommendation: Monitor and discuss medication adjustment',
  //         ],
  //       },
  //       kidney: {
  //         title: 'Kidney Function Analysis',
  //         items: [
  //           'eGFR: 68 mL/min/1.73m² (Mild reduction)',
  //           'Creatinine: 1.4 mg/dL (Slightly elevated)',
  //           'BUN: 22 mg/dL (Normal)',
  //           'Protein in urine: Trace amounts detected',
  //           'Recommendation: Nephrology consultation recommended',
  //         ],
  //       },
  //       general: {
  //         title: 'Health Report Summary',
  //         items: [
  //           'Overall health status: Good',
  //           'Blood pressure: 120/80 mmHg (Normal)',
  //           'Cholesterol: 180 mg/dL (Optimal)',
  //           'Blood sugar: 95 mg/dL (Normal)',
  //           'Vitamin D: Slightly low - consider supplementation',
  //         ],
  //       },
  //     };

    //   return {
    //     id: Date.now().toString(),
    //     type: 'bot',
    //     content: `I've analyzed your medical report. Here's what I found:`,
    //     timestamp: new Date(),
    //     specialContent: {
    //       type: 'summary',
    //       data: summaryData[analysis.condition as keyof typeof summaryData] || summaryData.general,
    //     },
    //   };
    // }
    
    // Handle requests for videos based on context
    if (lowerMessage.includes('video') || lowerMessage.includes('exercise') || lowerMessage.includes('youtube')) {
      // Try to get condition from chat context
      const condition = currentChat?.medicalContext?.conditions[0] || 'general';
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: `Based on your health profile, here are relevant educational videos:`,
        timestamp: new Date(),
        specialContent: {
          type: 'videos',
          data: getContextualVideos(condition),
        },
      };
    }
    
    // Handle requests for hospitals
    if (lowerMessage.includes('hospital') || lowerMessage.includes('doctor') || lowerMessage.includes('specialist') || lowerMessage.includes('clinic')) {
      const condition = currentChat?.medicalContext?.conditions[0] || 'general';
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: `Here are specialized medical facilities near you:`,
        timestamp: new Date(),
        specialContent: {
          type: 'hospitals',
          data: getSpecializedHospitals(condition),
        },
      };
    }
    
    // Handle food/diet requests
    if (lowerMessage.includes('food') || lowerMessage.includes('diet') || lowerMessage.includes('eat') || lowerMessage.includes('meal')) {
      const condition = currentChat?.medicalContext?.conditions[0] || 'general';
      const dietData: Record<string, any[]> = {
        diabetes: [
          { name: 'Non-starchy vegetables (Broccoli, Spinach, Cauliflower)', benefit: 'Low in carbs, high in fiber and nutrients' },
          { name: 'Lean proteins (Chicken, Fish, Tofu)', benefit: 'Helps stabilize blood sugar levels' },
          { name: 'Whole grains (Quinoa, Brown rice, Oats)', benefit: 'Complex carbs with lower glycemic index' },
          { name: 'Healthy fats (Avocado, Nuts, Olive oil)', benefit: 'Improves insulin sensitivity' },
          { name: 'Berries (Blueberries, Strawberries)', benefit: 'High in antioxidants, lower sugar content' },
        ],
        cardiovascular: [
          { name: 'Fatty fish (Salmon, Mackerel, Sardines)', benefit: 'Omega-3 fatty acids reduce inflammation' },
          { name: 'Leafy greens (Kale, Spinach, Collards)', benefit: 'Rich in nitrates, lower blood pressure' },
          { name: 'Berries (Blueberries, Strawberries)', benefit: 'Antioxidants improve vascular function' },
          { name: 'Nuts (Almonds, Walnuts)', benefit: 'Lower LDL cholesterol naturally' },
          { name: 'Olive oil', benefit: 'Monounsaturated fats protect heart health' },
        ],
        general: [
          { name: 'Leafy greens (Spinach, Kale)', benefit: 'Rich in vitamins and minerals' },
          { name: 'Fatty fish (Salmon, Sardines)', benefit: 'High in Omega-3 fatty acids' },
          { name: 'Nuts and seeds', benefit: 'Good source of healthy fats' },
          { name: 'Berries', benefit: 'High in antioxidants' },
          { name: 'Whole grains', benefit: 'Provides sustained energy' },
        ],
      };
      
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: `Based on your health condition, here are recommended foods:`,
        timestamp: new Date(),
        specialContent: {
          type: 'food',
          data: dietData[condition] || dietData.general,
        },
      };
    }
    
    // Default response
    return {
      id: Date.now().toString(),
      type: 'bot',
      content: 'I can help you with:\n• Analyzing your medical reports (upload a file)\n• Providing personalized dietary suggestions\n• Finding relevant health education videos\n• Locating specialized medical facilities\n• Answering health-related questions\n\nWhat would you like to know more about?',
      timestamp: new Date(),
    };
  };

   
const handleSendMessage = async () => {
    if (!inputMessage.trim() || !currentChat) return;

    // 1. Show the user's message immediately on the screen
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
    setIsTyping(true); // Turn on the bouncing dots!

    try {
      // 2. Send the message to your new Flask AI route
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      });

      const data = await response.json();
      let replyText = data.reply;
      let videoData: any[] = [];

      // 3. The Translator: Look for our "VIDEO:" tags to extract the AI's recommendations
      if (replyText.includes('VIDEO:')) {
        const lines = replyText.split('\n');
        const newLines = [];

        for (const line of lines) {
          // If the line is a video, chop it up into Title, Channel, and URL
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
            // If it's normal conversational text, keep it!
            newLines.push(line);
          }
        }
        replyText = newLines.join('\n').trim(); 
      }

      // 4. Build the final bot message with the UI cards
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

      // 5. Update the chat window
      setChats((prevChats) => prevChats.map((chat) => 
        chat.id === activeChat 
          ? { ...updatedChat, messages: [...updatedChat.messages, botResponse] } 
          : chat
      ));

    } catch (error) {
      alert("Could not connect to the chat server. Is Flask running?");
    } finally {
      setIsTyping(false); // Turn off the bouncing dots
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && currentChat) {
      const file = files[0];
      const fileName = file.name;

      // 1. Show the user's uploaded file message in the chat right away
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: `📎 Uploaded: ${fileName}`,
        timestamp: new Date(),
        fileAttached: fileName,
      };

      // We still use this to guess the topic so your helpful videos stay relevant!
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
      setIsTyping(true); // Turn on the typing animation while Llama thinks

      // 2. Package the file and send it to your real Flask backend
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/analyze`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (response.ok) {
          // 3. Take Llama's raw text and split it into a clean Title and Bullet Points
          const lines = data.analysis.split('\n').filter((line: string) => line.trim() !== '');
          const title = lines[0].replace(/[*#]/g, ''); // Grab the first line and remove bold marks
          const items = lines.slice(1).map((line: string) => line.replace(/^[-*•]\s*/, '')); // Grab the rest

          const summaryData = {
            title: title || "Health Report Summary",
            items: items.length > 0 ? items : [data.analysis]
          };

          // 4. Create the final Bot message with the beautiful blue box
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

          // 5. Send the helpful follow-up options a second later
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
        setIsTyping(false); // Turn off the typing animation
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
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
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