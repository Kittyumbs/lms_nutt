import { HomeOutlined, BookOutlined, CheckCircleOutlined, PlayCircleOutlined, FileTextOutlined, QuestionCircleOutlined, VerticalAlignTopOutlined, VerticalAlignBottomOutlined } from '@ant-design/icons';
import { Breadcrumb, Button, Card, Alert, Skeleton, Space } from 'antd';
import React, { useState, useEffect, useMemo } from 'react';
// import ReactMarkdown from 'react-markdown'; // Replaced with HTML rendering for ReactQuill
import { useParams, Link, useNavigate } from 'react-router-dom';
// import DOMPurify from 'dompurify'; // No longer needed

// Safe HTML renderer component for TinyMCE content
const SafeHTMLRenderer: React.FC<{ content: string; className?: string }> = ({ content, className }) => {
  // If content is empty or only whitespace, return a default message
  if (!content || content.trim() === '') {
    return <div className={className}><p>Nội dung chưa được cập nhật.</p></div>;
  }

  // Clean HTML content to avoid React errors
  const cleanContent = content
    .replace(/<br\s*\/?>/gi, '<br />')
    .replace(/<img([^>]*?)(?:\s*\/)?>/gi, '<img$1 />')
    .replace(/<input([^>]*?)(?:\s*\/)?>/gi, '<input$1 />')
    .replace(/<hr\s*\/?>/gi, '<hr />')
    .replace(/<p><br\s*\/?><\/p>/gi, '<p>&nbsp;</p>')
    .replace(/<p><\/p>/gi, '')
    .replace(/<p>\s*<\/p>/gi, '')
    .trim();

  try {
    return (
      <div 
        className={className} 
        dangerouslySetInnerHTML={{ __html: cleanContent }} 
      />
    );
  } catch (error) {
    console.error('Error rendering HTML content:', error);
    return <div className={className}><p>Lỗi hiển thị nội dung.</p></div>;
  }
};

// import useAuth from '../../auth/useAuth';
import useRole from '../../auth/useRole';
import { useCourseDetail } from '../../hooks/useCourseDetail';
import { useEnrollment } from '../../hooks/useEnrollment';
import { useProgress } from '../../hooks/useProgress';
import { PageSEO } from '../../utils/seo';

import type { Lesson } from '../../hooks/useCourseDetail';

// Lesson content components
const LessonContent: React.FC<{ lesson: Lesson }> = ({ lesson }) => {
  // Debug log to check lesson content
  console.log('🎓 Lesson Content Debug:', {
    lessonId: lesson.id,
    title: lesson.title,
    type: lesson.type,
    hasContent: !!lesson.content,
    contentLength: lesson.content?.length || 0,
    contentPreview: lesson.content?.substring(0, 100) + '...'
  });
  if (lesson.type === 'video') {
    // Use actual video URL from database
    const videoUrl = lesson.content || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    
    // Extract video ID from YouTube URL
    const getYouTubeVideoId = (url: string) => {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
      return match ? match[1] : null;
    };
    
    const videoId = getYouTubeVideoId(videoUrl);
    
    if (videoId) {
      return (
        <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=0`}
            className="w-full h-full rounded-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={lesson.title}
          />
        </div>
      );
    }
    
    // Fallback to HTML content if video URL is invalid
    const content = `<h1>Video: ${lesson.title}</h1><p><strong>Video URL:</strong> ${videoUrl}</p><p><a href="${videoUrl}" target="_blank">Click here to watch the video</a></p>`;
    return <SafeHTMLRenderer content={content} className="prose max-w-none" />;
  }

  if (lesson.type === 'text') {
    // Use actual content from database (HTML from ReactQuill)
    const content = lesson.content || `<h1>${lesson.title}</h1><p>Nội dung bài học chưa được cập nhật.</p>`;
    return <SafeHTMLRenderer content={content} className="prose max-w-none" />;
  }

  if (lesson.type === 'quiz') {
    // Use actual quiz content from database
    try {
      const quizData = lesson.content ? JSON.parse(lesson.content) : null;
      
      if (quizData && quizData.question) {
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Quiz: {lesson.title}</h2>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-semibold mb-4 text-lg">{quizData.question}</h3>
              <div className="space-y-3">
                {quizData.options?.map((option: string, idx: number) => (
                  <label key={idx} className="flex items-center p-3 bg-white rounded border hover:bg-gray-50 cursor-pointer">
                    <input 
                      type="radio" 
                      name="quiz" 
                      value={idx} 
                      className="mr-3" 
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              
              {quizData.explanation && (
                <div className="mt-4 p-4 bg-blue-50 rounded border-l-4 border-blue-400">
                  <p className="text-sm text-blue-800">
                    <strong>Giải thích:</strong> {quizData.explanation}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      }
    } catch (error) {
      console.error('Error parsing quiz content:', error);
    }
    
    // Fallback to HTML content if quiz parsing fails
    const content = lesson.content || `<h1>Quiz: ${lesson.title}</h1><p>Nội dung quiz chưa được cập nhật.</p>`;
    return <SafeHTMLRenderer content={content} className="prose max-w-none" />;
  }

  if (lesson.type === 'pdf') {
    // Use actual PDF URL from database
    const pdfUrl = lesson.content || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    
    return (
      <div className="h-[80vh] w-full">
        <iframe
          src={pdfUrl}
          className="w-full h-full border rounded-lg"
          title="PDF Viewer"
        />
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">
            <strong>PDF Link:</strong> 
          </p>
          <a 
            href={pdfUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {pdfUrl}
          </a>
        </div>
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
    <div className="w-80">
      <Card className="shadow-sm sticky-course-outline">
        <h4 className="font-semibold mb-4">Course Outline</h4>
        <div className="space-y-4" id="course-outline">
          {modules.length > 0 ? (
            // Display lessons grouped by modules
            modules.map((module: any) => (
              <div key={module.id} className="space-y-2">
                <div className="font-medium text-sm text-gray-800 px-2 py-1 bg-gray-100 rounded flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <span>{module.title}</span>
                  </div>
                  <div className="flex items-center flex-shrink-0">
                    <span className="text-xs text-gray-500 font-medium">
                      {module.lessons?.length || 0} bài học
                    </span>
                  </div>
                </div>
                <div className="pl-4 space-y-1">
                  {module.lessons?.map((lesson: any) => {
                    const isComplete = doneIds.includes(lesson.id);
                    const isCurrent = lesson.id === currentLessonId;
                    return (
                      <button
                        key={lesson.id}
                        id={`lesson-${lesson.id}`}
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
                    id={`lesson-${lesson.id}`}
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
  const { role } = useRole();
  const { course: courseDetail, modules, lessons, loading, error } = useCourseDetail(cid || '');
  const { enrolled } = useEnrollment(cid || '');
  const { doneIds, markDone, unmarkDone } = useProgress(cid || '');
  // const { user } = useAuth();

  const [currentLessonId, setCurrentLessonId] = useState(lid || '');
  const [showScrollButtons, setShowScrollButtons] = useState(false);

  useEffect(() => {
    if (lid && lid !== currentLessonId) {
      setCurrentLessonId(lid);
    }
  }, [lid, currentLessonId]);

  // Scroll to current lesson in sidebar
  useEffect(() => {
    if (currentLessonId) {
      const element = document.getElementById(`lesson-${currentLessonId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentLessonId]);

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setShowScrollButtons(scrollTop > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll functions
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

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

  // Enrollment guard - Admin and Instructor can access without enrollment
  const canAccess = enrolled || role === 'admin' || role === 'instructor';
  
  if (!canAccess) {
    return (
      <div className="max-w-full px-6 py-4 space-y-6">
        <Breadcrumb>
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

      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-full px-6 py-4">
          <Breadcrumb className="mb-4">
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
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{courseDetail.title}</h1>
              {currentLesson && (
                <p className="text-base text-gray-600 mt-1">{currentLesson.title}</p>
              )}
            </div>
            
            {/* Course Progress */}
            <div className="text-sm text-gray-500">
              {lessons.length > 0 && (
                <span>
                  {lessons.findIndex(l => l.id === currentLessonId) + 1} / {lessons.length} bài học
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-full px-6 py-4">

        {/* Main Layout */}
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 min-h-[60vh]">
            <Card className="shadow-sm">
              <div className="mb-6">
                {currentLesson && <LessonContent lesson={currentLesson} />}
              </div>

              {currentLesson && (
                <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
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
                        type="default"
                        onClick={() => handleLessonClick(nextLessonId)}
                      >
                        Bài học tiếp theo
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

      {/* Scroll Buttons */}
      {showScrollButtons && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-2">
          <Button
            type="primary"
            shape="circle"
            icon={<VerticalAlignTopOutlined />}
            onClick={scrollToTop}
            title="Lên đầu trang"
            className="shadow-lg"
          />
          <Button
            type="default"
            shape="circle"
            icon={<VerticalAlignBottomOutlined />}
            onClick={scrollToBottom}
            title="Xuống cuối trang"
            className="shadow-lg"
          />
        </div>
      )}
    </>
  );
}
