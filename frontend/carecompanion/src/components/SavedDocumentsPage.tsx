import { useState } from 'react';
import Sidebar from './Sidebar';
import { User, Settings, Search, FileText, Download, Trash2, File, Image } from 'lucide-react';

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
    {
      id: '1',
      fileName: 'Blood_Test_Results_Diabetes.pdf',
      uploadDate: new Date('2024-03-15'),
      fileType: 'pdf',
      fileSize: '2.4 MB'
    },
    {
      id: '2',
      fileName: 'Cardiac_ECG_Report.pdf',
      uploadDate: new Date('2024-03-10'),
      fileType: 'pdf',
      fileSize: '1.8 MB'
    },
    {
      id: '3',
      fileName: 'Thyroid_Panel_Results.pdf',
      uploadDate: new Date('2024-03-05'),
      fileType: 'pdf',
      fileSize: '1.2 MB'
    },
    {
      id: '4',
      fileName: 'X_Ray_Chest.jpg',
      uploadDate: new Date('2024-02-28'),
      fileType: 'image',
      fileSize: '3.5 MB'
    },
    {
      id: '5',
      fileName: 'Prescription_March_2024.pdf',
      uploadDate: new Date('2024-02-20'),
      fileType: 'pdf',
      fileSize: '980 KB'
    },
    {
      id: '6',
      fileName: 'Kidney_Function_Test.pdf',
      uploadDate: new Date('2024-02-15'),
      fileType: 'pdf',
      fileSize: '1.5 MB'
    }
  ]);

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

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      setDocuments(documents.filter(doc => doc.id !== id));
    }
  };

  const handleView = (fileName: string) => {
    alert(`Opening ${fileName}...`);
  };

  const handleDownload = (fileName: string) => {
    alert(`Downloading ${fileName}...`);
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