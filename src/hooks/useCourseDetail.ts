import { doc, getDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useState, useEffect, useMemo } from 'react';

import { db } from '../lib/firebase';

export interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'text' | 'quiz' | 'pdf';
  content?: string;
  order: number;
}

export interface Module {
  id: string;
  title: string;
  description?: string;
  lessons: Lesson[];
  order: number;
  isExpanded?: boolean;
}

export interface Outline {
  modules: Module[];
  totalLessons: number;
}

export interface CourseDetail {
  id: string;
  title: string;
  desc?: string;
  coverUrl?: string;
  tags: string[];
  status: 'Draft' | 'Published' | 'Archived';
  ownerUid?: string;
  createdAt?: number;
  updatedAt?: number;
  outline?: Outline;
  firstLessonId?: string;
}

export function useCourseDetail(courseId: string): {
  course: CourseDetail | null;
  modules: Module[];
  lessons: Lesson[];
  loading: boolean;
  error: string | null;
} {
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) {
      setCourse(null);
      setModules([]);
      setLessons([]);
      setLoading(false);
      return;
    }

    const loadCourseDetail = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load course data
        const courseSnap = await getDoc(doc(db, 'courses', courseId));
        if (!courseSnap.exists()) {
          throw new Error('Course not found');
        }

        const courseData = courseSnap.data() as Omit<CourseDetail, 'id'>;
        const fullCourse: CourseDetail = {
          id: courseSnap.id,
          ...courseData,
        };

        // Load modules
        const modulesQuery = query(
          collection(db, 'courses', courseId, 'modules'),
          orderBy('order', 'asc')
        );
        const modulesSnap = await getDocs(modulesQuery);
        const modulesData: Module[] = modulesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Module));

        // Load lessons
        const lessonsQuery = query(
          collection(db, 'courses', courseId, 'lessons'),
          orderBy('order', 'asc')
        );
        const lessonsSnap = await getDocs(lessonsQuery);
        const lessonsData: Lesson[] = lessonsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Lesson));

        // Create outline with lessons grouped by modules
        const modulesWithLessons = modulesData.map(module => ({
          ...module,
          lessons: lessonsData.filter(() => {
            // If modules and lessons have a relationship, filter accordingly
            // For now, assume all lessons belong to course, and we'll organize by module if needed
            return true; // All lessons for this course
          }).sort((a, b) => a.order - b.order),
        }));

        const outline: Outline = {
          modules: modulesWithLessons,
          totalLessons: lessonsData.length,
        };

        // Set first lesson ID
        const firstLessonId = lessonsData.length > 0 ? lessonsData[0].id : undefined;

        setCourse({
          ...fullCourse,
          outline,
          firstLessonId,
        });
        setModules(modulesWithLessons);
        setLessons(lessonsData);

      } catch (err) {
        console.error('Error loading course detail:', err);
        setError(err instanceof Error ? err.message : 'Failed to load course details');
        setCourse(null);
        setModules([]);
        setLessons([]);
      } finally {
        setLoading(false);
      }
    };

    void loadCourseDetail();
  }, [courseId]);

      // const memoizedFirstLessonId = useMemo(() => {
    return lessons.length > 0 ? lessons[0]?.id : undefined;
      // }, [lessons]);

  return {
    course,
    modules,
    lessons,
    loading,
    error
  };
}
