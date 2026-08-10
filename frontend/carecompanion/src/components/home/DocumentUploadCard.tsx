// We are extracting the useRef for the hidden input, the isUploading state, and the entire handleFileChange Supabase upload function. By putting it here, the main page doesn't need to know how the file uploads, it just renders the card.
'use client';

// components/DocumentUploadCard.tsx
import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { supabase } from '../../db/supabaseClient';
import { API_URL } from '../../lib/env';

export default function DocumentUploadCard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);


  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      const formData = new FormData();
      formData.append('file', selectedFile);

      setIsUploading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const apiUrl = API_URL;
        const response = await fetch(`${apiUrl}/api/analyze`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: formData,
        });

        if (response.ok || response.status === 202) {
          alert("🎉 Document uploaded successfully! AI is analyzing your report in the background.");
        } else {
          const errData = await response.json().catch(() => ({}));
          alert("🚨 Database Connection Failure: " + (errData.error || "Unable to upload document to database."));
        }
      } catch {
        alert("🚨 Database Connection Failure: Unable to reach server.");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <button
        onClick={handleUploadClick}
        disabled={isUploading}
        className={`bg-white border-2 border-blue-600 rounded-xl p-8 transition-all shadow-lg group w-full ${
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

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.txt"
      />
    </>
  );
}