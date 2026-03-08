import { useState } from 'react';
import { MessageSquare, Plus, Trash2, Calendar } from 'lucide-react';
import { Note } from '../lib/supabase';
import { createNote, deleteNote } from '../services/propertyService';

interface NotesSectionProps {
  propertyId: string;
  notes: Note[];
  onUpdate: () => void;
}

export default function NotesSection({ propertyId, notes, onUpdate }: NotesSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [category, setCategory] = useState<Note['category']>('general');
  const [isSaving, setIsSaving] = useState(false);

  const handleAddNote = async () => {
    if (!noteText.trim()) return;

    setIsSaving(true);
    try {
      await createNote({
        property_id: propertyId,
        note_text: noteText,
        category,
        created_by: 'User'
      });

      setNoteText('');
      setCategory('general');
      setIsAdding(false);
      onUpdate();
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await deleteNote(noteId);
      onUpdate();
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const sortedNotes = [...notes].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const categoryColors = {
    contacted: 'bg-blue-100 text-blue-700',
    no_response: 'bg-amber-100 text-amber-700',
    opted_out: 'bg-red-100 text-red-700',
    general: 'bg-slate-100 text-slate-700',
    follow_up: 'bg-green-100 text-green-700'
  };

  return (
    <div className="border-t pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <MessageSquare size={20} />
          Notes & Communications
        </h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium flex items-center gap-1"
          >
            <Plus size={16} />
            Add Note
          </button>
        )}
      </div>

      {isAdding && (
        <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Note['category'])}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="general">General</option>
                <option value="contacted">Contacted</option>
                <option value="no_response">No Response</option>
                <option value="follow_up">Follow Up</option>
                <option value="opted_out">Opted Out</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Note
              </label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                rows={3}
                placeholder="Enter your note or communication details..."
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAddNote}
                disabled={isSaving || !noteText.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isSaving ? 'Saving...' : 'Save Note'}
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNoteText('');
                  setCategory('general');
                }}
                disabled={isSaving}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {sortedNotes.length > 0 ? (
          sortedNotes.map((note) => (
            <div key={note.id} className="p-4 bg-white border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${categoryColors[note.category]}`}>
                  {note.category.replace('_', ' ').toUpperCase()}
                </span>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                  title="Delete note"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <p className="text-sm text-slate-700 mb-2">{note.note_text}</p>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Calendar size={12} />
                <span>
                  {new Date(note.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                <span>•</span>
                <span>by {note.created_by}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-slate-500">
            <MessageSquare size={48} className="mx-auto mb-2 text-slate-300" />
            <p>No notes yet</p>
            <p className="text-sm mt-1">Add a note to track communications</p>
          </div>
        )}
      </div>
    </div>
  );
}
