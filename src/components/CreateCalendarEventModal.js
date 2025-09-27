import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Modal, Form, Input, Button, DatePicker, message } from 'antd';
import dayjs from 'dayjs';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
const CreateCalendarEventModal = ({ isOpen, onClose, isSignedIn, handleAuthClick, }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const { isGapiLoaded, error, createCalendarEvent } = useGoogleCalendar();
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
                ? values.attendees.split(',').map((email) => ({ email: email.trim() }))
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
        }
        catch (err) {
            console.error("Failed to create calendar event:", err);
            message.error(error || err.message || "Không thể tạo lịch nhắc hẹn.");
        }
        finally {
            setLoading(false);
        }
    };
    if (!isGapiLoaded) {
        return (_jsxs(Modal, { title: "T\u1EA1o l\u1ECBch nh\u1EAFc h\u1EB9n Google Calendar", open: isOpen, onCancel: onClose, footer: null, children: [_jsx("p", { children: "\u0110ang t\u1EA3i Google API..." }), error && _jsxs("p", { style: { color: 'red' }, children: ["L\u1ED7i: ", error] })] }));
    }
    if (!isSignedIn) {
        return (_jsx(Modal, { title: "T\u1EA1o l\u1ECBch nh\u1EAFc h\u1EB9n Google Calendar", open: isOpen, onCancel: onClose, footer: null, children: _jsxs("div", { style: { textAlign: 'center', padding: '20px' }, children: [_jsx("p", { children: "Vui l\u00F2ng \u0111\u0103ng nh\u1EADp Google \u0111\u1EC3 t\u1EA1o l\u1ECBch." }), _jsx(Button, { type: "primary", onClick: handleAuthClick, children: "\u0110\u0103ng nh\u1EADp Google" }), error && _jsxs("p", { style: { color: 'red', marginTop: 8 }, children: ["L\u1ED7i: ", error] })] }) }));
    }
    return (_jsx(Modal, { title: "T\u1EA1o l\u1ECBch nh\u1EAFc h\u1EB9n Google Calendar", open: isOpen, onCancel: onClose, footer: [
            _jsx(Button, { onClick: onClose, children: "H\u1EE7y" }, "cancel"),
            _jsx(Button, { type: "primary", onClick: handleSubmit, loading: loading, disabled: loading, children: "T\u1EA1o l\u1ECBch" }, "submit"),
        ], width: 600, children: _jsxs(Form, { form: form, layout: "vertical", children: [_jsx(Form.Item, { name: "summary", label: "Ti\u00EAu \u0111\u1EC1 s\u1EF1 ki\u1EC7n", rules: [{ required: true, message: "Vui lòng nhập tiêu đề sự kiện!" }], children: _jsx(Input, { placeholder: "V\u00ED d\u1EE5: H\u1ECDp d\u1EF1 \u00E1n X", disabled: loading }) }), _jsx(Form.Item, { name: "description", label: "M\u00F4 t\u1EA3", children: _jsx(Input.TextArea, { placeholder: "M\u00F4 t\u1EA3 chi ti\u1EBFt v\u1EC1 s\u1EF1 ki\u1EC7n", autoSize: { minRows: 3, maxRows: 5 }, disabled: loading }) }), _jsx(Form.Item, { name: "start", label: "Th\u1EDDi gian b\u1EAFt \u0111\u1EA7u", rules: [{ required: true, message: "Vui lòng chọn thời gian bắt đầu!" }], children: _jsx(DatePicker, { showTime: true, format: "YYYY-MM-DD HH:mm", style: { width: "100%" }, disabled: loading }) }), _jsx(Form.Item, { name: "end", label: "Th\u1EDDi gian k\u1EBFt th\u00FAc", rules: [{ required: true, message: "Vui lòng chọn thời gian kết thúc!" }], children: _jsx(DatePicker, { showTime: true, format: "YYYY-MM-DD HH:mm", style: { width: "100%" }, disabled: loading }) }), _jsx(Form.Item, { name: "attendees", label: "Ng\u01B0\u1EDDi tham d\u1EF1 (Email, c\u00E1ch nhau b\u1EDFi d\u1EA5u ph\u1EA9y)", children: _jsx(Input, { placeholder: "email1@example.com, email2@example.com", disabled: loading }) })] }) }));
};
export default CreateCalendarEventModal;
