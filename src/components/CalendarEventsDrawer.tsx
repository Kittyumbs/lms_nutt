import React, { useEffect, useState, useCallback } from 'react';
import { Drawer, List, Avatar, Tag, Spin, message, Button, Space } from 'antd';
import { UserOutlined, CheckCircleOutlined, CloseCircleOutlined, QuestionCircleOutlined, SyncOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';

interface CalendarEventsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isSignedIn: boolean;
  handleAuthClick: () => void;
  userEmail: string | null; // Add userEmail prop
}

interface GoogleCalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  start?: {
    dateTime?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    timeZone?: string;
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
  isSignedIn,
  handleAuthClick,
  userEmail, // Destructure userEmail
}) => {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const { isGapiLoaded, error, fetchCalendarEvents, ensureSignedIn } = useGoogleCalendar();

  console.log("CalendarEventsDrawer - isSignedIn prop:", isSignedIn, "userEmail prop:", userEmail); // Debugging line

  const loadEvents = useCallback(async () => {
    console.log("loadEvents called. isSignedIn:", isSignedIn, "isGapiLoaded:", isGapiLoaded); // Debugging line
    if (!isGapiLoaded) {
      message.warning('Google API chưa sẵn sàng');
      console.log("loadEvents: gapi not loaded. Returning.");
      return;
    }
    setLoading(true);
    try {
      await ensureSignedIn(); // Ensure user is signed in
      const fetchedEvents = await fetchCalendarEvents();
      const validEvents: GoogleCalendarEvent[] = (fetchedEvents as GoogleCalendarEvent[]).filter((event: GoogleCalendarEvent) => event.id && event.summary);
      setEvents(validEvents);
      message.success("Đã tải sự kiện lịch thành công.");
    } catch (e: any) {
      console.error("Error fetching calendar events:", e);
      message.error(e?.message || "Không thể tải sự kiện lịch.");
    } finally {
      setLoading(false);
    }
  }, [isGapiLoaded, ensureSignedIn, fetchCalendarEvents]);

  useEffect(() => {
    if (isOpen && isSignedIn && isGapiLoaded) {
      loadEvents();
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

  if (!isGapiLoaded) {
    return (
      <Drawer
        title="Sự kiện Google Calendar"
        placement="right"
        width="33vw"
        open={isOpen}
        onClose={onClose}
      >
        <p>Đang tải Google API...</p>
        {error && <p style={{ color: 'red' }}>Lỗi: {error}</p>}
      </Drawer>
    );
  }

  if (!isSignedIn) {
    return (
      <Drawer
        title="Sự kiện Google Calendar"
        placement="right"
        width="33vw"
        open={isOpen}
        onClose={onClose}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>Vui lòng đăng nhập Google để xem các sự kiện lịch.</p>
          <Button type="primary" onClick={handleAuthClick}>
            Đăng nhập Google
          </Button>
          {error && <p style={{ color: 'red', marginTop: 8 }}>Lỗi: {error}</p>}
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
        <Button icon={<SyncOutlined />} onClick={loadEvents} loading={loading} disabled={!isSignedIn || !isGapiLoaded}>
          Làm mới
        </Button>
      }
    >
      {userEmail && (
        <div style={{ marginBottom: 16, textAlign: 'center', fontSize: '0.85em', color: '#555' }}>
          Đang xem lịch của: <strong>{userEmail}</strong>
        </div>
      )}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
          <p style={{ marginTop: 10 }}>Đang tải sự kiện...</p>
        </div>
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={events}
          rowKey="id" // Add rowKey for performance and stability
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
