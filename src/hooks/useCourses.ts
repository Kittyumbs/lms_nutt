import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
  limit,
  startAfter,
} from 'firebase/firestore';
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
  const { search, tags, status, pageSize = 10 } = params;
  const [items, setItems] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // To force refresh

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    setLoading(true);
    let q = query(collection(db, COURSES_COLLECTION), orderBy('createdAt', 'desc'));

    if (tags && tags.length > 0) {
      q = query(q, where('tags', 'array-contains-any', tags));
    }

    if (status && status !== 'All') {
      q = query(q, where('status', '==', status));
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedCourses: Course[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Course[];

      // Client-side filtering for search (Firestore doesn't support full-text search directly)
      let filteredCourses = fetchedCourses;
      if (search) {
        const lowerSearch = search.toLowerCase();
        filteredCourses = fetchedCourses.filter(
          (course) =>
            course.title.toLowerCase().includes(lowerSearch) ||
            course.desc?.toLowerCase().includes(lowerSearch) ||
            course.tags.some((tag) => tag.toLowerCase().includes(lowerSearch))
        );
      }

      setItems(filteredCourses);
      setLoading(false);
      setHasMore(false); // With onSnapshot, we fetch all matching, so no "more" to load in this simplified version
    }, (error) => {
      console.error('Error fetching courses:', error);
      setLoading(false);
      // Handle error appropriately
    });

    // Cleanup function to unsubscribe from real-time updates
    return () => unsubscribe();
  }, [search, tags, status, refreshKey]); // Re-run effect when filters or refreshKey change

  // loadMore is not directly applicable with simple onSnapshot, but keep for interface
  const loadMore = useCallback(() => {
    console.log('Load more not implemented with current onSnapshot setup.');
  }, []);

  return { items, loading, hasMore, loadMore, refresh };
}

export async function createCourse(input: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>): Promise<Course> {
  try {
    // Import getAuth to get current user
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const docRef = await addDoc(collection(db, COURSES_COLLECTION), {
      ...input,
      ownerUid: currentUser.uid,  // Set owner to current user
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      tags: input.tags || [],
      status: input.status || 'Draft',
    });
    // Return the created course with the Firestore-generated ID and server timestamps
    // Note: serverTimestamp() is an object, so we use Date.now() for immediate client-side display
    return { id: docRef.id, ...input, ownerUid: currentUser.uid, createdAt: Date.now(), updatedAt: Date.now() } as Course;
  } catch (error) {
    console.error('Error creating course:', error);
    throw error;
  }
}

export async function updateCourse(id: string, patch: Partial<Course>): Promise<void> {
  try {
    const courseRef = doc(db, COURSES_COLLECTION, id);
    await updateDoc(courseRef, {
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
    const originalDoc = await getDocs(query(collection(db, COURSES_COLLECTION), where('id', '==', id)));
    if (originalDoc.empty) {
      throw new Error('Course not found for duplication');
    }
    const courseToDuplicate = originalDoc.docs[0].data() as Course;

    // Omit id from courseToDuplicate before creating new input
    const { id: _, ...restOfCourse } = courseToDuplicate;
    const duplicatedCourseInput: Omit<Course, 'id' | 'createdAt' | 'updatedAt'> = {
      ...restOfCourse,
      title: `${courseToDuplicate.title} (Copy)`,
      status: 'Draft', // Duplicated courses start as Draft
    };
    return await createCourse(duplicatedCourseInput);
  } catch (error) {
    console.error('Error duplicating course:', error);
    throw error;
  }
}

export async function setCourseStatus(id: string, status: CourseStatus): Promise<void> {
  try {
    const courseRef = doc(db, COURSES_COLLECTION, id);
    await updateDoc(courseRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error setting course status:', error);
    throw error;
  }
}
