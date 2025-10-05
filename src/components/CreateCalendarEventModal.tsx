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
      message.success("Calendar event created successfully!");
      onClose();
    } catch (err: any) {
      console.error("Failed to create calendar event:", err);
      message.error(error || err.message || "Unable to create calendar event.");
    } finally {
      setLoading(false);
    }
  };

  if (!isGapiLoaded) {
    return (
      <Modal
        title="Create Google Calendar Event"
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
        title="Create Google Calendar Event"
        open={isOpen}
        onCancel={onClose}
        footer={null}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          {!user ? (
            <>
              <Alert
                message="Login Required"
                description="Please log in to the system first to create calendar events."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <p>You can log in from the left sidebar.</p>
            </>
          ) : (
            <>
              <Alert
                message="Google Calendar Permission Required"
                description="To create calendar events, please grant Google Calendar access from the left sidebar."
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <p>You can grant Google Calendar permission from the left sidebar.</p>
            </>
          )}
          {error && <Alert message={error} type="error" style={{ marginTop: 16 }} />}
        </div>
      </Modal>
    );
  }

  return (
      <Modal
        title="Create Google Calendar Event"
        open={isOpen}
        onCancel={onClose}
        footer={[
          <Button key="cancel" onClick={onClose}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmit} loading={loading} disabled={loading}>
            Create Event
          </Button>,
        ]}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="summary"
            label="Event Title"
            rules={[{ required: true, message: "Please enter event title!" }]}
          >
            <Input placeholder="Example: Project X Meeting" disabled={loading} />
          </Form.Item>

        <Form.Item
          name="description"
          label="Description"
        >
          <Input.TextArea placeholder="Detailed description of the event" autoSize={{ minRows: 3, maxRows: 5 }} disabled={loading} />
        </Form.Item>

        <Form.Item
          name="start"
          label="Start Time"
          rules={[{ required: true, message: "Please select start time!" }]}
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
          label="End Time"
          rules={[{ required: true, message: "Please select end time!" }]}
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
          label="Attendees (Email, separated by commas)"
        >
          <Input placeholder="email1@example.com, email2@example.com" disabled={loading} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateCalendarEventModal;
