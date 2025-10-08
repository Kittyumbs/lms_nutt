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
    console.log('🔍 useNotes - User:', user?.uid, 'Email:', user?.email);
    
    if (!user?.uid) {
      console.log('❌ No user UID, clearing notes');
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

    console.log('📡 Setting up Firestore listener for notes...');

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('📝 Notes snapshot received:', snapshot.docs.length, 'docs');
      const notesData = snapshot.docs.map(convertFirestoreNote);
      console.log('📝 Converted notes:', notesData);
      setNotes(notesData);
      setLoading(false);
    }, (error) => {
      console.error('❌ Error loading notes:', error);
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
    console.log('💾 upsert called with:', input);
    
    if (!user?.uid) {
      console.error('❌ User not authenticated');
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

    console.log('📝 Note data to save:', noteData);

    if (input.id) {
      // Update existing note
      console.log('🔄 Updating existing note:', input.id);
      const noteRef = doc(db, 'notes', input.id);
      await updateDoc(noteRef, noteData);
      console.log('✅ Note updated successfully');
      
      // Return updated note
      const existingNote = notes.find(note => note.id === input.id);
      return {
        ...existingNote!,
        ...input,
        updatedAt: Date.now()
      };
    } else {
      // Create new note
      console.log('➕ Creating new note');
      const newNoteData = {
        ...noteData,
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'notes'), newNoteData);
      console.log('✅ Note created successfully with ID:', docRef.id);
      
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
    console.log('🗑️ remove called with ID:', id);
    
    if (!user?.uid) {
      console.error('❌ User not authenticated');
      throw new Error('User not authenticated');
    }
    
    try {
      console.log('🗑️ Deleting note from Firestore...');
      const noteRef = doc(db, 'notes', id);
      await deleteDoc(noteRef);
      console.log('✅ Note deleted successfully from Firestore');
    } catch (error) {
      console.error('❌ Firestore delete failed, trying localStorage fallback:', error);
      
      // Fallback to localStorage
      try {
        const storageKey = `notes:${user.uid}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const notes = JSON.parse(stored);
          const filteredNotes = notes.filter((note: any) => note.id !== id);
          localStorage.setItem(storageKey, JSON.stringify(filteredNotes));
          console.log('✅ Note deleted from localStorage fallback');
        }
      } catch (localError) {
        console.error('❌ localStorage fallback also failed:', localError);
        throw error; // Re-throw original Firestore error
      }
    }
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

  // Clear all notes (for debugging)
  const clearAllNotes = useCallback(async () => {
    console.log('🧹 Clearing all notes...');
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      
      // Delete all notes from Firestore
      const notesRef = collection(db, 'notes');
      const q = query(notesRef, where('uid', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log('✅ All notes deleted from Firestore');
      setNotes([]);
    } catch (error) {
      console.error('❌ Error clearing notes:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

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
    getStats,
    clearAllNotes
  };
}

// Firestore Integration Complete ✅
// - collection 'notes'
// - fields: { uid, title, content, tags, pinned, createdAt, updatedAt }
// - Index: composite (uid ASC, updatedAt DESC)
// - Real-time updates with onSnapshot
