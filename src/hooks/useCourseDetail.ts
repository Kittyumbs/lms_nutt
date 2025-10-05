import { doc, getDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useState, useEffect } from 'react';

import { db } from '../lib/firebase';

export interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'text' | 'quiz' | 'pdf';
  content?: string;
  order: number;
  moduleId?: string;
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
  refresh: () => void;
} {
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        collection(db, 'modules'),
        orderBy('order', 'asc')
      );
      const modulesSnap = await getDocs(modulesQuery);
      const modulesData: Module[] = modulesSnap.docs
        .filter(doc => doc.data().courseId === courseId)
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || '',
            description: data.description,
            order: data.order || 0,
            lessons: [], // Initialize empty lessons array
            isExpanded: data.isExpanded
          } as Module;
        });

      // Load lessons
      const lessonsQuery = query(
        collection(db, 'lessons'),
        orderBy('order', 'asc')
      );
      const lessonsSnap = await getDocs(lessonsQuery);
      const lessonsData: Lesson[] = lessonsSnap.docs
        .filter(doc => doc.data().courseId === courseId)
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || '',
            type: data.type || 'text',
            content: data.content,
            order: data.order || 0,
            moduleId: data.moduleId
          } as Lesson;
        });


      // Group lessons by modules
      const modulesWithLessons = modulesData.map(module => ({
        ...module,
        lessons: lessonsData.filter(lesson => lesson.moduleId === module.id)
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
    } catch (err: any) {
      console.error('Error loading course detail:', err);
      setError(err.message || 'Failed to load course');
      setCourse(null);
      setModules([]);
      setLessons([]);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    void loadCourseDetail();
  };

  useEffect(() => {
    if (!courseId) {
      setCourse(null);
      setModules([]);
      setLessons([]);
      setLoading(false);
      return;
    }

    void loadCourseDetail();
  }, [courseId]);

  return {
    course,
    modules,
    lessons,
    loading,
    error,
    refresh
  };
}