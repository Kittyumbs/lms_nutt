import React from 'react';
import { Drawer, Button, Tag, Space, Tabs, Tooltip } from 'antd';
import { EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { Course, CourseStatus } from '../../../hooks/useCourses';

interface CourseQuickViewProps {
  open: boolean;
  course?: Course;
  onClose: () => void;
  onEdit: (course: Course) => void;
  onSetStatus: (id: string, status: CourseStatus) => void;
}

const CourseQuickView: React.FC<CourseQuickViewProps> = ({ open, course, onClose, onEdit, onSetStatus }) => {
  if (!course) {
    return null;
  }

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
      return <img alt={course.title} src={course.coverUrl} className="aspect-[16/9] object-cover w-full" />;
    }
    return <div className="aspect-[16/9] bg-gradient-to-br from-[#D8EFF0] to-white w-full" />;
  };

  return (
    <Drawer
      title={null}
      placement="right"
      width={520}
      onClose={onClose}
      open={open}
      closable={false}
      bodyStyle={{ padding: 0 }}
      styles={{ header: { display: 'none' } }}
    >
      <div className="relative">
        {renderCover(course)}
        {/* Close button at top-left */}
        <Button
          type="text"
          icon={<CloseOutlined className="text-white text-lg" />}
          onClick={onClose}
          className="absolute top-4 left-4 z-10 bg-black/20 hover:bg-black/40 rounded-full w-8 h-8 flex items-center justify-center"
        />
        {/* Edit button at top-right */}
        <Button
          type="text"
          icon={<EditOutlined className="text-white text-lg" />}
          onClick={() => onEdit(course)}
          className="absolute top-4 right-4 z-10 bg-black/20 hover:bg-black/40 rounded-full w-8 h-8 flex items-center justify-center"
        />
      </div>
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-2xl font-bold">{course.title}</h3>
          <Tag color={getStatusColor(course.status)} className="rounded-full text-base px-3 py-1">
            {course.status}
          </Tag>
        </div>
        <p className="text-gray-700 mb-4">{course.desc || 'No description provided.'}</p>
        <Space wrap className="mb-4">
          {course.tags.map((tag) => (
            <Tag key={tag} className="rounded-full">{tag}</Tag>
          ))}
        </Space>
        <Space className="mb-6">
          {course.status === 'Published' ? (
            <Tooltip title="Unpublish">
              <Button icon={<CloseOutlined />} onClick={() => onSetStatus(course.id, 'Draft')}>Unpublish</Button>
            </Tooltip>
          ) : (
            <Tooltip title="Publish">
              <Button icon={<CheckOutlined />} onClick={() => onSetStatus(course.id, 'Published')}>Publish</Button>
            </Tooltip>
          )}
        </Space>
        <Tabs
          defaultActiveKey="overview"
          items={[
            {
              key: 'overview',
              label: 'Overview',
              children: <p>Course overview content will go here.</p>,
            },
            {
              key: 'outline',
              label: 'Outline',
              disabled: true,
              children: <p>Course outline content (disabled for now).</p>,
            },
          ]}
        />
      </div>
    </Drawer>
  );
};

export default CourseQuickView;
