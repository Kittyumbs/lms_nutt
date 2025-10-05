import { HomeOutlined, BookOutlined, PlayCircleOutlined, FileTextOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Breadcrumb, Card, Button, Tag, Tabs, Collapse, Empty, Skeleton } from 'antd';
import React from 'react';
import { useParams, Link } from 'react-router-dom';

import useAuth from '../../auth/useAuth';
import useRole from '../../auth/useRole';
import { useCourseDetail } from '../../hooks/useCourseDetail';
import { useEnrollment } from '../../hooks/useEnrollment';
import { PageSEO } from '../../utils/seo';

const { Panel } = Collapse;

// Helper function to get status color
const getStatusColor = (status: string) => {
  switch (status) {
    case 'Published': return 'green';
    case 'Archived': return 'gray';
    default: return 'default'; // Draft
  }
};

// Helper function to get lesson type icon
const getLessonTypeIcon = (type: string) => {
  switch (type) {
    case 'video':
      return <PlayCircleOutlined className="text-blue-500" />;
    case 'text':
      return <FileTextOutlined className="text-green-500" />;
    case 'quiz':
      return <QuestionCircleOutlined className="text-orange-500" />;
    default:
      return null;
  }
};

export default function CourseDetailPage() {
  const { cid } = useParams<{ cid: string }>();
  const { user, signInWithGoogle } = useAuth();
  const { role } = useRole();
  const { course, modules, lessons, loading, error } = useCourseDetail(cid || '');
  const { enrolled, enroll } = useEnrollment(cid || '');

  const firstLessonId = lessons.length > 0 ? lessons[0]?.id : undefined;

  const handleEnroll = () => {
    if (!user) {
      // Prompt sign-in if not authenticated
      void signInWithGoogle();
    } else {
      // Directly enroll if authenticated
      void enroll();
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-4">
        <Skeleton active />
        <Skeleton active />
        <Skeleton active />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-4">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span>
              {error || 'Course not found'}
            </span>
          }
        />
      </div>
    );
  }

  return (
    <>
      <PageSEO title={course.title} description={course.desc || 'Course details'} />

      <div className="max-w-5xl mx-auto px-6 py-4">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <Breadcrumb.Item>
            <Link to="/lms/courses" className="text-gray-600 hover:text-blue-600">
              <BookOutlined className="mr-1" />
              Courses
            </Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <span className="text-gray-900">{course.title}</span>
          </Breadcrumb.Item>
        </Breadcrumb>

        {/* Header Section */}
        <div className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Course Cover */}
            <div className="lg:col-span-1">
              <Card
                cover={
                  course.coverUrl ? (
                    <img
                      alt={course.title}
                      src={course.coverUrl}
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '200px',
                        background: 'linear-gradient(135deg, #1C6EA4 0%, #33A1E0 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <BookOutlined style={{ fontSize: '48px', color: 'white' }} />
                    </div>
                  )
                }
                style={{ borderRadius: '12px', overflow: 'hidden' }}
              />
            </div>

            {/* Course Info */}
            <div className="lg:col-span-2">
              <div className="mb-4">
                <Tag
                  color={getStatusColor(course.status)}
                  style={{
                    marginBottom: '12px',
                    borderRadius: '999px',
                    padding: '4px 12px'
                  }}
                >
                  {course.status}
                </Tag>

                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
                  {course.title}
                </h1>

                <div className="flex flex-wrap gap-2 mb-4">
                  {course.tags.map((tag) => (
                    <Tag key={tag} className="rounded-full">
                      {tag}
                    </Tag>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                {/* Edit Content Button - Only for instructors/admins */}
                {(role === 'instructor' || role === 'admin') && (
                  <Button
                    type="default"
                    size="large"
                    className="mr-4"
                  >
                    <Link to={`/lms/course/${cid}/edit`} className="text-gray-700">
                      Edit Content
                    </Link>
                  </Button>
                )}

                {/* Enroll/Continue Learning - Only show for Published courses */}
                {course.status === 'Published' && (
                  <>
                    {!enrolled ? (
                      <Button
                        type="primary"
                        size="large"
                        onClick={handleEnroll}
                      >
                        {user ? 'Enroll Now' : 'Sign in to Enroll'}
                      </Button>
                    ) : (
                      <Button
                        type="primary"
                        size="large"
                      >
                        <Link to={`/lms/learn/${cid}/${firstLessonId}`} className="text-white">
                          Continue Learning
                        </Link>
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Course Content Tabs */}
        <Card style={{ borderRadius: '12px' }}>
          <Tabs defaultActiveKey="overview" size="large">
            {/* Overview Tab */}
            <Tabs.TabPane tab="Overview" key="overview">
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4">About this course</h3>
                <p className="text-gray-700 leading-relaxed">
                  {course.desc || 'No description provided for this course.'}
                </p>

                <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <strong>{lessons.length}</strong> lessons
                  </div>
                  <div>
                    <strong>Estimated {Math.ceil(lessons.length * 10)}</strong> minutes
                  </div>
                </div>
              </div>
            </Tabs.TabPane>

            {/* Outline Tab */}
            <Tabs.TabPane tab="Course Outline" key="outline">
              <div className="p-4">
                {modules.length === 0 && lessons.length === 0 ? (
                  <Empty description="Course outline not available" />
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">
                        Course Content ({lessons.length} lessons)
                      </h3>
                      <span className="text-sm text-gray-500">
                        Estimated {Math.ceil(lessons.length * 10)} minutes
                      </span>
                    </div>

                    <Collapse
                      bordered={false}
                      expandIconPosition="end"
                      className="bg-transparent"
                      style={{
                        '--ant-collapse-header-padding': '16px 20px',
                      } as React.CSSProperties}
                    >
                      {modules.length > 0 ? (
                        // Display lessons grouped by modules
                        modules.map((module) => (
                          <Panel
                            key={module.id}
                            header={
                              <div className="flex items-center justify-between w-full" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div className="flex items-center space-x-2" style={{ flex: '1', minWidth: '0' }}>
                                  <span className="font-medium truncate">{module.title}</span>
                                </div>
                                <div className="flex items-center space-x-2" style={{ flexShrink: '0' }}>
                                  <span className="text-sm text-gray-500 font-medium whitespace-nowrap">
                                    {module.lessons.length} bài học
                                  </span>
                                </div>
                              </div>
                            }
                            className="bg-white border border-gray-200 mb-2 rounded-lg custom-collapse-header"
                            style={{
                              '--ant-collapse-header-padding': '16px 20px',
                            } as React.CSSProperties}
                            showArrow
                            collapsible={module.lessons.length > 0 ? "header" : "disabled"}
                          >
                            <div className="space-y-2">
                              {module.lessons.map((lesson) => (
                                <div
                                  key={lesson.id}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                                  onClick={() => {
                                    console.log('Navigate to lesson:', lesson.id);
                                  }}
                                >
                                  <div className="flex items-center space-x-3">
                                    {getLessonTypeIcon(lesson.type)}
                                    <span className="text-sm font-medium">
                                      {lesson.title}
                                    </span>
                                  </div>
                                  <Tag color="blue" className="text-xs">
                                    {lesson.type}
                                  </Tag>
                                </div>
                              ))}
                            </div>

                            {module.description && (
                              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm text-gray-700">{module.description}</p>
                              </div>
                            )}
                          </Panel>
                        ))
                      ) : (
                        // Fallback: Display all lessons if no modules
                        <div className="space-y-2">
                          {lessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                {getLessonTypeIcon(lesson.type)}
                                <span className="text-sm font-medium">
                                  {lesson.title}
                                </span>
                              </div>
                              <Tag color="blue" className="text-xs">
                                {lesson.type}
                              </Tag>
                            </div>
                          ))}
                        </div>
                      )}
                    </Collapse>
                  </div>
                )}
              </div>
            </Tabs.TabPane>
          </Tabs>
        </Card>
      </div>
    </>
  );
}
