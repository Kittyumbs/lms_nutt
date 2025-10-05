import { UserOutlined, CheckCircleOutlined, CloseCircleOutlined, QuestionCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { Drawer, List, Avatar, Tag, Spin, message, Button, Space, Alert } from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useState, useCallback } from 'react';

import useAuth from '../auth/useAuth';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';

interface CalendarEventsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GoogleCalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  start?: {
    dateTime?: string;
    timeZone: string;
  };
  end?: {
    dateTime?: string;
    timeZone: string;
  };
  attendees?: Array<{
    email?: string;
    responseStatus?: 'accepted' | 'declined' | 'needsAction' | 'tentative';
  }>;
  htmlLink?: string;
}

const CalendarEventsDrawer: React.FC<CalendarEventsDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const { user, isGoogleCalendarAuthed } = useAuth();
  const { isSignedIn, isGapiLoaded, error, ensureSignedIn, fetchCalendarEvents, isAuthLoading } = useGoogleCalendar();


  const loadEvents = useCallback(async () => {
    if (!isGapiLoaded) {
      message.warning('Google API chưa sẵn sàng.');
      return;
    }
    setLoading(true);
    try {
      // ép đăng nhập nếu chưa
      await ensureSignedIn();

      const fetched = await fetchCalendarEvents();
      const valid = (fetched ?? []).filter(e => !!(e.id && e.summary));
      setEvents(valid as GoogleCalendarEvent[]);
      void message.success('Đã tải sự kiện lịch.');
    } catch (err) {
      console.error('Error fetching calendar events:', err);
      const errorMessage = err instanceof Error ? err.message : 'Không thể tải sự kiện lịch.';
      void message.error(error || errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isGapiLoaded, ensureSignedIn, fetchCalendarEvents, error]);

  useEffect(() => {
    if (isOpen && isSignedIn && isGapiLoaded) {
      void loadEvents();
    }
  }, [isOpen, isSignedIn, isGapiLoaded, loadEvents]);

  const getAttendeeStatusTag = (status?: string) => {
    switch (status) {
      case 'accepted':
        return <Tag icon={<CheckCircleOutlined />} color="success">Đã chấp nhận</Tag>;
      case 'declined':
        return <Tag icon={<CloseCircleOutlined />} color="error">Đã từ chối</Tag>;
      case 'tentative':
        return <Tag icon={<QuestionCircleOutlined />} color="warning">Có thể tham gia</Tag>;
      case 'needsAction':
        return <Tag icon={<SyncOutlined spin />} color="processing">Đang chờ</Tag>;
      default:
        return <Tag>{status || 'Không rõ'}</Tag>;
    }
  };

  if (isAuthLoading) {
    return (
      <Drawer
        title="Google Calendar Events"
        placement="right"
        width="33vw"
        open={isOpen}
        onClose={onClose}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
          <p style={{ marginTop: 10 }}>Đang kiểm tra trạng thái đăng nhập...</p>
        </div>
      </Drawer>
    );
  }

  // Show unified authentication status
  const showAuthRequired = !user || (!isSignedIn && !isGoogleCalendarAuthed);
  
  if (showAuthRequired) {
    return (
      <Drawer
        title="Google Calendar Events"
        placement="right"
        width="33vw"
        open={isOpen}
        onClose={onClose}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          {!user ? (
            <>
              <Alert
                message="Login Required"
                description="Please log in to the system first to use Google Calendar."
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
                description="To view and create calendar events, please grant Google Calendar access from the left sidebar."
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <p>You can grant Google Calendar permission from the left sidebar.</p>
            </>
          )}
          {error && <Alert message={error} type="error" style={{ marginTop: 16 }} />}
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer
      title="Sự kiện Google Calendar"
      placement="right"
      width="33vw"
      open={isOpen}
      onClose={onClose}
      extra={
        <Button
          icon={<SyncOutlined />}
          onClick={loadEvents}
          loading={loading}
          disabled={!isGapiLoaded || !isSignedIn}
        >
          Làm mới
        </Button>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
          <p style={{ marginTop: 10 }}>Đang tải sự kiện...</p>
        </div>
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={events}
          rowKey={(e) => e.id as string}
          renderItem={(event) => (
            <List.Item
              actions={[
                event.htmlLink ? (
                  <a key="view" href={event.htmlLink} target="_blank" rel="noreferrer">Xem trên Google Calendar</a>
                ) : null,
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={event.htmlLink ? (
                  <a href={event.htmlLink} target="_blank" rel="noreferrer">{event.summary || 'Không có tiêu đề'}</a>
                ) : (
                  event.summary || 'Không có tiêu đề'
                )}
                description={
                  <Space direction="vertical" size={4}>
                    <span>
                      Thời gian bắt đầu: {event.start?.dateTime && dayjs(event.start.dateTime).format('DD/MM/YY HH:mm')}
                    </span>
                    <span>
                      Thời gian kết thúc: {event.end?.dateTime && dayjs(event.end.dateTime).format('DD/MM/YY HH:mm')}
                    </span>
                    {event.attendees && event.attendees.length > 0 && (
                      <div>
                        <strong>Khách mời:</strong>
                        <List
                          size="small"
                          dataSource={event.attendees}
                          renderItem={attendee => (
                            <List.Item>
                              <List.Item.Meta
                                avatar={<Avatar size="small" icon={<UserOutlined />} />}
                                title={attendee.email || 'Không rõ'}
                                description={attendee.responseStatus ? getAttendeeStatusTag(attendee.responseStatus) : <Tag>Không rõ</Tag>}
                              />
                            </List.Item>
                          )}
                        />
                      </div>
                    )}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Drawer>
  );
};

export default CalendarEventsDrawer;
