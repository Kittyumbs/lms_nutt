import { useState, useEffect, useCallback } from 'react';
import { nanoid } from 'nanoid';
import useAuth from '../auth/useAuth';

export type Note = {
  id: string;            // `${courseId}_${lessonId}` or nanoid
  courseId?: string;     // optional để có note chung không gắn lesson
  lessonId?: string;
  title?: string;        // h1 đầu hoặc nhập tay
  content: string;       // markdown
  tags: string[];
  pinned: boolean;
  updatedAt: number;     // Date.now()
};

type NotesParams = {
  search?: string;
  courseId?: string;
  lessonId?: string;
  onlyPinned?: boolean;
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

    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      filteredNotes = filteredNotes.filter(note => 
        note.title?.toLowerCase().includes(searchLower) ||
        note.content.toLowerCase().includes(searchLower) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    if (params?.courseId) {
      filteredNotes = filteredNotes.filter(note => note.courseId === params.courseId);
    }

    if (params?.lessonId) {
      filteredNotes = filteredNotes.filter(note => note.lessonId === params.lessonId);
    }

    if (params?.onlyPinned) {
      filteredNotes = filteredNotes.filter(note => note.pinned);
    }

    // Sort by updatedAt descending (newest first)
    return filteredNotes.sort((a, b) => b.updatedAt - a.updatedAt);
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
          courseId: input.courseId,
          lessonId: input.lessonId,
          title: input.title || '',
          content: input.content || '',
          tags: input.tags || [],
          pinned: input.pinned || false,
          updatedAt: now
        };
        newNotes.push(newNote);
      }
    } else {
      // Create new note with generated ID
      const newNote: Note = {
        id: nanoid(),
        courseId: input.courseId,
        lessonId: input.lessonId,
        title: input.title || '',
        content: input.content || '',
        tags: input.tags || [],
        pinned: input.pinned || false,
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

  // Mock course data for filtering
  const allCourses = useCallback((): { courseId: string; name: string }[] => {
    // Extract unique courses from notes
    const courseMap = new Map<string, string>();
    notes.forEach(note => {
      if (note.courseId && !courseMap.has(note.courseId)) {
        courseMap.set(note.courseId, `Course ${note.courseId.slice(-4)}`);
      }
    });
    
    return Array.from(courseMap.entries()).map(([courseId, name]) => ({
      courseId,
      name
    }));
  }, [notes]);

  // Mock lesson data for filtering
  const allLessons = useCallback((courseId?: string): { lessonId: string; name: string }[] => {
    if (!courseId) return [];
    
    // Extract unique lessons for the given course
    const lessonMap = new Map<string, string>();
    notes.forEach(note => {
      if (note.courseId === courseId && note.lessonId && !lessonMap.has(note.lessonId)) {
        lessonMap.set(note.lessonId, `Lesson ${note.lessonId.slice(-4)}`);
      }
    });
    
    return Array.from(lessonMap.entries()).map(([lessonId, name]) => ({
      lessonId,
      name
    }));
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
    allCourses,
    allLessons
  };
}

// TODO: Firestore Adapter
// - collection 'notes', docId `${uid}_${id}`
// - fields: { uid, courseId, lessonId, title, content, tags, pinned, updatedAt: serverTimestamp() }
// - Index: composite (uid ASC, updatedAt DESC)
