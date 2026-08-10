'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { User, Settings, Save, Trash2, Edit2, Undo, Redo } from 'lucide-react';
import { supabase } from '../../db/supabaseClient';
import { API_URL } from '../../lib/env';
import { useUndoRedo } from './hooks/useUndoRedo';

interface Note {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function NotepadPage() {
  // 1. Start with an empty list instead of fake data
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const {
    state: editorState,
    textAreaRef,
    handleChange,
    handleSelect,
    handleKeyDown,
    handlePaste,
    handleCut,
    handleUndo,
    handleRedo,
    reset,
    canUndo,
    canRedo
  } = useUndoRedo('');

  const currentNote = editorState.content;

  // 2. Fetch the real notes from Flask when the page loads!
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`${API_URL}/api/notes`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (!response.ok) return;
        const data = await response.json();
        const realNotes = data.map((note: { created_at?: string; createdAt?: string; updated_at?: string; updatedAt?: string; [key: string]: unknown }) => ({
          ...note,
          createdAt: new Date((note.created_at || note.createdAt) as string),
          updatedAt: new Date((note.updated_at || note.updatedAt) as string)
        })) as Note[];
        setNotes(realNotes);
      } catch {
        console.log("Could not load notes.");
      }
    };
    loadNotes();
  }, []);

  const handleSaveNote = async () => {
    if (!currentNote.trim()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      };

      if (editingNoteId) {
        const response = await fetch(`${API_URL}/api/notes/${editingNoteId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ content: currentNote }),
        });

        if (response.ok) {
          const updated = await response.json();
          setNotes(notes.map((n) => (n.id === editingNoteId ? {
            ...n,
            content: updated.content,
            updatedAt: new Date()
          } : n)));
          handleCancelEdit();
        } else {
          alert("Database connection failure or failed to update note.");
        }
      } else {
        const response = await fetch(`${API_URL}/api/notes`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ content: currentNote }),
        });
        
        if (response.ok) {
          const savedNote = await response.json();
          savedNote.createdAt = new Date(savedNote.created_at || savedNote.createdAt);
          savedNote.updatedAt = new Date(savedNote.updated_at || savedNote.updatedAt);
          setNotes([savedNote, ...notes]);
          reset('');
        } else {
          alert("Database connection failure or failed to save note.");
        }
      }
    } catch {
      alert("Database connection failure: Unable to reach backend server.");
    }
  };

  const handleEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    reset(note.content);
  };

  const handleDeleteNote = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/api/notes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (response.ok) {
        setNotes(notes.filter((note) => note.id !== id));
      } else {
        alert("Database connection failure or failed to delete note.");
      }
    } catch {
      alert("Database connection failure: Unable to reach backend server.");
    }
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    reset('');
  };

  return (
    <DashboardLayout activePage="notepad">
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
                ref={textAreaRef}
                value={currentNote}
                onChange={handleChange}
                onSelect={handleSelect}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onCut={handleCut}
                placeholder="Type your questions or notes here..."
                className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
              <div className="flex gap-3 mt-4 justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={handleUndo}
                    disabled={!canUndo}
                    className={`px-4 py-2 border border-gray-300 rounded-lg transition-colors flex items-center gap-2 ${
                      !canUndo ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <Undo className="size-4" /> Undo
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={!canRedo}
                    className={`px-4 py-2 border border-gray-300 rounded-lg transition-colors flex items-center gap-2 ${
                      !canRedo ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <Redo className="size-4" /> Redo
                  </button>
                </div>
                <div className="flex gap-3">
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
    </DashboardLayout>
  );
}
