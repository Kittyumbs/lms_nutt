import { Drawer, Form, Input, Button, Select, Space, message } from 'antd';
import React, { useEffect } from 'react';

import { createCourse, updateCourse } from '../../../hooks/useCourses';

import type { Course} from '../../../hooks/useCourses';

interface CourseFormDrawerProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: Course;
  onClose: () => void;
  onSaved: () => void;
}

const { TextArea } = Input;
const { Option } = Select;

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
        <Form.Item name="desc" label="Description">
          <TextArea rows={3} autoSize={{ minRows: 3, maxRows: 6 }} placeholder="Enter course description" />
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
