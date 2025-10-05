import { Modal, Form, Input, Button, DatePicker, message, Alert } from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';

import useAuth from '../auth/useAuth';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';

interface CreateCalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateCalendarEventModal: React.FC<CreateCalendarEventModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { user, isGoogleCalendarAuthed } = useAuth();
  const { isSignedIn, isGapiLoaded, error, createCalendarEvent } = useGoogleCalendar();

  useEffect(() => {
    if (isOpen) {
      form.resetFields();
    }
  }, [isOpen, form]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      const startDateTime = dayjs(values.start).toISOString();
      const endDateTime = dayjs(values.end).toISOString();
      const attendees = values.attendees
        ? values.attendees.split(',').map((email: string) => ({ email: email.trim() }))
        : [];

      const event = {
        summary: values.summary,
        description: values.description,
        start: {
          dateTime: startDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        attendees: attendees,
      };

      await createCalendarEvent(event);
      message.success("Đã tạo lịch nhắc hẹn thành công!");
      onClose();
    } catch (err: any) {
      console.error("Failed to create calendar event:", err);
      message.error(error || err.message || "Không thể tạo lịch nhắc hẹn.");
    } finally {
      setLoading(false);
    }
  };

  if (!isGapiLoaded) {
    return (
      <Modal
        title="Tạo lịch nhắc hẹn Google Calendar"
        open={isOpen}
        onCancel={onClose}
        footer={null}
      >
        <p>Đang tải Google API...</p>
        {error && <p style={{ color: 'red' }}>Lỗi: {error}</p>}
      </Modal>
    );
  }

  // Show unified authentication status
  const showAuthRequired = !user || (!isSignedIn && !isGoogleCalendarAuthed);
  
  if (showAuthRequired) {
    return (
      <Modal
        title="Tạo lịch nhắc hẹn Google Calendar"
        open={isOpen}
        onCancel={onClose}
        footer={null}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          {!user ? (
            <>
              <Alert
                message="Cần đăng nhập"
                description="Vui lòng đăng nhập vào hệ thống trước để tạo sự kiện lịch."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <p>Bạn có thể đăng nhập từ sidebar bên trái.</p>
            </>
          ) : (
            <>
              <Alert
                message="Cần cấp quyền Google Calendar"
                description="Để tạo sự kiện lịch, vui lòng cấp quyền truy cập Google Calendar từ sidebar bên trái."
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <p>Bạn có thể cấp quyền Google Calendar từ sidebar bên trái.</p>
            </>
          )}
          {error && <Alert message={error} type="error" style={{ marginTop: 16 }} />}
        </div>
      </Modal>
    );
  }

  return (
      <Modal
        title="Tạo lịch nhắc hẹn Google Calendar"
        open={isOpen}
        onCancel={onClose}
        footer={[
          <Button key="cancel" onClick={onClose}>
            Hủy
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmit} loading={loading} disabled={loading}>
            Tạo lịch
          </Button>,
        ]}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="summary"
            label="Tiêu đề sự kiện"
            rules={[{ required: true, message: "Vui lòng nhập tiêu đề sự kiện!" }]}
          >
            <Input placeholder="Ví dụ: Họp dự án X" disabled={loading} />
          </Form.Item>

        <Form.Item
          name="description"
          label="Mô tả"
        >
          <Input.TextArea placeholder="Mô tả chi tiết về sự kiện" autoSize={{ minRows: 3, maxRows: 5 }} disabled={loading} />
        </Form.Item>

        <Form.Item
          name="start"
          label="Thời gian bắt đầu"
          rules={[{ required: true, message: "Vui lòng chọn thời gian bắt đầu!" }]}
        >
          <DatePicker
            showTime
            format="YYYY-MM-DD HH:mm"
            style={{ width: "100%" }}
            disabled={loading}
          />
        </Form.Item>

        <Form.Item
          name="end"
          label="Thời gian kết thúc"
          rules={[{ required: true, message: "Vui lòng chọn thời gian kết thúc!" }]}
        >
          <DatePicker
            showTime
            format="YYYY-MM-DD HH:mm"
            style={{ width: "100%" }}
            disabled={loading}
          />
        </Form.Item>

        <Form.Item
          name="attendees"
          label="Người tham dự (Email, cách nhau bởi dấu phẩy)"
        >
          <Input placeholder="email1@example.com, email2@example.com" disabled={loading} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateCalendarEventModal;
