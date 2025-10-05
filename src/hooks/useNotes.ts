import { useState, useEffect, useCallback } from 'react';
import { nanoid } from 'nanoid';
import useAuth from '../auth/useAuth';

export type Note = {
  id: string;            // nanoid
  title?: string;        // h1 đầu hoặc nhập tay
  content: string;       // markdown
  tags: string[];
  pinned: boolean;
  createdAt: number;     // Date.now()
  updatedAt: number;     // Date.now()
  // Future: courseId, lessonId khi integrate với LMS
};

type NotesParams = {
  search?: string;
  onlyPinned?: boolean;
  sortBy?: 'newest' | 'oldest' | 'alphabetical';
};

export function useNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);

  // Get storage key based on user
  const getStorageKey = useCallback(() => {
    return `notes:${user?.uid || 'guest'}`;
  }, [user?.uid]);

  // Load notes from localStorage
  const loadNotes = useCallback(() => {
    try {
      const storageKey = getStorageKey();
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsedNotes = JSON.parse(stored);
        setNotes(Array.isArray(parsedNotes) ? parsedNotes : []);
      } else {
        setNotes([]);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      setNotes([]);
    }
  }, [getStorageKey]);

  // Save notes to localStorage
  const saveNotes = useCallback((newNotes: Note[]) => {
    try {
      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(newNotes));
      setNotes(newNotes);
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  }, [getStorageKey]);

  // Load notes on mount and when user changes
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // List notes with optional filtering
  const list = useCallback((params?: NotesParams): Note[] => {
    let filteredNotes = [...notes];

    // Search filter
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      filteredNotes = filteredNotes.filter(note => 
        note.title?.toLowerCase().includes(searchLower) ||
        note.content.toLowerCase().includes(searchLower) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Pinned filter
    if (params?.onlyPinned) {
      filteredNotes = filteredNotes.filter(note => note.pinned);
    }

    // Sorting
    const sortBy = params?.sortBy || 'newest';
    switch (sortBy) {
      case 'oldest':
        filteredNotes.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'alphabetical':
        filteredNotes.sort((a, b) => {
          const titleA = a.title || 'Untitled';
          const titleB = b.title || 'Untitled';
          return titleA.localeCompare(titleB);
        });
        break;
      case 'newest':
      default:
        filteredNotes.sort((a, b) => b.updatedAt - a.updatedAt);
        break;
    }

    // Always show pinned notes first
    return filteredNotes.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
  }, [notes]);

  // Get single note by ID
  const get = useCallback((id: string): Note | undefined => {
    return notes.find(note => note.id === id);
  }, [notes]);

  // Upsert note (create or update)
  const upsert = useCallback((input: Partial<Note> & { id?: string }): Note => {
    const now = Date.now();
    const newNotes = [...notes];

    if (input.id) {
      // Update existing note
      const index = newNotes.findIndex(note => note.id === input.id);
      if (index >= 0) {
        newNotes[index] = {
          ...newNotes[index],
          ...input,
          updatedAt: now
        };
      } else {
        // Create new note with provided ID
        const newNote: Note = {
          id: input.id,
          title: input.title || '',
          content: input.content || '',
          tags: input.tags || [],
          pinned: input.pinned || false,
          createdAt: now,
          updatedAt: now
        };
        newNotes.push(newNote);
      }
    } else {
      // Create new note with generated ID
      const newNote: Note = {
        id: nanoid(),
        title: input.title || '',
        content: input.content || '',
        tags: input.tags || [],
        pinned: input.pinned || false,
        createdAt: now,
        updatedAt: now
      };
      newNotes.push(newNote);
    }

    saveNotes(newNotes);
    return newNotes.find(note => note.id === (input.id || newNotes[newNotes.length - 1].id))!;
  }, [notes, saveNotes]);

  // Remove note
  const remove = useCallback((id: string): void => {
    const newNotes = notes.filter(note => note.id !== id);
    saveNotes(newNotes);
  }, [notes, saveNotes]);

  // Toggle pin status
  const togglePin = useCallback((id: string): void => {
    const newNotes = notes.map(note => 
      note.id === id ? { ...note, pinned: !note.pinned, updatedAt: Date.now() } : note
    );
    saveNotes(newNotes);
  }, [notes, saveNotes]);

  // Search notes
  const search = useCallback((keyword: string): Note[] => {
    if (!keyword.trim()) return notes;
    
    const searchLower = keyword.toLowerCase();
    return notes.filter(note => 
      note.title?.toLowerCase().includes(searchLower) ||
      note.content.toLowerCase().includes(searchLower) ||
      note.tags.some(tag => tag.toLowerCase().includes(searchLower))
    ).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes]);

  // Get all unique tags
  const getAllTags = useCallback((): string[] => {
    const tagSet = new Set<string>();
    notes.forEach(note => {
      note.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [notes]);

  // Get notes statistics
  const getStats = useCallback(() => {
    const total = notes.length;
    const pinned = notes.filter(note => note.pinned).length;
    const withTags = notes.filter(note => note.tags.length > 0).length;
    return { total, pinned, withTags };
  }, [notes]);

  return {
    notes,
    loading,
    list,
    get,
    upsert,
    remove,
    togglePin,
    search,
    getAllTags,
    getStats
  };
}

// TODO: Firestore Adapter
// - collection 'notes', docId `${uid}_${id}`
// - fields: { uid, courseId, lessonId, title, content, tags, pinned, updatedAt: serverTimestamp() }
// - Index: composite (uid ASC, updatedAt DESC)
