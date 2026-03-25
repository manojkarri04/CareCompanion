import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Upload, MessageCircle, User, Settings } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // New memory states to show loading and the AI result
  const [isUploading, setIsUploading] = useState(false);
  const [, setAiSummary] = useState<string | null>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // This runs when you select a file from your computer
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      
      // Package the file to send over the internet
      const formData = new FormData();
      formData.append('file', selectedFile);

      setIsUploading(true);
      setAiSummary(null);

      try {
        // Send it to Flask!
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/analyze`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (response.ok) {
          // Save the AI answer to show on the screen
          setAiSummary(data.analysis);
        } else {
          alert("❌ " + data.error);
        }
      } catch (error) {
        alert("🔌 Cannot connect to the server.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleChatClick = () => {
    navigate('/chat');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activePage="home" />
      
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-end items-center gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings className="size-6 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <User className="size-6 text-gray-600" />
          </button>
        </header>

        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-8">
          <div className="max-w-4xl w-full">
            <h1 className="text-center text-gray-800 mb-4">Welcome to CareCompanion</h1>
            <p className="text-center text-gray-600 mb-12">
              Your personal health management assistant
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={handleUploadClick}
                disabled={isUploading}
                className={`bg-white border-2 border-blue-600 rounded-xl p-8 transition-all shadow-lg group ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50 hover:shadow-xl'
                }`}
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-blue-100 p-6 rounded-full group-hover:bg-blue-200 transition-colors">
                    <Upload className="size-12 text-blue-600" />
                  </div>
                  <h2 className="text-blue-900">
                    {isUploading ? 'Analyzing Report...' : 'Upload to Save Documents'}
                  </h2>
                  <p className="text-gray-600 text-center">
                    Securely store your health reports and medical documents
                  </p>
                </div>
              </button>

              <button
                onClick={handleChatClick}
                className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-8 hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl group"
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
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.txt"
        />
      </main>
    </div>
  );
}