import {
  collection,
  query,
  orderBy,
  where,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { useState, useEffect, useCallback } from 'react';

import useAuth from '../auth/useAuth';
import { db } from '../lib/firebase'; // Import the Firestore instance

export type CourseStatus = 'Draft' | 'Published' | 'Archived';

export interface Course {
  id: string;
  title: string;
  desc?: string;
  coverUrl?: string;
  tags: string[];
  status: CourseStatus;
  ownerUid?: string;
  createdAt?: number;
  updatedAt?: number;
}

const COURSES_COLLECTION = 'courses';

export function useCourses(params: { search?: string; tags?: string[]; status?: 'All' | CourseStatus; pageSize?: number }): {
  items: Course[]; loading: boolean; hasMore: boolean; loadMore: () => void; refresh: () => void;
} {
  const { user } = useAuth();
  const { search, tags, status } = params;
  const [items, setItems] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // To force refresh

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setItems([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    // Build query - filter by ownerUid first
    let q = query(
      collection(db, COURSES_COLLECTION), 
      where('ownerUid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    
    // Apply filters
    if (status && status !== 'All') {
      q = query(q, where('status', '==', status));
    }
    
    if (tags && tags.length > 0) {
      q = query(q, where('tags', 'array-contains-any', tags));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const courses: Course[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        courses.push({
          id: doc.id,
          title: data.title || '',
          desc: data.desc || '',
          coverUrl: data.coverUrl || '',
          tags: data.tags || [],
          status: data.status || 'Draft',
          ownerUid: data.ownerUid || '',
          createdAt: data.createdAt?.toMillis() || 0,
          updatedAt: data.updatedAt?.toMillis() || 0,
        });
      });

      // Apply search filter in memory (since Firestore doesn't support full-text search easily)
      let filteredCourses = courses;
      if (search && search.trim()) {
        const searchLower = search.toLowerCase();
        filteredCourses = courses.filter(course => 
          course.title.toLowerCase().includes(searchLower) ||
          course.desc?.toLowerCase().includes(searchLower) ||
          course.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }

      setItems(filteredCourses);
      setLoading(false);
      setHasMore(false); // For now, we're loading all courses at once
    }, (error) => {
      console.error('Error fetching courses:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [search, tags, status, refreshKey]); // Re-run effect when filters or refreshKey change

  // loadMore is not directly applicable with simple onSnapshot, but keep for interface
  const loadMore = useCallback(() => {
  }, []);

  return { items, loading, hasMore, loadMore, refresh };
}

export async function createCourse(input: Omit<Course, 'id' | 'createdAt' | 'updatedAt' | 'ownerUid'>): Promise<Course> {
  try {
    // Get current user
    const { user } = useAuth();
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    const docRef = await addDoc(collection(db, COURSES_COLLECTION), {
      ...input,
      ownerUid: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      ...input,
      ownerUid: user.uid,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  } catch (error) {
    console.error('Error creating course:', error);
    throw error;
  }
}

export async function updateCourse(id: string, patch: Partial<Course>): Promise<void> {
  try {
    await updateDoc(doc(db, COURSES_COLLECTION, id), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating course:', error);
    throw error;
  }
}

export async function duplicateCourse(id: string): Promise<Course> {
  try {
    // Get the original course
    const courseDoc = await getDoc(doc(db, COURSES_COLLECTION, id));
    if (!courseDoc.exists()) {
      throw new Error('Course not found');
    }

    const originalCourse = courseDoc.data() as Course;
    
    // Create new course with duplicated data
    const newCourse = await createCourse({
      title: `${originalCourse.title} (Copy)`,
      desc: originalCourse.desc,
      coverUrl: originalCourse.coverUrl,
      tags: originalCourse.tags,
      status: 'Draft', // Always start as draft
    });

    // Duplicate modules and lessons
    await duplicateModulesAndLessons(id, newCourse.id);

    return newCourse;
  } catch (error) {
    console.error('Error duplicating course:', error);
    throw error;
  }
}

async function duplicateModulesAndLessons(originalCourseId: string, newCourseId: string) {
  try {
    const { getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp } = await import('firebase/firestore');
    const db = getFirestore();

    // Get all modules for the original course
    const modulesQuery = query(collection(db, 'modules'), where('courseId', '==', originalCourseId));
    const modulesSnapshot = await getDocs(modulesQuery);
    
    const originalModules: any[] = [];
    modulesSnapshot.forEach((doc) => {
      originalModules.push({ id: doc.id, ...doc.data() });
    });

    // Get all lessons for the original course
    const lessonsQuery = query(collection(db, 'lessons'), where('courseId', '==', originalCourseId));
    const lessonsSnapshot = await getDocs(lessonsQuery);
    
    const originalLessons: any[] = [];
    lessonsSnapshot.forEach((doc) => {
      originalLessons.push({ id: doc.id, ...doc.data() });
    });

    // Create new modules
    for (const module of originalModules) {
      const newModuleData = {
        title: module.title,
        description: module.description,
        order: module.order,
        courseId: newCourseId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const newModuleRef = await addDoc(collection(db, 'modules'), newModuleData);
      
      // Create lessons for this module
      const moduleLessons = originalLessons.filter(lesson => lesson.moduleId === module.id);
      for (const lesson of moduleLessons) {
        const newLessonData = {
          title: lesson.title,
          type: lesson.type,
          content: lesson.content,
          order: lesson.order,
          courseId: newCourseId,
          moduleId: newModuleRef.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        
        await addDoc(collection(db, 'lessons'), newLessonData);
      }
    }

  } catch (error) {
    console.error('Error duplicating modules and lessons:', error);
    throw error;
  }
}

export async function setCourseStatus(id: string, status: CourseStatus): Promise<void> {
  try {
    await updateDoc(doc(db, COURSES_COLLECTION, id), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error setting course status:', error);
    throw error;
  }
}

export async function deleteCourse(courseId: string): Promise<void> {
  try {
    const { getFirestore, doc, deleteDoc, collection, query, where, getDocs } = await import('firebase/firestore');
    const db = getFirestore();

    // Delete the course
    await deleteDoc(doc(db, 'courses', courseId));

    // Delete all modules for this course
    const modulesQuery = query(collection(db, 'modules'), where('courseId', '==', courseId));
    const modulesSnapshot = await getDocs(modulesQuery);
    
    for (const moduleDoc of modulesSnapshot.docs) {
      await deleteDoc(moduleDoc.ref);
    }

    // Delete all lessons for this course
    const lessonsQuery = query(collection(db, 'lessons'), where('courseId', '==', courseId));
    const lessonsSnapshot = await getDocs(lessonsQuery);
    
    for (const lessonDoc of lessonsSnapshot.docs) {
      await deleteDoc(lessonDoc.ref);
    }

  } catch (error) {
    console.error('Error deleting course:', error);
    throw error;
  }
}