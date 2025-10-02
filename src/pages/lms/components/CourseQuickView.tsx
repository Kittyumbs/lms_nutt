import { EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { Drawer, Button, Tag, Space, Tabs, Tooltip } from 'antd';
import React from 'react';

import useRole from '../../../auth/useRole';

import type { Course, CourseStatus } from '../../../hooks/useCourses';

interface CourseQuickViewProps {
  open: boolean;
  course?: Course;
  onClose: () => void;
  onEdit: (course: Course) => void;
  onSetStatus: (id: string, status: CourseStatus) => void;
}

const CourseQuickView: React.FC<CourseQuickViewProps> = ({
  open,
  course,
  onClose,
  onEdit,
  onSetStatus,
}) => {
  const { role } = useRole();
  
  if (!course) return null;

  const getStatusColor = (status: CourseStatus) => {
    switch (status) {
      case 'Published':
        return 'green';
      case 'Archived':
        return 'gray';
      default:
        return 'default';
    }
  };

  // Check if user can edit this course
  const canEdit = role === 'admin' || role === 'instructor';

  const Cover = () => (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Ảnh / nền */}
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
            background:
              'linear-gradient(135deg, #D8EFF0 0%, rgba(255,255,255,1) 100%)',
          }}
        />
      )}

      {/* Overlay top để tăng tương phản nút */}
      <div
        style={{
          position: 'absolute',
          inset: '0 0 auto 0',
          height: 72,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          background:
            'linear-gradient(180deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,0) 80%)',
          pointerEvents: 'none',
        }}
      />

      {/* Nút Close góc trái */}
      <Button
        aria-label="Close"
        onClick={onClose}
        icon={<CloseOutlined style={{ color: '#fff', fontSize: 16 }} />}
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 2,
          border: 'none',
          backgroundColor: 'rgba(0,0,0,.45)',
          backdropFilter: 'saturate(120%) blur(2px)',
          width: 36,
          height: 36,
          borderRadius: 999,
          boxShadow: '0 2px 6px rgba(0,0,0,.2)',
          transition: 'background-color .15s ease, transform .15s ease',
        }}
        onMouseEnter={(e) => ((e.currentTarget.style.backgroundColor = '#057EC8'), (e.currentTarget.style.transform = 'translateY(-1px)'))}
        onMouseLeave={(e) => ((e.currentTarget.style.backgroundColor = 'rgba(0,0,0,.45)'), (e.currentTarget.style.transform = 'translateY(0)'))}
      />

      {/* Always show edit button clearly */}
      {canEdit && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 2,
            display: 'flex',
            gap: 6,
          }}
        >
          <Tooltip title="Edit">
            <Button
              shape="round"
              type="primary"
              size="small"
              icon={<EditOutlined style={{ fontSize: 14 }} />}
              onClick={() => onEdit(course)}
              style={{
                boxShadow: '0 2px 6px rgba(0,0,0,.15)',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              Edit
            </Button>
          </Tooltip>

          {course.status === 'Published' ? (
            <Tooltip title="Unpublish">
              <Button
                shape="round"
                danger
                size="small"
                icon={<CloseOutlined style={{ fontSize: 12 }} />}
                onClick={() => onSetStatus(course.id, 'Draft')}
                style={{
                  boxShadow: '0 2px 6px rgba(0,0,0,.15)',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                Unpublish
              </Button>
            </Tooltip>
          ) : (
            <Tooltip title="Publish">
              <Button
                shape="round"
                type="primary"
                size="small"
                icon={<CheckOutlined style={{ fontSize: 12 }} />}
                onClick={() => onSetStatus(course.id, 'Published')}
                className="bg-green-500 hover:bg-green-600 border-green-500"
                style={{
                  boxShadow: '0 2px 6px rgba(0,0,0,.15)',
                  fontSize: '12px',
                  fontWeight: 500,
                  borderColor: '#10b981'
                }}
              >
                Publish
              </Button>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );

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
      <Cover />

      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{course.title}</h3>
          <Tag color={getStatusColor(course.status)} style={{ borderRadius: 999, padding: '2px 10px' }}>
            {course.status}
          </Tag>
        </div>

        <p style={{ color: '#4b5563', marginBottom: 16 }}>{course.desc || 'No description provided.'}</p>

        <Space wrap style={{ marginBottom: 16 }}>
          {course.tags.map((tag) => (
            <Tag key={tag} style={{ borderRadius: 999 }}>
              {tag}
            </Tag>
          ))}
        </Space>

        <Tabs
          defaultActiveKey="overview"
          items={[
            { key: 'overview', label: 'Overview', children: <p>Course overview content will go here.</p> },
            { key: 'outline', label: 'Outline', disabled: true, children: <p>Course outline (coming soon)</p> },
          ]}
        />
      </div>
    </Drawer>
  );
};

export default CourseQuickView;
