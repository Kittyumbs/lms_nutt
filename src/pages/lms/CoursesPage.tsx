import React, { useState } from 'react';
import { Button, Input, Select, Segmented, Card, Space, Empty, Tooltip, Tag, Layout } from 'antd';
import { PlusOutlined, EditOutlined, EllipsisOutlined, EyeOutlined, DeleteOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useCourses, createCourse, updateCourse, duplicateCourse, setCourseStatus, Course, CourseStatus } from '../../hooks/useCourses';
import CourseFormDrawer from './components/CourseFormDrawer';
import CourseQuickView from './components/CourseQuickView';
import { PageSEO } from '../../utils/seo';

const { Content } = Layout;
const { Search } = Input;
const { Option } = Select;

const CoursesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'All' | CourseStatus>('All');
  const [isFormDrawerOpen, setIsFormDrawerOpen] = useState(false);
  const [formDrawerMode, setFormDrawerMode] = useState<'create' | 'edit'>('create');
  const [editingCourse, setEditingCourse] = useState<Course | undefined>(undefined);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [quickViewCourse, setQuickViewCourse] = useState<Course | undefined>(undefined);

  const { items: courses, loading, refresh } = useCourses({ search, tags, status: statusFilter });

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

  const handleQuickView = (course: Course) => {
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
      case 'Draft': return 'default';
      case 'Archived': return 'gray';
      default: return 'default';
    }
  };

  const renderCover = (course: Course) => {
    if (course.coverUrl) {
      return <img alt={course.title} src={course.coverUrl} className="aspect-[16/9] object-cover rounded-t-xl" />;
    }
    return <div className="aspect-[16/9] bg-gradient-to-br from-[#33A1E0] to-white rounded-t-xl" />;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-4">
      <PageSEO title="Courses" description="Manage your courses" />

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Courses</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleNewCourse}>
          New Course
        </Button>
      </div>

      <div className="bg-[#33A1E0] p-3 rounded-xl mb-4 border border-black/10">
        <Space wrap>
          <Search
            allowClear
            placeholder="Search course…"
            style={{ width: 280 }}
            onSearch={(value) => setSearch(value)}
            onChange={(e) => {
              // Debounce search input
              const newValue = e.target.value;
              if (newValue === '') setSearch(''); // Clear immediately
              // Debounce logic for actual search
              const handler = setTimeout(() => setSearch(newValue), 300);
              return () => clearTimeout(handler);
            }}
          />
          <Select
            mode="multiple"
            allowClear
            placeholder="Tags"
            style={{ minWidth: 220 }}
            onChange={(value: string[]) => setTags(value)}
          >
            {/* Mock tags for now, will be dynamic later */}
            <Option value="React">React</Option>
            <Option value="TypeScript">TypeScript</Option>
            <Option value="Ant Design">Ant Design</Option>
            <Option value="Firebase">Firebase</Option>
          </Select>
          <Segmented
            options={['All', 'Draft', 'Published', 'Archived']}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as 'All' | CourseStatus)}
            className="[&_.ant-segmented-item-selected]:bg-[#33A1E0]" // Apply accent color to selected segment
          />
        </Space>
      </div>

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
              No courses yet <br />
              <Button type="link" onClick={handleNewCourse}>Create a new course</Button>
            </span>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {courses.map((course: Course) => (
            <Card
              key={course.id}
              hoverable
              className="rounded-xl border border-black/10 hover:shadow-md transition"
              cover={<div onClick={() => handleQuickView(course)}>{renderCover(course)}</div>}
              actions={[
                course.status === 'Published' ? (
                  <Tooltip title="Unpublish">
                    <Button type="text" icon={<CloseOutlined />} onClick={() => handleSetStatus(course.id, 'Draft')} />
                  </Tooltip>
                ) : (
                  <Tooltip title="Publish">
                    <Button type="text" icon={<CheckOutlined />} onClick={() => handleSetStatus(course.id, 'Published')} />
                  </Tooltip>
                ),
                <Tooltip title="Edit">
                  <Button type="text" icon={<EditOutlined />} onClick={() => handleEditCourse(course)} />
                </Tooltip>,
                <Tooltip title="More">
                  <Button type="text" icon={<EllipsisOutlined />} onClick={() => handleDuplicateCourse(course.id)} />
                </Tooltip>,
              ]}
            >
              <Card.Meta
                title={
                  <Tooltip title={course.title}>
                    <div className="font-bold whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => handleQuickView(course)}>
                      {course.title}
                    </div>
                  </Tooltip>
                }
                description={
                  <div className="flex flex-col"> {/* Container for description and tags */}
                    <p className="line-clamp-2 text-sm text-gray-600">{course.desc || 'No description provided.'}</p>
                    <div className="mt-2 flex justify-between items-end">
                      <Space wrap size={[0, 8]}> {/* Use Space for tags with consistent spacing */}
                        {course.tags.slice(0, 3).map((tag: string) => (
                          <Tag key={tag} className="rounded-full">{tag}</Tag>
                        ))}
                        {course.tags.length > 3 && (
                          <Tag className="rounded-full">+{course.tags.length - 3}</Tag>
                        )}
                      </Space>
                      <Tag color={getStatusColor(course.status)} className="rounded-full">
                        {course.status}
                      </Tag>
                    </div>
                  </div>
                }
              />
            </Card>
          ))}
        </div>
      )}

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
