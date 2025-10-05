import { useState, useEffect, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { 
  collection, 
  query, 
  orderBy, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import useAuth from '../auth/useAuth';

export type Note = {
  id: string;            // Firestore document ID
  uid: string;           // User ID
  title?: string;        // h1 đầu hoặc nhập tay
  content: string;       // markdown
  tags: string[];
  pinned: boolean;
  createdAt: Timestamp | number;     // Firestore Timestamp or Date.now()
  updatedAt: Timestamp | number;     // Firestore Timestamp or Date.now()
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

  // Convert Firestore timestamp to number
  const timestampToNumber = useCallback((timestamp: Timestamp | number): number => {
    if (timestamp instanceof Timestamp) {
      return timestamp.toMillis();
    }
    return timestamp;
  }, []);

  // Convert Note from Firestore format
  const convertFirestoreNote = useCallback((doc: any): Note => {
    const data = doc.data();
    return {
      id: doc.id,
      uid: data.uid,
      title: data.title,
      content: data.content || '',
      tags: data.tags || [],
      pinned: data.pinned || false,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  }, []);

  // Load notes from Firestore
  useEffect(() => {
    if (!user?.uid) {
      setNotes([]);
      return;
    }

    setLoading(true);
    const notesRef = collection(db, 'notes');
    const q = query(
      notesRef,
      where('uid', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesData = snapshot.docs.map(convertFirestoreNote);
      setNotes(notesData);
      setLoading(false);
    }, (error) => {
      console.error('Error loading notes:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid, convertFirestoreNote]);

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
        filteredNotes.sort((a, b) => timestampToNumber(a.createdAt) - timestampToNumber(b.createdAt));
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
        filteredNotes.sort((a, b) => timestampToNumber(b.updatedAt) - timestampToNumber(a.updatedAt));
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
  const upsert = useCallback(async (input: Partial<Note> & { id?: string }): Promise<Note> => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    const noteData = {
      uid: user.uid,
      title: input.title || '',
      content: input.content || '',
      tags: input.tags || [],
      pinned: input.pinned || false,
      updatedAt: serverTimestamp()
    };

    if (input.id) {
      // Update existing note
      const noteRef = doc(db, 'notes', input.id);
      await updateDoc(noteRef, noteData);
      
      // Return updated note
      const existingNote = notes.find(note => note.id === input.id);
      return {
        ...existingNote!,
        ...input,
        updatedAt: Date.now()
      };
    } else {
      // Create new note
      const newNoteData = {
        ...noteData,
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'notes'), newNoteData);
      
      return {
        id: docRef.id,
        uid: user.uid,
        title: input.title || '',
        content: input.content || '',
        tags: input.tags || [],
        pinned: input.pinned || false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }
  }, [user?.uid, notes]);

  // Remove note
  const remove = useCallback(async (id: string): Promise<void> => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }
    
    const noteRef = doc(db, 'notes', id);
    await deleteDoc(noteRef);
  }, [user?.uid]);

  // Toggle pin status
  const togglePin = useCallback(async (id: string): Promise<void> => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }
    
    const note = notes.find(note => note.id === id);
    if (!note) return;
    
    const noteRef = doc(db, 'notes', id);
    await updateDoc(noteRef, {
      pinned: !note.pinned,
      updatedAt: serverTimestamp()
    });
  }, [user?.uid, notes]);

  // Search notes
  const search = useCallback((keyword: string): Note[] => {
    if (!keyword.trim()) return notes;
    
    const searchLower = keyword.toLowerCase();
    return notes.filter(note => 
      note.title?.toLowerCase().includes(searchLower) ||
      note.content.toLowerCase().includes(searchLower) ||
      note.tags.some(tag => tag.toLowerCase().includes(searchLower))
    ).sort((a, b) => timestampToNumber(b.updatedAt) - timestampToNumber(a.updatedAt));
  }, [notes, timestampToNumber]);

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

// Firestore Integration Complete ✅
// - collection 'notes'
// - fields: { uid, title, content, tags, pinned, createdAt, updatedAt }
// - Index: composite (uid ASC, updatedAt DESC)
// - Real-time updates with onSnapshot
