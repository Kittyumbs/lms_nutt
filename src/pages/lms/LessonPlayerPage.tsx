import { HomeOutlined, BookOutlined, CheckCircleOutlined, PlayCircleOutlined, FileTextOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Breadcrumb, Button, Card, Alert, Skeleton, Space } from 'antd';
import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { useParams, Link, useNavigate } from 'react-router-dom';

import useAuth from '../../auth/useAuth';
import { useCourseDetail } from '../../hooks/useCourseDetail';
import { useEnrollment } from '../../hooks/useEnrollment';
import { useProgress } from '../../hooks/useProgress';
import { PageSEO } from '../../utils/seo';

import type { Lesson } from '../../hooks/useCourseDetail';

// Lesson content components
const LessonContent: React.FC<{ lesson: Lesson }> = ({ lesson }) => {
  if (lesson.type === 'video') {
    // Mock YouTube embed with responsive 16:9
    return (
      <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
        <iframe
          src={`https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=0`} // Placeholder YouTube video
          className="w-full h-full rounded-lg"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={lesson.title}
        />
      </div>
    );
  }

  if (lesson.type === 'text') {
    // Mock markdown content
    const mockContent = `
# ${lesson.title}

This is a sample text lesson content with **markdown formatting**.

You can include:
- Lists
- **Bold text**
- *Italic text*
- \`\`\`code blocks\`\`\`

## Key Concepts

Learn about important topics in this section. Practice the skills you've learned and experiment with different approaches.

## Summary

This lesson covers the fundamental concepts you need to understand. Make sure to complete the quiz at the end to test your knowledge.
    `;
    return <div className="prose max-w-none"><ReactMarkdown>{mockContent}</ReactMarkdown></div>;
  }

  if (lesson.type === 'quiz') {
    // Mock quiz content
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold mb-4">Quiz: {lesson.title}</h2>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Question 1</h3>
            <p className="mb-3">What is the capital of France?</p>
            <div className="space-y-2">
              {['London', 'Berlin', 'Paris', 'Madrid'].map((option, idx) => (
                <label key={idx} className="flex items-center">
                  <input type="radio" name="q1" value={idx} className="mr-2" />
                  {option}
                </label>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Question 2</h3>
            <p className="mb-3">Which programming language is used for web development?</p>
            <div className="space-y-2">
              {['Python', 'JavaScript', 'Java', 'PHP'].map((option, idx) => (
                <label key={idx} className="flex items-center">
                  <input type="radio" name="q2" value={idx} className="mr-2" />
                  {option}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (lesson.type === 'pdf') {
    // Mock PDF embed
    return (
      <div className="h-[80vh] w-full">
        <iframe
          src="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" // Placeholder PDF
          className="w-full h-full border rounded-lg"
          title="PDF Viewer"
        />
      </div>
    );
  }

  return <div>Unsupported lesson type: {lesson.type}</div>;
};

const LessonSidebar: React.FC<{
  courseDetail: any;
  lessons: Lesson[];
  modules: any[];
  currentLessonId: string;
  doneIds: string[];
  onLessonClick: (lessonId: string) => void;
}> = ({ courseDetail, lessons, modules, currentLessonId, doneIds, onLessonClick }) => {

  // Find current lesson details
  const currentLesson = useMemo(() => {
    for (const lesson of lessons) {
      if (lesson.id === currentLessonId) return lesson;
    }
    return null;
  }, [lessons, currentLessonId]);

  const getLessonTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <PlayCircleOutlined />;
      case 'text': return <FileTextOutlined />;
      case 'quiz': return <QuestionCircleOutlined />;
      default: return null;
    }
  };

  return (
    <div className="w-80 sticky top-4 space-y-4">
      <Card className="shadow-sm">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">{courseDetail?.title}</h3>
            {currentLesson && (
              <div className="text-sm text-gray-600">
                <div className="flex items-center mb-1">
                  <span className="mr-2">{getLessonTypeIcon(currentLesson.type)}</span>
                  {currentLesson.title}
                </div>
                <div>
                  Lesson {currentLesson.order}
                </div>
              </div>
            )}
          </div>

          <div className="text-sm text-gray-600">
            Progress: {doneIds.length} / {lessons.length} lessons
          </div>
        </div>
      </Card>

      <Card className="shadow-sm">
        <h4 className="font-semibold mb-4">Course Outline</h4>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {modules.length > 0 ? (
            // Display lessons grouped by modules
            modules.map((module: any) => (
              <div key={module.id} className="space-y-2">
                <div className="font-medium text-sm text-gray-800 px-2 py-1 bg-gray-100 rounded">
                  {module.title}
                </div>
                <div className="pl-4 space-y-1">
                  {module.lessons?.map((lesson: any) => {
                    const isComplete = doneIds.includes(lesson.id);
                    const isCurrent = lesson.id === currentLessonId;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => onLessonClick(lesson.id)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center hover:bg-blue-50 transition-colors ${
                          isCurrent ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                          isComplete ? 'text-green-700' : 'text-gray-700'
                        }`}
                      >
                        <div className="flex items-center flex-1">
                          {isComplete && <CheckCircleOutlined className="mr-2 text-green-600" />}
                          {getLessonTypeIcon(lesson.type) && !isComplete && (
                            <span className="mr-2 text-gray-500">
                              {getLessonTypeIcon(lesson.type)}
                            </span>
                          )}
                          <div className="flex-1">
                            <div className="truncate">Lesson {lesson.order}: {lesson.title}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            // Fallback: Display all lessons
            <div className="space-y-1">
              {lessons.map((lesson) => {
                const isComplete = doneIds.includes(lesson.id);
                const isCurrent = lesson.id === currentLessonId;
                return (
                  <button
                    key={lesson.id}
                    onClick={() => onLessonClick(lesson.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center hover:bg-blue-50 transition-colors ${
                      isCurrent ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                      isComplete ? 'text-green-700' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center flex-1">
                      {isComplete && <CheckCircleOutlined className="mr-2 text-green-600" />}
                      {getLessonTypeIcon(lesson.type) && !isComplete && (
                        <span className="mr-2 text-gray-500">
                          {getLessonTypeIcon(lesson.type)}
                        </span>
                      )}
                      <div className="flex-1">
                        <div className="truncate">Lesson {lesson.order}: {lesson.title}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default function LessonPlayerPage() {
  const { cid, lid } = useParams<{ cid: string; lid: string }>();
  const navigate = useNavigate();
  const { course: courseDetail, modules, lessons, loading, error } = useCourseDetail(cid || '');
  const { enrolled } = useEnrollment(cid || '');
  const { doneIds, markDone, unmarkDone } = useProgress(cid || '');
  // const { user } = useAuth();

  const [currentLessonId, setCurrentLessonId] = useState(lid || '');

  useEffect(() => {
    if (lid && lid !== currentLessonId) {
      setCurrentLessonId(lid);
    }
  }, [lid, currentLessonId]);

  // Find current lesson
  const currentLesson = useMemo(() => {
    for (const lesson of lessons) {
      if (lesson.id === currentLessonId) return lesson;
    }
    return null;
  }, [lessons, currentLessonId]);

  // Find next lesson ID
  const nextLessonId = useMemo(() => {
    const currentIndex = lessons.findIndex(l => l.id === currentLessonId);
    if (currentIndex !== -1 && currentIndex < lessons.length - 1) {
      return lessons[currentIndex + 1].id;
    }
    return null;
  }, [lessons, currentLessonId]);

  const handleMarkDone = async () => {
    if (!currentLessonId || !cid) return;

    const isDone = doneIds.includes(currentLessonId);
    try {
      if (isDone) {
        await unmarkDone(currentLessonId);
      } else {
        await markDone(currentLessonId);
      }
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const handleLessonClick = (lessonId: string) => {
    void navigate(`/lms/learn/${cid}/${lessonId}`);
  };

  if (loading) {
    return (
      <div className="max-w-full px-6 py-4">
        <Skeleton active />
      </div>
    );
  }

  if (error || !courseDetail) {
    return (
      <div className="max-w-full px-6 py-4">
        <Alert message={`Error: ${error || 'Course not found'}`} type="error" />
      </div>
    );
  }

  // Enrollment guard
  if (!enrolled) {
    return (
      <div className="max-w-full px-6 py-4 space-y-6">
        <Breadcrumb>
          <Breadcrumb.Item>
            <Link to="/" className="text-gray-600 hover:text-blue-600">
              <HomeOutlined className="mr-1" />
              Home
            </Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Link to="/lms/courses" className="text-gray-600 hover:text-blue-600">
              <BookOutlined className="mr-1" />
              Courses
            </Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>{courseDetail.title}</Breadcrumb.Item>
        </Breadcrumb>

        <Alert
          message="Access Restricted"
          description={
            <div>
              <p className="mb-4">You need to enroll in this course to access the lessons.</p>
              <Link to={`/lms/course/${cid}`}>
                <Button type="primary">Enroll Now</Button>
              </Link>
            </div>
          }
          type="warning"
          showIcon
        />
      </div>
    );
  }

  return (
    <>
      <PageSEO title={`${courseDetail.title} - ${currentLesson?.title || 'Lesson'}`} />

      <div className="max-w-full px-6 py-4">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <Breadcrumb.Item>
            <Link to="/" className="text-gray-600 hover:text-blue-600">
              <HomeOutlined className="mr-1" />
              Home
            </Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Link to="/lms/courses" className="text-gray-600 hover:text-blue-600">
              <BookOutlined className="mr-1" />
              Courses
            </Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Link to={`/lms/course/${cid}`} className="text-gray-600 hover:text-blue-600">
              {courseDetail.title}
            </Link>
          </Breadcrumb.Item>
          {currentLesson && (
            <Breadcrumb.Item>
              {currentLesson.title}
            </Breadcrumb.Item>
          )}
        </Breadcrumb>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{courseDetail.title}</h1>
          {currentLesson && (
            <p className="text-lg text-gray-600 mt-2">{currentLesson.title}</p>
          )}
        </div>

        {/* Main Layout */}
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 min-h-[60vh]">
            <Card className="shadow-sm">
              <div className="mb-6">
                {currentLesson && <LessonContent lesson={currentLesson} />}
              </div>

              {currentLesson && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <Space>
                    <Button
                      type="primary"
                      onClick={handleMarkDone}
                      icon={doneIds.includes(currentLessonId) ? <CheckCircleOutlined /> : undefined}
                    >
                      {doneIds.includes(currentLessonId) ? 'Marked as Done' : 'Mark as Done'}
                    </Button>

                    {nextLessonId && (
                      <Button
                        onClick={() => handleLessonClick(nextLessonId)}
                      >
                        Next Lesson
                      </Button>
                    )}
                  </Space>
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <LessonSidebar
            courseDetail={courseDetail}
            lessons={lessons}
            modules={modules}
            currentLessonId={currentLessonId}
            doneIds={doneIds}
            onLessonClick={handleLessonClick}
          />
        </div>
      </div>
    </>
  );
}
