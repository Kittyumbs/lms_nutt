import { useState, useEffect } from 'react';
import { Course } from './useCourses';

export interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'text' | 'quiz';
  duration?: number; // in minutes
  isCompleted?: boolean;
  content?: string;
  order: number;
}

export interface Module {
  id: string;
  title: string;
  description?: string;
  lessons: Lesson[];
  order: number;
  isExpanded?: boolean; // local state for UI
}

export interface Outline {
  modules: Module[];
  totalLessons: number;
  totalDuration: number; // in minutes
}

export interface CourseDetail extends Course {
  outline: Outline;
  firstLessonId?: string;
}

// Mock outline data generator
function generateMockOutline(courseId: string): Outline {
  const modules: Module[] = [];
  const moduleCount = Math.floor(Math.random() * 4) + 3; // 3-7 modules

  for (let i = 0; i < moduleCount; i++) {
    const lessonCount = Math.floor(Math.random() * 5) + 3; // 3-8 lessons per module
    const lessons: Lesson[] = [];

    for (let j = 0; j < lessonCount; j++) {
      const lessonTypes: Lesson['type'][] = ['video', 'text', 'quiz'];
      const lessonType = lessonTypes[Math.floor(Math.random() * lessonTypes.length)];

      lessons.push({
        id: `lesson_${i + 1}_${j + 1}`,
        title: `Lesson ${j + 1}: ${lessonType === 'video' ? 'Video tutorial' :
                lessonType === 'text' ? 'Reading material' : 'Practice quiz'}`,
        type: lessonType,
        duration: lessonType === 'video' ? Math.floor(Math.random() * 30) + 10 : undefined, // 10-40 mins for videos
        order: j + 1,
        isCompleted: false,
      });
    }

    modules.push({
      id: `module_${i + 1}`,
      title: `Module ${i + 1}: ${i === 0 ? 'Introduction' :
             i === moduleCount - 1 ? 'Final Project' : 'Core Concepts'}`,
      description: `Learn the fundamentals and ${i === 0 ? 'get started' :
                   i === moduleCount - 1 ? 'build your project' : 'deepen your knowledge'}.`,
      lessons,
      order: i + 1,
      isExpanded: i === 0, // Expand first module by default
    });
  }

  const totalLessons = modules.reduce((sum, mod) => sum + mod.lessons.length, 0);
  const totalDuration = modules.reduce((sum, mod) =>
    sum + mod.lessons.reduce((lSum, lesson) => lSum + (lesson.duration || 0), 0), 0);

  return {
    modules,
    totalLessons,
    totalDuration
  };
}

export function useCourseDetail(courseId: string): {
  course: CourseDetail | null;
  loading: boolean;
  error: string | null;
  isEnrolled: boolean;
  firstLessonId?: string;
  toggleModuleExpanded: (moduleId: string) => void;
  enroll: () => void;
} {
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);

  // Check enrollment status from localStorage
  useEffect(() => {
    const enrollKey = `enroll:${courseId}`;
    const enrolled = localStorage.getItem(enrollKey) === 'true';
    setIsEnrolled(enrolled);
  }, [courseId]);

  // Load course data
  useEffect(() => {
    const loadCourseDetail = async () => {
      try {
        setLoading(true);

        // Import useCourses to get course data
        const { useCourses } = await import('./useCourses');

        // We need to create a mock hook call here since we can't use hooks in a utility function
        // In a real implementation, this would be an API call
        // For now, we'll simulate fetching from the courses list

        // This is a workaround since we can't actually use hooks in this function
        // In production, this would be an API endpoint that gets course by ID

        // Mock implementation - generate course detail from ID
        const mockCourse: Course = {
          id: courseId,
          title: `Course ${courseId}: ${['React Fundamentals', 'Advanced TypeScript', 'Node.js Backend', 'UI/UX Design', 'Database Management'][parseInt(courseId.slice(-1)) % 5]}`,
          desc: `This comprehensive course covers advanced topics in development with hands-on projects and real-world examples. Perfect for developers looking to advance their skills.`,
          coverUrl: '',
          tags: parseInt(courseId.slice(-1)) % 2 === 0
                 ? ['JavaScript', 'React', 'TypeScript']
                 : ['HTML', 'CSS', 'JavaScript'],
          status: ['Published', 'Published', 'Draft'][parseInt(courseId.slice(-1)) % 3] as 'Published' | 'Draft',
        };

        const outline = generateMockOutline(courseId);
        const courseDetail: CourseDetail = {
          ...mockCourse,
          outline,
          firstLessonId: outline.modules[0]?.lessons[0]?.id,
        };

        setCourse(courseDetail);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load course details');
        setCourse(null);
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      loadCourseDetail();
    }
  }, [courseId]);

  const toggleModuleExpanded = (moduleId: string) => {
    setCourse(prev => prev ? {
      ...prev,
      outline: {
        ...prev.outline,
        modules: prev.outline.modules.map(module =>
          module.id === moduleId
            ? { ...module, isExpanded: !module.isExpanded }
            : module
        )
      }
    } : null);
  };

  const enroll = () => {
    const enrollKey = `enroll:${courseId}`;
    localStorage.setItem(enrollKey, 'true');
    setIsEnrolled(true);
  };

  const firstLessonId = course?.firstLessonId;

  return {
    course,
    loading,
    error,
    isEnrolled,
    firstLessonId,
    toggleModuleExpanded,
    enroll,
  };
}
