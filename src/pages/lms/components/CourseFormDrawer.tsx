import { Drawer, Form, Input, Button, Select, Space, message, Popconfirm } from 'antd';
import React, { useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Custom ReactQuill wrapper for Ant Design Form integration
const ReactQuillWrapper: React.FC<{ value?: string; onChange?: (value: string) => void }> = ({ value, onChange }) => {
  const [content, setContent] = React.useState(value || '');
  
  React.useEffect(() => {
    setContent(value || '');
  }, [value]);
  
  const handleChange = (newContent: string) => {
    setContent(newContent);
    if (onChange) {
      onChange(newContent);
    }
  };
  
  return (
    <ReactQuill
      theme="snow"
      value={content}
      onChange={handleChange}
      style={{ height: '150px', marginBottom: '50px' }}
      modules={{
        toolbar: [
          [{ 'size': ['small', false, 'large', 'huge'] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'align': [] }],
          ['link'],
          ['clean']
        ],
        clipboard: {
          matchVisual: false,
        }
      }}
      formats={[
        'size', 'bold', 'italic', 'underline', 'strike',
        'color', 'background', 'list', 'bullet', 'align', 'link'
      ]}
    />
  );
};

const { Option } = Select;

import { createCourse, updateCourse, deleteCourse } from '../../../hooks/useCourses';

import type { Course} from '../../../hooks/useCourses';

interface CourseFormDrawerProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: Course;
  onClose: () => void;
  onSaved: () => void;
}

const { TextArea } = Input;

const CourseFormDrawer: React.FC<CourseFormDrawerProps> = ({ open, mode, initial, onClose, onSaved }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      form.resetFields();
      if (mode === 'edit' && initial) {
        form.setFieldsValue(initial);
      }
    }
  }, [open, mode, initial, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (mode === 'create') {
        await createCourse(values);
        message.success('Course created successfully!');
      } else if (mode === 'edit' && initial) {
        await updateCourse(initial.id, values);
        message.success('Course updated successfully!');
      }
      onSaved();
    } catch (error) {
      message.error('Failed to save course. Please check your input.');
      console.error('Failed to save course:', error);
    }
  };

  const handleDelete = async () => {
    if (!initial) return;
    
    try {
      await deleteCourse(initial.id);
      message.success('Course deleted successfully!');
      onSaved();
      onClose();
    } catch (error) {
      message.error('Failed to delete course. Please try again.');
      console.error('Failed to delete course:', error);
    }
  };

  const coverUrl = Form.useWatch('coverUrl', form);

  return (
    <Drawer
      title={mode === 'create' ? 'Create New Course' : 'Edit Course'}
      width={520}
      onClose={onClose}
      open={open}
      styles={{ body: { paddingBottom: 80 } }}
      extra={
        <Space>
          {mode === 'edit' && (
            <Popconfirm
              title="Delete Course"
              description="Are you sure you want to delete this course? This action cannot be undone."
              onConfirm={handleDelete}
              okText="Yes, Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button danger>
                Delete
              </Button>
            </Popconfirm>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} type="primary">
            Save
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" initialValues={initial}>
        <Form.Item
          name="title"
          label="Title"
          rules={[{ required: true, message: 'Please enter course title' }]}
        >
          <Input placeholder="Enter course title" />
        </Form.Item>
        <Form.Item 
          name="desc" 
          label="Description"
        >
          <ReactQuillWrapper />
        </Form.Item>
        <Form.Item name="tags" label="Tags">
          <Select mode="tags" placeholder="Select or create tags" />
        </Form.Item>
        <Form.Item name="coverUrl" label="Cover Image URL">
          <Input placeholder="Enter cover image URL" />
        </Form.Item>
        {coverUrl && (
          <Form.Item label="Cover Preview">
            <img src={coverUrl} alt="Cover Preview" className="aspect-[16/9] object-cover rounded-xl w-full" />
          </Form.Item>
        )}
        {!coverUrl && (
          <Form.Item label="Cover Preview">
            <div className="aspect-[16/9] bg-gradient-to-br from-[#D8EFF0] to-white rounded-xl w-full" />
          </Form.Item>
        )}
        {mode === 'edit' && (
          <Form.Item name="status" label="Status">
            <Select placeholder="Select status">
              <Option value="Draft">Draft</Option>
              <Option value="Published">Published</Option>
              <Option value="Archived">Archived</Option>
            </Select>
          </Form.Item>
        )}
      </Form>
    </Drawer>
  );
};

export default CourseFormDrawer;
