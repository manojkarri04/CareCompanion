import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar'; // You might need to adjust this path depending on where Sidebar is
import { User, Settings, Save, Trash2, Edit2 } from 'lucide-react';

interface Note {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function NotepadPage() {
  // 1. Start with an empty list instead of fake data
  const [notes, setNotes] = useState<Note[]>([]);

  const [currentNote, setCurrentNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // 2. Fetch the real notes from Flask when the page loads!
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/notes`)
      .then((response) => response.json())
      .then((data) => {
        // We have to turn the date text back into real Date objects for React
        const realNotes = data.map((note: any) => ({
          ...note,
          createdAt: new Date(note.createdAt),
          updatedAt: new Date(note.updatedAt)
        }));
        setNotes(realNotes);
      })
      .catch((error) => console.log("Oops, could not load notes:", error));
  }, []);

  const handleSaveNote = async () => {
    if (!currentNote.trim()) return;

    if (editingNoteId) {
      // We will fix the edit button later!
      console.log("Editing is not connected to Flask yet.");
    } else {
      // Send the new note to Flask!
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json', // Telling Flask we are sending text data
          },
          body: JSON.stringify({ content: currentNote }), // The actual note text
        });
        
        if (response.ok) {
          const savedNote = await response.json();
          
          // Turn the text dates back into real Dates
          savedNote.createdAt = new Date(savedNote.createdAt);
          savedNote.updatedAt = new Date(savedNote.updatedAt);
          
          // Add the new note to the top of the screen
          setNotes([savedNote, ...notes]);
          setCurrentNote(''); // Clear the typing box
        }
      } catch (error) {
        console.log("Oops, could not save the note:", error);
      }
    }
  };

  const handleEditNote = (note: Note) => {
    setCurrentNote(note.content);
    setEditingNoteId(note.id);
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter((note) => note.id !== id));
  };

  const handleCancelEdit = () => {
    setCurrentNote('');
    setEditingNoteId(null);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activePage="notepad" />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
          <h1 className="text-gray-800">Your Notepad</h1>
          <div className="flex gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="size-6 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <User className="size-6 text-gray-600" />
            </button>
          </div>
        </header>

        <div className="p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* New Note Section */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-gray-800 mb-4">
                {editingNoteId ? 'Edit Note' : 'Write a New Note'}
              </h2>
              <textarea
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                placeholder="Type your questions or notes here..."
                className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
              <div className="flex gap-3 mt-4">
                {editingNoteId && (
                  <button
                    onClick={handleCancelEdit}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleSaveNote}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Save className="size-5" />
                  {editingNoteId ? 'Update Note' : 'Save Note'}
                </button>
              </div>
            </div>

            {/* Previous Notes Section */}
            <div>
              <h2 className="text-gray-800 mb-4">Previous Notes</h2>
              {notes.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                  <p className="text-gray-500">No previous notes found.</p>
                  <p className="text-gray-400 mt-2">Start by writing your first note above.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-gray-600">
                            {note.createdAt.toLocaleDateString()} at{' '}
                            {note.createdAt.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          {note.updatedAt.getTime() !== note.createdAt.getTime() && (
                            <p className="text-gray-500">
                              (Updated: {note.updatedAt.toLocaleDateString()})
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditNote(note)}
                            className="p-2 hover:bg-blue-100 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="size-5 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-2 hover:bg-red-100 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="size-5 text-red-600" />
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-800 whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
