import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  DragOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  QuestionCircleOutlined,
  FilePdfOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import MDEditor from '@uiw/react-md-editor';
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
  const [selectedLessonType, setSelectedLessonType] = useState<string>('text');
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
      message.success('✅ Xóa chương học thành công!');
      refresh();
    } catch (error) {
      message.error('❌ Không thể xóa chương học. Vui lòng thử lại!');
    }
  };

  const handleCreateLesson = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setEditingLesson(null);
    
    // Auto-suggest next order number
    const moduleLessons = lessons.filter(lesson => lesson.moduleId === moduleId);
    const nextOrder = moduleLessons.length > 0 ? Math.max(...moduleLessons.map(l => l.order)) + 1 : 1;
    
    lessonForm.resetFields();
    lessonForm.setFieldsValue({ 
      type: 'text', 
      order: nextOrder 
    });
    setSelectedLessonType('text');
    setIsLessonModalOpen(true);
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setSelectedLessonType(lesson.type);
    lessonForm.setFieldsValue(lesson);
    setIsLessonModalOpen(true);
  };

  const handleDeleteLesson = async (lessonId: string) => {
    try {
      await deleteLesson(lessonId);
      message.success('✅ Xóa bài học thành công!');
      refresh();
    } catch (error) {
      message.error('❌ Không thể xóa bài học. Vui lòng thử lại!');
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
        message.error('❌ Không thể sắp xếp lại chương học. Vui lòng thử lại!');
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
              Quay lại khóa học
            </Button>
            <div>
              <Title level={2} className="mb-0">Chỉnh sửa nội dung khóa học</Title>
              <Text type="secondary">{course.title}</Text>
            </div>
          </div>
        </div>


        {/* Course Modules */}
        <Card 
          title={
            <div className="flex items-center space-x-2">
              <span>📚 Danh sách chương học</span>
              <Text type="secondary" className="text-sm">
                ({modules.length} chương)
              </Text>
            </div>
          } 
          className="mb-6"
        >
          <div className="mb-4">
            <Button 
              type="dashed" 
              icon={<PlusOutlined />} 
              onClick={handleCreateModule}
              className="w-full h-12 text-base"
            >
              ➕ Thêm chương học mới
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
                                  <span className="font-semibold text-lg">📖 {module.title}</span>
                                  <Text type="secondary" className="text-sm">
                                    ({module.lessons?.length || 0} bài học)
                                  </Text>
                                </div>
                                <Space>
                                  <Button 
                                    size="small" 
                                    icon={<PlusOutlined />}
                                    onClick={() => handleCreateLesson(module.id)}
                                    type="primary"
                                  >
                                    ➕ Thêm bài học
                                  </Button>
                                  <Button 
                                    size="small" 
                                    icon={<EditOutlined />}
                                    onClick={() => handleEditModule(module)}
                                    title="Chỉnh sửa chương"
                                  />
                                  <Popconfirm
                                    title="Xóa chương học?"
                                    description="Hành động này sẽ xóa tất cả bài học trong chương này. Bạn có chắc chắn?"
                                    onConfirm={() => handleDeleteModule(module.id)}
                                    okText="Xóa"
                                    cancelText="Hủy"
                                  >
                                    <Button 
                                      size="small" 
                                      danger 
                                      icon={<DeleteOutlined />}
                                      title="Xóa chương"
                                    />
                                  </Popconfirm>
                                </Space>
                              </div>
                            }
                            size="small"
                            className="mb-4"
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
                                  className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 border border-blue-200"
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-2">
                                      {getLessonTypeIcon(lesson.type)}
                                      <span className="font-medium text-gray-800">
                                        Bài {lessonIndex + 1}: {lesson.title}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                        {lesson.type === 'video' ? '🎥 Video' : 
                                         lesson.type === 'text' ? '📝 Văn bản' :
                                         lesson.type === 'quiz' ? '❓ Trắc nghiệm' : '📄 PDF'}
                                      </span>
                                    </div>
                                  </div>
                                  <Space>
                                    <Button 
                                      size="small" 
                                      icon={<EditOutlined />}
                                      onClick={() => handleEditLesson(lesson)}
                                      title="Chỉnh sửa bài học"
                                    />
                                    <Popconfirm
                                      title="Xóa bài học?"
                                      description="Bạn có chắc chắn muốn xóa bài học này?"
                                      onConfirm={() => handleDeleteLesson(lesson.id)}
                                      okText="Xóa"
                                      cancelText="Hủy"
                                    >
                                      <Button 
                                        size="small" 
                                        danger 
                                        icon={<DeleteOutlined />}
                                        title="Xóa bài học"
                                      />
                                    </Popconfirm>
                                  </Space>
                                </div>
                              ))}
                              
                              {(!module.lessons || module.lessons.length === 0) && (
                                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                  <div className="space-y-2">
                                    <div className="text-4xl">📚</div>
                                    <div className="font-medium">Chưa có bài học nào</div>
                                    <div className="text-sm">Click "➕ Thêm bài học" để bắt đầu tạo nội dung</div>
                                  </div>
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
            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="space-y-4">
                <div className="text-6xl">📚</div>
                <div className="space-y-2">
                  <div className="text-xl font-medium text-gray-700">Chưa có chương học nào</div>
                  <div className="text-gray-500">Bắt đầu tạo nội dung khóa học của bạn</div>
                  <div className="text-sm text-gray-400">Click "➕ Thêm chương học mới" để bắt đầu</div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Module Modal */}
        <Modal
          title={
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <FileTextOutlined className="text-green-600" />
                <span className="text-lg font-semibold">
                  {editingModule ? 'Chỉnh sửa chương học' : 'Tạo chương học mới'}
                </span>
              </div>
              {editingModule && (
                <div className="text-sm text-gray-600 ml-6">
                  Chương: <span className="font-medium">{editingModule.title}</span>
                </div>
              )}
            </div>
          }
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
                  message.success('✅ Cập nhật chương học thành công!');
                } else {
                  await createModule(values);
                  message.success('✅ Tạo chương học thành công!');
                }
                setIsModuleModalOpen(false);
                form.resetFields();
                refresh();
              } catch (error) {
                message.error('❌ Không thể lưu chương học. Vui lòng thử lại!');
              }
            }}
            initialValues={editingModule || { order: modules.length + 1 }}
          >
            <Form.Item
              name="title"
              label="Tên chương học"
              rules={[{ required: true, message: 'Vui lòng nhập tên chương học' }]}
            >
              <Input placeholder="VD: Chương 1 - Giới thiệu cơ bản" />
            </Form.Item>
            
            <Form.Item
              name="description"
              label="Mô tả chương học"
            >
              <TextArea 
                rows={3} 
                placeholder="Mô tả ngắn gọn về nội dung chương học này (tùy chọn)" 
              />
            </Form.Item>

            <Form.Item
              name="order"
              label="Thứ tự chương"
              rules={[{ required: true, message: 'Vui lòng nhập thứ tự chương' }]}
            >
              <InputNumber 
                min={1} 
                placeholder="Thứ tự hiển thị của chương" 
                className="w-full"
              />
            </Form.Item>

            <div className="flex justify-end space-x-2">
              <Button onClick={() => setIsModuleModalOpen(false)}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit">
                {editingModule ? 'Cập nhật' : 'Tạo chương'}
              </Button>
            </div>
          </Form>
        </Modal>

        {/* Lesson Modal */}
        <Modal
          title={
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <FileTextOutlined className="text-blue-600" />
                <span className="text-lg font-semibold">
                  {editingLesson ? 'Chỉnh sửa bài học' : 'Tạo bài học mới'}
                </span>
              </div>
              {editingLesson && (
                <div className="text-sm text-gray-600 ml-6">
                  Bài học: <span className="font-medium">{editingLesson.title}</span>
                </div>
              )}
            </div>
          }
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
                let content = values.content;
                
                // Handle different lesson types
                if (values.type === 'video' && values.videoUrls) {
                  content = JSON.stringify({
                    description: values.content,
                    videoUrls: values.videoUrls
                  });
                } else if (values.type === 'pdf' && values.pdfUrls) {
                  content = JSON.stringify({
                    description: values.content,
                    pdfUrls: values.pdfUrls
                  });
                } else if (values.type === 'quiz') {
                  // Content is already JSON from the form
                  content = values.content;
                }

                const lessonData = {
                  ...values,
                  content,
                  moduleId: selectedModuleId || editingLesson?.moduleId,
                };

                // Remove extra fields that shouldn't be saved
                delete lessonData.videoUrls;
                delete lessonData.pdfUrls;

                if (editingLesson) {
                  await updateLesson(editingLesson.id, lessonData);
                  message.success('✅ Cập nhật bài học thành công!');
                } else {
                  await createLesson(lessonData);
                  message.success('✅ Tạo bài học thành công!');
                }
                setIsLessonModalOpen(false);
                lessonForm.resetFields();
                setSelectedLessonType('text');
                refresh();
              } catch (error) {
                message.error('❌ Không thể lưu bài học. Vui lòng thử lại!');
              }
            }}
            initialValues={editingLesson || { type: 'text' }}
          >
            <Form.Item
              name="title"
              label="Tên bài học"
              rules={[{ required: true, message: 'Vui lòng nhập tên bài học' }]}
            >
              <Input placeholder="VD: Bài 1 - Giới thiệu về React" />
            </Form.Item>

            <Form.Item
              name="type"
              label="Loại bài học"
              rules={[{ required: true, message: 'Vui lòng chọn loại bài học' }]}
            >
              <Select 
                placeholder="Chọn loại bài học"
                onChange={(value) => setSelectedLessonType(value)}
              >
                <Option value="text">
                  <div className="flex items-center space-x-2">
                    <FileTextOutlined />
                    <span>Bài học văn bản</span>
                  </div>
                </Option>
                <Option value="video">
                  <div className="flex items-center space-x-2">
                    <PlayCircleOutlined />
                    <span>Bài học video</span>
                  </div>
                </Option>
                <Option value="quiz">
                  <div className="flex items-center space-x-2">
                    <QuestionCircleOutlined />
                    <span>Bài trắc nghiệm</span>
                  </div>
                </Option>
                <Option value="pdf">
                  <div className="flex items-center space-x-2">
                    <FilePdfOutlined />
                    <span>Tài liệu PDF</span>
                  </div>
                </Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="order"
              label="Thứ tự bài học"
              rules={[{ required: true, message: 'Vui lòng nhập thứ tự bài học' }]}
            >
              <InputNumber 
                min={1} 
                placeholder="Thứ tự hiển thị của bài học trong chương" 
                className="w-full"
              />
            </Form.Item>

            {/* Dynamic content based on lesson type */}
            {selectedLessonType === 'text' && (
              <Form.Item
                name="content"
                label="Nội dung bài học"
                rules={[{ required: true, message: 'Vui lòng nhập nội dung bài học' }]}
              >
                <div data-color-mode="light">
                  <MDEditor
                    value={lessonForm.getFieldValue('content') || ''}
                    onChange={(value) => lessonForm.setFieldValue('content', value || '')}
                    height={300}
                    data-color-mode="light"
                  />
                </div>
              </Form.Item>
            )}

            {selectedLessonType === 'video' && (
              <>
                <Form.Item
                  name="content"
                  label="Nội dung mô tả"
                  rules={[{ required: true, message: 'Vui lòng nhập mô tả video' }]}
                >
                  <div data-color-mode="light">
                    <MDEditor
                      value={lessonForm.getFieldValue('content') || ''}
                      onChange={(value) => lessonForm.setFieldValue('content', value || '')}
                      height={200}
                      data-color-mode="light"
                    />
                  </div>
                </Form.Item>
                <Form.Item
                  name="videoUrls"
                  label="Link video (có thể nhiều link)"
                  rules={[{ required: true, message: 'Vui lòng nhập ít nhất 1 link video' }]}
                >
                  <Select
                    mode="tags"
                    placeholder="Nhập link video YouTube, Vimeo, v.v. (Enter để thêm)"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </>
            )}

            {selectedLessonType === 'pdf' && (
              <>
                <Form.Item
                  name="content"
                  label="Nội dung mô tả"
                  rules={[{ required: true, message: 'Vui lòng nhập mô tả tài liệu' }]}
                >
                  <div data-color-mode="light">
                    <MDEditor
                      value={lessonForm.getFieldValue('content') || ''}
                      onChange={(value) => lessonForm.setFieldValue('content', value || '')}
                      height={200}
                      data-color-mode="light"
                    />
                  </div>
                </Form.Item>
                <Form.Item
                  name="pdfUrls"
                  label="Link PDF (có thể nhiều link)"
                  rules={[{ required: true, message: 'Vui lòng nhập ít nhất 1 link PDF' }]}
                >
                  <Select
                    mode="tags"
                    placeholder="Nhập link PDF (Enter để thêm)"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </>
            )}

            {selectedLessonType === 'quiz' && (
              <Form.Item
                name="content"
                label="Nội dung câu hỏi trắc nghiệm"
                rules={[{ required: true, message: 'Vui lòng nhập nội dung câu hỏi' }]}
              >
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">Hướng dẫn tạo câu hỏi trắc nghiệm:</h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p>• <strong>Câu hỏi:</strong> Viết câu hỏi rõ ràng, dễ hiểu</p>
                      <p>• <strong>Đáp án:</strong> Tạo ít nhất 2 đáp án, tối đa 6 đáp án</p>
                      <p>• <strong>Đáp án đúng:</strong> Chỉ có 1 đáp án đúng</p>
                      <p>• <strong>Giải thích:</strong> Thêm giải thích cho đáp án đúng</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Input 
                      placeholder="Câu hỏi của bạn..." 
                      onChange={(e) => {
                        const currentContent = lessonForm.getFieldValue('content') || '{}';
                        try {
                          const quiz = JSON.parse(currentContent);
                          quiz.question = e.target.value;
                          lessonForm.setFieldValue('content', JSON.stringify(quiz, null, 2));
                        } catch {
                          lessonForm.setFieldValue('content', JSON.stringify({ question: e.target.value, options: [], correctAnswer: 0, explanation: '' }, null, 2));
                        }
                      }}
                    />
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Đáp án:</label>
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            name="correctAnswer" 
                            value={index}
                            onChange={(e) => {
                              const currentContent = lessonForm.getFieldValue('content') || '{}';
                              try {
                                const quiz = JSON.parse(currentContent);
                                quiz.correctAnswer = parseInt(e.target.value);
                                lessonForm.setFieldValue('content', JSON.stringify(quiz, null, 2));
                              } catch {
                                lessonForm.setFieldValue('content', JSON.stringify({ question: '', options: [], correctAnswer: parseInt(e.target.value), explanation: '' }, null, 2));
                              }
                            }}
                          />
                          <Input 
                            placeholder={`Đáp án ${String.fromCharCode(65 + index)}`}
                            onChange={(e) => {
                              const currentContent = lessonForm.getFieldValue('content') || '{}';
                              try {
                                const quiz = JSON.parse(currentContent);
                                if (!quiz.options) quiz.options = [];
                                quiz.options[index] = e.target.value;
                                lessonForm.setFieldValue('content', JSON.stringify(quiz, null, 2));
                              } catch {
                                lessonForm.setFieldValue('content', JSON.stringify({ question: '', options: [e.target.value], correctAnswer: 0, explanation: '' }, null, 2));
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    
                    <TextArea 
                      placeholder="Giải thích cho đáp án đúng..."
                      rows={3}
                      onChange={(e) => {
                        const currentContent = lessonForm.getFieldValue('content') || '{}';
                        try {
                          const quiz = JSON.parse(currentContent);
                          quiz.explanation = e.target.value;
                          lessonForm.setFieldValue('content', JSON.stringify(quiz, null, 2));
                        } catch {
                          lessonForm.setFieldValue('content', JSON.stringify({ question: '', options: [], correctAnswer: 0, explanation: e.target.value }, null, 2));
                        }
                      }}
                    />
                  </div>
                </div>
              </Form.Item>
            )}

            <div className="flex justify-end space-x-2">
              <Button onClick={() => setIsLessonModalOpen(false)}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit">
                {editingLesson ? 'Cập nhật' : 'Tạo bài học'}
              </Button>
            </div>
          </Form>
        </Modal>
      </div>
    </>
  );
}
