import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  query,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { useState } from 'react';

import { db } from '../lib/firebase';

export interface Module {
  id: string;
  title: string;
  description?: string;
  order: number;
  courseId: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'text' | 'quiz' | 'pdf';
  content?: string;
  order: number;
  moduleId: string;
  courseId: string;
  createdAt?: any;
  updatedAt?: any;
}

// Module Management
export async function createModule(courseId: string, data: Omit<Module, 'id' | 'courseId' | 'createdAt' | 'updatedAt'>): Promise<Module> {
  try {
    const moduleRef = await addDoc(collection(db, 'courses', courseId, 'modules'), {
      ...data,
      courseId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: moduleRef.id,
      ...data,
      courseId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as Module;
  } catch (error) {
    console.error('Error creating module:', error);
    throw error;
  }
}

export async function updateModule(courseId: string, moduleId: string, data: Partial<Module>): Promise<void> {
  try {
    await updateDoc(doc(db, 'courses', courseId, 'modules', moduleId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating module:', error);
    throw error;
  }
}

export async function deleteModule(courseId: string, moduleId: string): Promise<void> {
  try {
    // First, delete all lessons in this module
    const lessonsQuery = query(collection(db, 'courses', courseId, 'lessons'));
    const lessonsSnap = await getDocs(lessonsQuery);
    
    const deletePromises = lessonsSnap.docs
      .filter(doc => doc.data().moduleId === moduleId)
      .map(doc => deleteDoc(doc.ref));
    
    await Promise.all(deletePromises);
    
    // Then delete the module
    await deleteDoc(doc(db, 'courses', courseId, 'modules', moduleId));
  } catch (error) {
    console.error('Error deleting module:', error);
    throw error;
  }
}

// Lesson Management
export async function createLesson(courseId: string, data: Omit<Lesson, 'id' | 'courseId' | 'createdAt' | 'updatedAt'>): Promise<Lesson> {
  try {
    const lessonRef = await addDoc(collection(db, 'courses', courseId, 'lessons'), {
      ...data,
      courseId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: lessonRef.id,
      ...data,
      courseId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as Lesson;
  } catch (error) {
    console.error('Error creating lesson:', error);
    throw error;
  }
}

export async function updateLesson(courseId: string, lessonId: string, data: Partial<Lesson>): Promise<void> {
  try {
    await updateDoc(doc(db, 'courses', courseId, 'lessons', lessonId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating lesson:', error);
    throw error;
  }
}

export async function deleteLesson(courseId: string, lessonId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'courses', courseId, 'lessons', lessonId));
  } catch (error) {
    console.error('Error deleting lesson:', error);
    throw error;
  }
}

// Reorder functions
export async function reorderModules(courseId: string, moduleOrders: { id: string; order: number }[]): Promise<void> {
  try {
    const updatePromises = moduleOrders.map(({ id, order }) =>
      updateDoc(doc(db, 'courses', courseId, 'modules', id), {
        order,
        updatedAt: serverTimestamp(),
      })
    );
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error reordering modules:', error);
    throw error;
  }
}

export async function reorderLessons(courseId: string, lessonOrders: { id: string; order: number }[]): Promise<void> {
  try {
    const updatePromises = lessonOrders.map(({ id, order }) =>
      updateDoc(doc(db, 'courses', courseId, 'lessons', id), {
        order,
        updatedAt: serverTimestamp(),
      })
    );
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error reordering lessons:', error);
    throw error;
  }
}

// Custom hook for course editor
export function useCourseEditor(courseId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateModule = async (data: Omit<Module, 'id' | 'courseId' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      setError(null);
      await createModule(courseId, data);
    } catch (err: any) {
      setError(err.message || 'Failed to create module');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateModule = async (moduleId: string, data: Partial<Module>) => {
    try {
      setLoading(true);
      setError(null);
      await updateModule(courseId, moduleId, data);
    } catch (err: any) {
      setError(err.message || 'Failed to update module');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    try {
      setLoading(true);
      setError(null);
      await deleteModule(courseId, moduleId);
    } catch (err: any) {
      setError(err.message || 'Failed to delete module');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLesson = async (data: Omit<Lesson, 'id' | 'courseId' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      setError(null);
      await createLesson(courseId, data);
    } catch (err: any) {
      setError(err.message || 'Failed to create lesson');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLesson = async (lessonId: string, data: Partial<Lesson>) => {
    try {
      setLoading(true);
      setError(null);
      await updateLesson(courseId, lessonId, data);
    } catch (err: any) {
      setError(err.message || 'Failed to update lesson');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    try {
      setLoading(true);
      setError(null);
      await deleteLesson(courseId, lessonId);
    } catch (err: any) {
      setError(err.message || 'Failed to delete lesson');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleReorderModules = async (moduleOrders: { id: string; order: number }[]) => {
    try {
      setLoading(true);
      setError(null);
      await reorderModules(courseId, moduleOrders);
    } catch (err: any) {
      setError(err.message || 'Failed to reorder modules');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleReorderLessons = async (lessonOrders: { id: string; order: number }[]) => {
    try {
      setLoading(true);
      setError(null);
      await reorderLessons(courseId, lessonOrders);
    } catch (err: any) {
      setError(err.message || 'Failed to reorder lessons');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createModule: handleCreateModule,
    updateModule: handleUpdateModule,
    deleteModule: handleDeleteModule,
    createLesson: handleCreateLesson,
    updateLesson: handleUpdateLesson,
    deleteLesson: handleDeleteLesson,
    reorderModules: handleReorderModules,
    reorderLessons: handleReorderLessons,
  };
}
