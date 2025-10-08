import { PlusOutlined, EditOutlined, CopyOutlined, CheckOutlined, CloseOutlined, ReadOutlined } from '@ant-design/icons';
import { Button, Input, Select, Segmented, Card, Space, Empty, Tooltip, Tag } from 'antd';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { RequireInstructor } from '../../auth/guards';
import useAuth from '../../auth/useAuth';
import useRole from '../../auth/useRole';
import { useCourses, duplicateCourse, setCourseStatus, type Course, type CourseStatus } from '../../hooks/useCourses';
import { PageSEO } from '../../utils/seo';

import CourseFormDrawer from './components/CourseFormDrawer';
import CourseQuickView from './components/CourseQuickView';

const { Search } = Input;
const { Option } = Select;

// Safe HTML renderer component for ReactQuill content
const SafeHTMLRenderer: React.FC<{ content: string; className?: string }> = ({ content, className }) => {
  // If content is empty or only whitespace, return a default message
  if (!content || content.trim() === '') {
    return <div className={className}><p>No description provided.</p></div>;
  }

  // Clean HTML content to avoid React errors
  const cleanContent = content
    .replace(/<br\s*\/?>/gi, '<br />')
    .replace(/<img([^>]*?)(?:\s*\/)?>/gi, '<img$1 />')
    .replace(/<input([^>]*?)(?:\s*\/)?>/gi, '<input$1 />')
    .replace(/<hr\s*\/?>/gi, '<hr />')
    .replace(/<p><br\s*\/?><\/p>/gi, '<p>&nbsp;</p>')
    .trim();

  try {
    return (
      <div 
        className={`prose ${className || ''}`} 
        dangerouslySetInnerHTML={{ __html: cleanContent }} 
      />
    );
  } catch (error) {
    console.error('Error rendering HTML content:', error);
    return <div className={className}><p>Error displaying content.</p></div>;
  }
};

const CoursesPage: React.FC = () => {
  const { user } = useAuth();
  const { role } = useRole();

  // Check permissions
  // const canSeeActions = role === 'instructor' || role === 'admin';

  // filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'All' | CourseStatus>('All');

  // For learners, default to 'Published' filter and disable other options
  useEffect(() => {
    if (user && role === 'learner' && statusFilter === 'All') {
      setStatusFilter('Published');
    }
  }, [user, role, statusFilter]);

  // drawers
  const [isFormDrawerOpen, setIsFormDrawerOpen] = useState(false);
  const [formDrawerMode, setFormDrawerMode] = useState<'create' | 'edit'>('create');
  const [editingCourse, setEditingCourse] = useState<Course | undefined>(undefined);

  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [quickViewCourse, setQuickViewCourse] = useState<Course | undefined>(undefined);

  // data
  const { items: courses, loading, refresh } = useCourses({ search, tags, status: statusFilter });




  // debounce search
  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const handleNewCourse = () => {
    setFormDrawerMode('create');
    setEditingCourse(undefined);
    setIsFormDrawerOpen(true);
  };

  const handleEditCourse = (course: Course) => {
    setFormDrawerMode('edit');
    setEditingCourse(course);
    setIsFormDrawerOpen(true);
  };

  const handleCourseSaved = () => {
    setIsFormDrawerOpen(false);
    refresh();
  };

  const _handleQuickView = (course: Course) => {
    setQuickViewCourse(course);
    setIsQuickViewOpen(true);
  };

  const handleSetStatus = async (id: string, status: CourseStatus) => {
    await setCourseStatus(id, status);
    refresh();
  };

  const handleDuplicateCourse = async (id: string) => {
    await duplicateCourse(id);
    refresh();
  };



  const getStatusColor = (status: CourseStatus) => {
    switch (status) {
      case 'Published': return 'green';
      case 'Archived':  return 'gray';
      default:          return 'default'; // Draft
    }
  };

  // Cover + status pill at top-right of the image
  const CoverWithStatus: React.FC<{ course: Course }> = ({ course }) => (
    <Link to={`/lms/course/${course.id}`} style={{ position: 'relative', width: '100%', display: 'block' }}>
      {course.coverUrl ? (
        <img
          alt={course.title}
          src={course.coverUrl}
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
            objectFit: 'cover',
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            display: 'block',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            background: 'linear-gradient(135deg, #33A1E0 0%, #ffffff 100%)',
          }}
        />
      )}

      {/* overlay mờ để tag luôn đọc được trên mọi ảnh */}
      <div
        style={{
          position: 'absolute',
          inset: '0 0 auto 0',
          height: 60,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          background: 'linear-gradient(180deg, rgba(0,0,0,.30) 0%, rgba(0,0,0,0) 80%)',
          pointerEvents: 'none',
        }}
      />

      <Tag
        color={getStatusColor(course.status)}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          margin: 0,
          borderRadius: 999,
          padding: '2px 8px',
          zIndex: 2,
        }}
      >
        {course.status}
      </Tag>
    </Link>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-4">
      <PageSEO title="Courses" description="Manage your courses" />

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center">
          <ReadOutlined className="mr-2 text-[#057EC8]" />
          Courses
        </h2>
        <Space>
          <RequireInstructor>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleNewCourse}>
              New Course
            </Button>
          </RequireInstructor>
        </Space>
      </div>

      {/* Filters */}
      <div className="bg-[#33A1E0] p-3 rounded-xl mb-4 border border-black/10">
        <Space wrap>
          <Search
            allowClear
            placeholder="Search course…"
            style={{ width: 280 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onSearch={(v) => setSearchInput(v)}
          />
          <Select
            mode="multiple"
            allowClear
            placeholder="Tags"
            style={{ minWidth: 220 }}
            value={tags}
            onChange={(value: string[]) => setTags(value)}
          >
            <Option value="React">React</Option>
            <Option value="TypeScript">TypeScript</Option>
            <Option value="Ant Design">Ant Design</Option>
            <Option value="Firebase">Firebase</Option>
          </Select>
          {/* selected bg = #77BEF0 */}
          <Segmented
            options={['All', 'Draft', 'Published', 'Archived']}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as 'All' | CourseStatus)}
            className="[&_.ant-segmented-item-selected]:bg-[#77BEF0]"
          />
        </Space>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} loading className="rounded-xl border border-black/10" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span>
              No courses yet
              {(role === 'instructor' || role === 'admin') && (
                <div className="mt-2">
                  <Button type="link" onClick={handleNewCourse}>Create a new course</Button>
                </div>
              )}
            </span>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {courses.map((course) => {
            const isAuthorized = role === 'instructor' || role === 'admin';
            
            // Debug log để kiểm tra
            
            return (
              <Card
                key={course.id}
                hoverable
                className="rounded-xl border border-black/10 hover:shadow-md transition"
                cover={<CoverWithStatus course={course} />}
              >
                <Card.Meta
                  title={
                    <Tooltip title={course.title}>
                      <Link
                        to={`/lms/course/${course.id}`}
                        className="font-bold text-blue-600 hover:text-blue-800 text-inherit"
                      >
                        <div className="whitespace-nowrap overflow-hidden text-ellipsis">
                          {course.title}
                        </div>
                      </Link>
                    </Tooltip>
                  }
                  description={
                    <div className="flex flex-col">
                      <div className="line-clamp-2 text-sm text-gray-600">
                        <SafeHTMLRenderer content={course.desc || ''} />
                      </div>
                      <div className="mt-2">
                        <Space wrap size={[0, 8]}>
                          {course.tags.slice(0, 3).map((tag) => (
                            <Tag key={tag} className="rounded-full">{tag}</Tag>
                          ))}
                          {course.tags.length > 3 && <Tag className="rounded-full">+{course.tags.length - 3}</Tag>}
                        </Space>
                      </div>
                      
                      {/* Action Buttons - Only for authorized users */}
                      {isAuthorized && (
                        <div className="mt-4 flex justify-end space-x-2">
                          {course.status === 'Published' ? (
                            <Tooltip title="Unpublish">
                              <Button 
                                type="default" 
                                danger 
                                icon={<CloseOutlined />} 
                                onClick={() => handleSetStatus(course.id, 'Draft')}
                                size="small"
                                style={{ 
                                  fontSize: '12px',
                                  border: '1px solid #ff4d4f',
                                  color: '#ff4d4f'
                                }}
                              />
                            </Tooltip>
                          ) : (
                            <Tooltip title="Publish">
                              <Button 
                                type="primary" 
                                icon={<CheckOutlined />} 
                                onClick={() => handleSetStatus(course.id, 'Published')}
                                size="small"
                                style={{ fontSize: '12px' }}
                              />
                            </Tooltip>
                          )}
                          
                          <Tooltip title="Edit">
                            <Button 
                              type="default" 
                              icon={<EditOutlined />} 
                              onClick={() => handleEditCourse(course)}
                              size="small"
                              style={{ 
                                fontSize: '12px',
                                border: '1px solid #d9d9d9',
                                color: '#1890ff'
                              }}
                            />
                          </Tooltip>
                          
                          <Tooltip title="Duplicate">
                            <Button 
                              type="default" 
                              icon={<CopyOutlined />} 
                              onClick={() => handleDuplicateCourse(course.id)}
                              size="small"
                              style={{ 
                                fontSize: '12px',
                                border: '1px solid #d9d9d9',
                                color: '#52c41a'
                              }}
                            />
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  }
                />
              </Card>
            );
          })}
        </div>
      )}

      {/* Drawers */}
      <CourseFormDrawer
        open={isFormDrawerOpen}
        mode={formDrawerMode}
        initial={editingCourse}
        onClose={() => setIsFormDrawerOpen(false)}
        onSaved={handleCourseSaved}
      />
      <CourseQuickView
        open={isQuickViewOpen}
        course={quickViewCourse}
        onClose={() => setIsQuickViewOpen(false)}
        onEdit={handleEditCourse}
        onSetStatus={handleSetStatus}
      />
    </div>
  );
};

export default CoursesPage;
