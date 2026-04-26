import { useState , useEffect } from 'react';
import Sidebar from './Sidebar';
import { User, Settings, Search, FileText, Download, Trash2, File, Image } from 'lucide-react';
import { supabase } from './supabase';

interface Document {
  id: string;
  fileName: string;
  uploadDate: Date;
  fileType: 'pdf' | 'image' | 'document';
  fileSize: string;
}

interface SavedDocumentsPageProps {
  isGuestMode?: boolean;
}

export default function SavedDocumentsPage({ isGuestMode = false }: SavedDocumentsPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  
  // Mock data for saved documents
  const [documents, setDocuments] = useState<Document[]>([
    // {
    //   id: '6',
    //   fileName: 'Kidney_Function_Test.pdf',
    //   uploadDate: new Date('2024-02-15'),
    //   fileType: 'pdf',
    //   fileSize: '1.5 MB'
    // }
  ]);
  // 2. Run this exactly once when the page loads
  useEffect(() => {
    fetchDocuments();
  }, []);

const fetchDocuments = async () => {
    try {
      // 1. Get the ID Badge from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      // 2. Show the badge to Flask
      const response = await fetch('http://localhost:5000/api/documents', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await response.json();
      // 3. Format the dates
      const formattedData = data.map((doc: any) => ({
        ...doc,
        // Make sure we use upload_date because Supabase uses underscores!
        uploadDate: new Date(doc.upload_date || doc.uploadDate) 
      }));
      setDocuments(formattedData);
    }
     catch (error)
    {
      console.error("Error fetching documents:", error);
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="size-10 text-red-500" />;
      case 'image':
        return <Image className="size-10 text-blue-500" />;
      default:
        return <File className="size-10 text-gray-500" />;
    }
  };

  // const handleDelete = (id: string) => {
  //   if (confirm('Are you sure you want to delete this document?')) {
  //     setDocuments(documents.filter(doc => doc.id !== id));
  //   }
  // };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this document?'))
    {
      try {
        // 1. Get the ID badge
        const { data: { session } } = await supabase.auth.getSession();
        
        // 2. Tell Flask to delete it from the database AND cloud storage
        await fetch(`http://localhost:5000/api/documents/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });

        // 3. If Flask successfully deletes it, remove it from the screen
        setDocuments(documents.filter(doc => doc.id !== id));
      } 
      catch (error) {
        console.error("Error deleting document:", error);
        alert("Could not delete the document.");
      }
    }
  };
   
  // ACTION 1: View the file in a new browser tab
  // const handleView = (fileName: string) => {
  //   // We just open a new tab pointing directly to our Flask file route
  //   alert(`Opening ${fileName}...`);
  //   const fileUrl = `http://localhost:5000/api/documents/file/${fileName}`;
  //   window.open(fileUrl, '_blank');
  // };

  const handleView = async (fileName: string) => {
    try {
      alert(`Opening ${fileName} securely...`);
      // 1. Get the badge
      const { data: { session } } = await supabase.auth.getSession();
      
      // 2. Securely fetch the file data
      const response = await fetch(`http://localhost:5000/api/documents/file/${fileName}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      if (!response.ok) throw new Error("Failed to load file.");

      // 3. Turn the raw data into a Blob (a temporary browser file)
      const blob = await response.blob();
      // 4. Create a safe, temporary link to that Blob
      const localUrl = window.URL.createObjectURL(blob);
      // 5. Open that temporary link in a new tab!
      window.open(localUrl, '_blank');
    }

    catch (error)
    {
      console.error("Error viewing document:", error);
      alert("Could not open the document.");
    }
  };


    const handleDownload = async (fileName: string) => {
    try {
      // 1. The fetch request WITH your secret security token
      // Get the badge officially
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`http://localhost:5000/api/documents/file/${fileName}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session?.access_token}` 
        }
      });

      if (!response.ok) {
        throw new Error("Failed to download file securely.");
      }

      // 2. Catch the raw binary data and turn it into a Blob
      const blob = await response.blob();

      // 3. Create a temporary, secure local URL for that Blob
      const localUrl = window.URL.createObjectURL(blob);

      // 4. The Invisible Link Trick!
      const link = document.createElement('a');
      link.href = localUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 5. Clean up the memory immediately after the download starts
      window.URL.revokeObjectURL(localUrl);

    } catch (error) {
      console.error("Secure download failed:", error);
      alert("Error downloading your private document.");
    }
  };


  // Filter and sort documents
  const filteredDocuments = documents
    .filter(doc => 
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'date') {
        return b.uploadDate.getTime() - a.uploadDate.getTime();
      } else {
        return a.fileName.localeCompare(b.fileName);
      }
    });

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activePage="saved-docs" />
      
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-end items-center gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings className="size-6 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <User className="size-6 text-gray-600" />
          </button>
        </header>

        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-gray-800 mb-8">Saved Documents</h1>

            {/* Search and Sort Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="date">Date</option>
                    <option value="name">Name</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Documents Grid */}
            {filteredDocuments.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <FileText className="size-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchQuery ? 'No documents found matching your search.' : 'No documents uploaded yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between gap-6">
                      {/* Left Section - File Info */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="shrink-0">
                          {getFileIcon(doc.fileType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-gray-900 truncate mb-1">
                            {doc.fileName}
                          </h3>
                          <div className="flex items-center gap-3 text-gray-500">
                            <span>
                              {doc.uploadDate.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                            <span>•</span>
                            <span>{doc.fileSize}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Section - Action Buttons */}
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() => handleView(doc.fileName)}
                          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                        >
                          <FileText className="size-4" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => handleDownload(doc.fileName)}
                          className="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                        >
                          <Download className="size-4" />
                          <span>Download</span>
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                        >
                          <Trash2 className="size-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}