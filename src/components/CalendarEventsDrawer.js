import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from 'react';
import { Drawer, List, Avatar, Tag, Spin, message, Button, Space } from 'antd';
import { UserOutlined, CheckCircleOutlined, CloseCircleOutlined, QuestionCircleOutlined, SyncOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
const CalendarEventsDrawer = ({ isOpen, onClose, }) => {
    const [loading, setLoading] = useState(false);
    const [events, setEvents] = useState([]);
    const { isSignedIn, isGapiLoaded, error, handleAuthClick, ensureSignedIn, fetchCalendarEvents, isAuthLoading } = useGoogleCalendar();
    console.log("CalendarEventsDrawer - isSignedIn prop:", isSignedIn, "isAuthLoading:", isAuthLoading); // Debugging line
    const loadEvents = useCallback(async () => {
        console.log("loadEvents called. isSignedIn:", isSignedIn, "isGapiLoaded:", isGapiLoaded); // Debugging line
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
            setEvents(valid);
            message.success('Đã tải sự kiện lịch.');
        }
        catch (err) {
            console.error('Error fetching calendar events:', err);
            message.error(error || err.message || 'Không thể tải sự kiện lịch.');
        }
        finally {
            setLoading(false);
        }
    }, [isGapiLoaded, ensureSignedIn, fetchCalendarEvents, error]);
    useEffect(() => {
        if (isOpen && isSignedIn && isGapiLoaded) {
            loadEvents();
        }
    }, [isOpen, isSignedIn, isGapiLoaded, loadEvents]);
    const getAttendeeStatusTag = (status) => {
        switch (status) {
            case 'accepted':
                return _jsx(Tag, { icon: _jsx(CheckCircleOutlined, {}), color: "success", children: "\u0110\u00E3 ch\u1EA5p nh\u1EADn" });
            case 'declined':
                return _jsx(Tag, { icon: _jsx(CloseCircleOutlined, {}), color: "error", children: "\u0110\u00E3 t\u1EEB ch\u1ED1i" });
            case 'tentative':
                return _jsx(Tag, { icon: _jsx(QuestionCircleOutlined, {}), color: "warning", children: "C\u00F3 th\u1EC3 tham gia" });
            case 'needsAction':
                return _jsx(Tag, { icon: _jsx(SyncOutlined, { spin: true }), color: "processing", children: "\u0110ang ch\u1EDD" });
            default:
                return _jsx(Tag, { children: status || 'Không rõ' });
        }
    };
    if (isAuthLoading) {
        return (_jsx(Drawer, { title: "S\u1EF1 ki\u1EC7n Google Calendar", placement: "right", width: "33vw", open: isOpen, onClose: onClose, children: _jsxs("div", { style: { textAlign: 'center', padding: '20px' }, children: [_jsx(Spin, { size: "large" }), _jsx("p", { style: { marginTop: 10 }, children: "\u0110ang ki\u1EC3m tra tr\u1EA1ng th\u00E1i \u0111\u0103ng nh\u1EADp..." })] }) }));
    }
    if (!isSignedIn) {
        return (_jsx(Drawer, { title: "S\u1EF1 ki\u1EC7n Google Calendar", placement: "right", width: "33vw", open: isOpen, onClose: onClose, children: _jsxs("div", { style: { textAlign: 'center', padding: '20px' }, children: [_jsx("p", { children: "Vui l\u00F2ng \u0111\u0103ng nh\u1EADp Google \u0111\u1EC3 xem c\u00E1c s\u1EF1 ki\u1EC7n l\u1ECBch." }), _jsx(Button, { type: "primary", onClick: handleAuthClick, children: "\u0110\u0103ng nh\u1EADp Google" }), error && _jsxs("p", { style: { color: 'red', marginTop: 8 }, children: ["L\u1ED7i: ", error] })] }) }));
    }
    return (_jsx(Drawer, { title: "S\u1EF1 ki\u1EC7n Google Calendar", placement: "right", width: "33vw", open: isOpen, onClose: onClose, extra: _jsx(Button, { icon: _jsx(SyncOutlined, {}), onClick: loadEvents, loading: loading, disabled: !isGapiLoaded || !isSignedIn, children: "L\u00E0m m\u1EDBi" }), children: loading ? (_jsxs("div", { style: { textAlign: 'center', padding: '20px' }, children: [_jsx(Spin, { size: "large" }), _jsx("p", { style: { marginTop: 10 }, children: "\u0110ang t\u1EA3i s\u1EF1 ki\u1EC7n..." })] })) : (_jsx(List, { itemLayout: "horizontal", dataSource: events, rowKey: (e) => e.id, renderItem: (event) => (_jsx(List.Item, { actions: [
                    event.htmlLink ? (_jsx("a", { href: event.htmlLink, target: "_blank", rel: "noreferrer", children: "Xem tr\u00EAn Google Calendar" }, "view")) : null,
                ], children: _jsx(List.Item.Meta, { avatar: _jsx(Avatar, { icon: _jsx(UserOutlined, {}) }), title: event.htmlLink ? (_jsx("a", { href: event.htmlLink, target: "_blank", rel: "noreferrer", children: event.summary || 'Không có tiêu đề' })) : (event.summary || 'Không có tiêu đề'), description: _jsxs(Space, { direction: "vertical", size: 4, children: [_jsxs("span", { children: ["Th\u1EDDi gian b\u1EAFt \u0111\u1EA7u: ", event.start?.dateTime && dayjs(event.start.dateTime).format('DD/MM/YY HH:mm')] }), _jsxs("span", { children: ["Th\u1EDDi gian k\u1EBFt th\u00FAc: ", event.end?.dateTime && dayjs(event.end.dateTime).format('DD/MM/YY HH:mm')] }), event.attendees && event.attendees.length > 0 && (_jsxs("div", { children: [_jsx("strong", { children: "Kh\u00E1ch m\u1EDDi:" }), _jsx(List, { size: "small", dataSource: event.attendees, renderItem: attendee => (_jsx(List.Item, { children: _jsx(List.Item.Meta, { avatar: _jsx(Avatar, { size: "small", icon: _jsx(UserOutlined, {}) }), title: attendee.email || 'Không rõ', description: attendee.responseStatus ? getAttendeeStatusTag(attendee.responseStatus) : _jsx(Tag, { children: "Kh\u00F4ng r\u00F5" }) }) })) })] }))] }) }) })) })) }));
};
export default CalendarEventsDrawer;
