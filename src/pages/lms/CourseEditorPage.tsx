import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  DragOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  QuestionCircleOutlined,
  FilePdfOutlined,
  SaveOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { 
  Button, 
  Card, 
  Input, 
  Modal, 
  Form, 
  Select, 
  Space, 
  Typography, 
  Divider, 
  message, 
  Popconfirm,
  Tabs,
  InputNumber,
  Upload
} from 'antd';
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

import useRole from '../../auth/useRole';
import { useCourseDetail, type Module, type Lesson } from '../../hooks/useCourseDetail';
import { useCourseEditor } from '../../hooks/useCourseEditor';
import { PageSEO } from '../../utils/seo';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

export default function CourseEditorPage() {
  const { cid } = useParams<{ cid: string }>();
  const navigate = useNavigate();
  const { role } = useRole();
  const { course, modules, lessons, loading, error, refresh } = useCourseDetail(cid || '');
  const { 
    createModule, 
    updateModule, 
    deleteModule, 
    createLesson, 
    updateLesson, 
    deleteLesson,
    reorderModules,
    reorderLessons,
    loading: editorLoading 
  } = useCourseEditor(cid || '');

  // State for editing
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [lessonForm] = Form.useForm();

  // Check permissions
  if (role !== 'instructor' && role !== 'admin') {
    return (
      <div className="max-w-6xl mx-auto px-6 py-4">
        <Card>
          <div className="text-center py-8">
            <Title level={3}>Access Denied</Title>
            <Text type="secondary">You don't have permission to edit course content.</Text>
            <br />
            <Button type="primary" className="mt-4">
              <Link to="/lms/courses">Back to Courses</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-4">
        <Card loading />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-4">
        <Card>
          <div className="text-center py-8">
            <Title level={3}>Course Not Found</Title>
            <Text type="secondary">{error || 'The course you are looking for does not exist.'}</Text>
            <br />
            <Button type="primary" className="mt-4">
              <Link to="/lms/courses">Back to Courses</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const handleCreateModule = () => {
    setEditingModule(null);
    setIsModuleModalOpen(true);
  };

  const handleEditModule = (module: Module) => {
    setEditingModule(module);
    form.setFieldsValue(module);
    setIsModuleModalOpen(true);
  };

  const handleDeleteModule = async (moduleId: string) => {
    try {
      await deleteModule(moduleId);
      message.success('Module deleted successfully');
      refresh();
    } catch (error) {
      message.error('Failed to delete module');
    }
  };

  const handleCreateLesson = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setEditingLesson(null);
    lessonForm.resetFields();
    setIsLessonModalOpen(true);
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    lessonForm.setFieldsValue(lesson);
    setIsLessonModalOpen(true);
  };

  const handleDeleteLesson = async (lessonId: string) => {
    try {
      await deleteLesson(lessonId);
      message.success('Lesson deleted successfully');
      refresh();
    } catch (error) {
      message.error('Failed to delete lesson');
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination, type } = result;

    if (type === 'modules') {
      const newModules = Array.from(modules);
      const [reorderedModule] = newModules.splice(source.index, 1);
      newModules.splice(destination.index, 0, reorderedModule);

      // Update order for all modules
      const moduleOrders = newModules.map((module, index) => ({
        id: module.id,
        order: index + 1
      }));

      try {
        await reorderModules(moduleOrders);
        refresh();
      } catch (error) {
        message.error('Failed to reorder modules');
      }
    }
  };

  const getLessonTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <PlayCircleOutlined className="text-blue-500" />;
      case 'text': return <FileTextOutlined className="text-green-500" />;
      case 'quiz': return <QuestionCircleOutlined className="text-orange-500" />;
      case 'pdf': return <FilePdfOutlined className="text-red-500" />;
      default: return null;
    }
  };

  return (
    <>
      <PageSEO title={`Edit: ${course.title}`} description="Course Editor" />
      
      <div className="max-w-6xl mx-auto px-6 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate(`/lms/course/${cid}`)}
            >
              Back to Course
            </Button>
            <div>
              <Title level={2} className="mb-0">Edit Course Content</Title>
              <Text type="secondary">{course.title}</Text>
            </div>
          </div>
          <Button type="primary" icon={<SaveOutlined />}>
            Save Changes
          </Button>
        </div>

        {/* Course Modules */}
        <Card title="Course Modules" className="mb-6">
          <div className="mb-4">
            <Button 
              type="dashed" 
              icon={<PlusOutlined />} 
              onClick={handleCreateModule}
              className="w-full"
            >
              Add Module
            </Button>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="modules">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {modules.map((module, index) => (
                    <Draggable key={module.id} draggableId={module.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`mb-4 ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                        >
                          <Card
                            title={
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <DragOutlined className="text-gray-400" {...provided.dragHandleProps} />
                                  <span>{module.title}</span>
                                </div>
                                <Space>
                                  <Button 
                                    size="small" 
                                    icon={<PlusOutlined />}
                                    onClick={() => handleCreateLesson(module.id)}
                                  >
                                    Add Lesson
                                  </Button>
                                  <Button 
                                    size="small" 
                                    icon={<EditOutlined />}
                                    onClick={() => handleEditModule(module)}
                                  />
                                  <Popconfirm
                                    title="Delete Module?"
                                    description="This will also delete all lessons in this module."
                                    onConfirm={() => handleDeleteModule(module.id)}
                                    okText="Delete"
                                    cancelText="Cancel"
                                  >
                                    <Button 
                                      size="small" 
                                      danger 
                                      icon={<DeleteOutlined />}
                                    />
                                  </Popconfirm>
                                </Space>
                              </div>
                            }
                            size="small"
                          >
                            {module.description && (
                              <Text type="secondary" className="block mb-3">
                                {module.description}
                              </Text>
                            )}

                            {/* Module Lessons */}
                            <div className="space-y-2">
                              {module.lessons?.map((lesson, lessonIndex) => (
                                <div
                                  key={lesson.id}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                  <div className="flex items-center space-x-3">
                                    {getLessonTypeIcon(lesson.type)}
                                    <span className="font-medium">{lesson.title}</span>
                                    <Text type="secondary" className="text-xs">
                                      {lesson.type}
                                    </Text>
                                  </div>
                                  <Space>
                                    <Button 
                                      size="small" 
                                      icon={<EditOutlined />}
                                      onClick={() => handleEditLesson(lesson)}
                                    />
                                    <Popconfirm
                                      title="Delete Lesson?"
                                      onConfirm={() => handleDeleteLesson(lesson.id)}
                                      okText="Delete"
                                      cancelText="Cancel"
                                    >
                                      <Button 
                                        size="small" 
                                        danger 
                                        icon={<DeleteOutlined />}
                                      />
                                    </Popconfirm>
                                  </Space>
                                </div>
                              ))}
                              
                              {(!module.lessons || module.lessons.length === 0) && (
                                <div className="text-center py-4 text-gray-500">
                                  No lessons yet. Click "Add Lesson" to get started.
                                </div>
                              )}
                            </div>
                          </Card>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {modules.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Text>No modules yet. Click "Add Module" to create your first module.</Text>
            </div>
          )}
        </Card>

        {/* Module Modal */}
        <Modal
          title={editingModule ? 'Edit Module' : 'Create Module'}
          open={isModuleModalOpen}
          onCancel={() => {
            setIsModuleModalOpen(false);
            form.resetFields();
          }}
          footer={null}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={async (values) => {
              try {
                if (editingModule) {
                  await updateModule(editingModule.id, values);
                  message.success('Module updated!');
                } else {
                  await createModule(values);
                  message.success('Module created!');
                }
                setIsModuleModalOpen(false);
                form.resetFields();
                refresh();
              } catch (error) {
                message.error('Failed to save module');
              }
            }}
            initialValues={editingModule || { order: modules.length + 1 }}
          >
            <Form.Item
              name="title"
              label="Module Title"
              rules={[{ required: true, message: 'Please enter module title' }]}
            >
              <Input placeholder="Enter module title" />
            </Form.Item>
            
            <Form.Item
              name="description"
              label="Description"
            >
              <TextArea 
                rows={3} 
                placeholder="Enter module description (optional)" 
              />
            </Form.Item>

            <Form.Item
              name="order"
              label="Order"
              rules={[{ required: true, message: 'Please enter order' }]}
            >
              <InputNumber 
                min={1} 
                placeholder="Module order" 
                className="w-full"
              />
            </Form.Item>

            <div className="flex justify-end space-x-2">
              <Button onClick={() => setIsModuleModalOpen(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingModule ? 'Update' : 'Create'}
              </Button>
            </div>
          </Form>
        </Modal>

        {/* Lesson Modal */}
        <Modal
          title={editingLesson ? 'Edit Lesson' : 'Create Lesson'}
          open={isLessonModalOpen}
          onCancel={() => {
            setIsLessonModalOpen(false);
            lessonForm.resetFields();
          }}
          footer={null}
          width={800}
        >
          <Form
            form={lessonForm}
            layout="vertical"
            onFinish={async (values) => {
              try {
                const lessonData = {
                  ...values,
                  moduleId: selectedModuleId || editingLesson?.moduleId,
                };

                if (editingLesson) {
                  await updateLesson(editingLesson.id, lessonData);
                  message.success('Lesson updated!');
                } else {
                  await createLesson(lessonData);
                  message.success('Lesson created!');
                }
                setIsLessonModalOpen(false);
                lessonForm.resetFields();
                refresh();
              } catch (error) {
                message.error('Failed to save lesson');
              }
            }}
            initialValues={editingLesson || { type: 'text', order: 1 }}
          >
            <Form.Item
              name="title"
              label="Lesson Title"
              rules={[{ required: true, message: 'Please enter lesson title' }]}
            >
              <Input placeholder="Enter lesson title" />
            </Form.Item>

            <Form.Item
              name="type"
              label="Lesson Type"
              rules={[{ required: true, message: 'Please select lesson type' }]}
            >
              <Select placeholder="Select lesson type">
                <Option value="text">
                  <div className="flex items-center space-x-2">
                    <FileTextOutlined />
                    <span>Text Lesson</span>
                  </div>
                </Option>
                <Option value="video">
                  <div className="flex items-center space-x-2">
                    <PlayCircleOutlined />
                    <span>Video Lesson</span>
                  </div>
                </Option>
                <Option value="quiz">
                  <div className="flex items-center space-x-2">
                    <QuestionCircleOutlined />
                    <span>Quiz Lesson</span>
                  </div>
                </Option>
                <Option value="pdf">
                  <div className="flex items-center space-x-2">
                    <FilePdfOutlined />
                    <span>PDF Lesson</span>
                  </div>
                </Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="order"
              label="Order"
              rules={[{ required: true, message: 'Please enter order' }]}
            >
              <InputNumber 
                min={1} 
                placeholder="Lesson order" 
                className="w-full"
              />
            </Form.Item>

            <Form.Item
              name="content"
              label="Content"
            >
              <TextArea 
                rows={6} 
                placeholder="Enter lesson content..." 
              />
            </Form.Item>

            <div className="flex justify-end space-x-2">
              <Button onClick={() => setIsLessonModalOpen(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingLesson ? 'Update' : 'Create'}
              </Button>
            </div>
          </Form>
        </Modal>
      </div>
    </>
  );
}
