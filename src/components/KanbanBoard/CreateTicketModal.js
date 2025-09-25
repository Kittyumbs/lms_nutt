import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Modal, Form, Input, Select, Button, Space, DatePicker } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { getIssueTypeIcon, getPriorityIcon } from "../../utils/icons";
import dayjs from "dayjs";
const CreateTicketModal = ({ mode, isOpen, onClose, onCreateTicket, onUpdateTicket, initialData = null, loading = false, }) => {
    const [form] = Form.useForm();
    const [hasChanges, setHasChanges] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createUrls, setCreateUrls] = useState([]);
    const [createUrlInput, setCreateUrlInput] = useState("");
    const [editUrls, setEditUrls] = useState([]);
    const [editUrlInput, setEditUrlInput] = useState("");
    useEffect(() => {
        if (!isOpen)
            return;
        form.resetFields();
        setHasChanges(false);
        if (mode === "edit" && initialData) {
            setEditUrls(Array.isArray(initialData.urls) ? initialData.urls : []);
            setEditUrlInput("");
        }
        else if (mode === "create") {
            setCreateUrls([]);
            setCreateUrlInput("");
        }
    }, [isOpen, mode, initialData, form]);
    const handleSubmit = async () => {
        try {
            setIsSubmitting(true);
            const values = await form.validateFields();
            const formattedValues = {
                ...values,
                urls: mode === "edit" ? editUrls : createUrls,
                deadline: values.deadline
                    ? dayjs(values.deadline).toDate()
                    : undefined,
            };
            if (mode === "edit") {
                onUpdateTicket?.(formattedValues);
            }
            else {
                onCreateTicket?.(formattedValues);
            }
            form.resetFields();
            onClose();
        }
        catch (error) {
            console.error("Validation failed:", error);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleCloseModal = () => {
        if (!hasChanges) {
            onClose();
            return;
        }
        Modal.confirm({
            title: "Confirm close",
            content: "Unsaved changes will be lost",
            okText: "Close",
            cancelText: "Cancel",
            onOk: () => onClose(),
        });
    };
    return (_jsx(Modal, { title: mode === "edit" ? `Edit Ticket` : "Create New Ticket", open: isOpen, onCancel: handleCloseModal, footer: [
            _jsx(Button, { onClick: handleCloseModal, children: "Cancel" }, "cancel"),
            _jsx(Button, { type: "primary", onClick: handleSubmit, loading: isSubmitting || loading, disabled: isSubmitting || loading, children: mode === "edit" ? "Update" : "Create" }, "submit"),
        ], width: 600, children: _jsxs(Form, { form: form, layout: "vertical", initialValues: mode === "edit" && initialData
                ? {
                    ...initialData,
                    urls: Array.isArray(initialData.urls) && initialData.urls.length > 0
                        ? initialData.urls
                        : [{ url: "" }],
                    deadline: initialData.deadline ? dayjs(initialData.deadline) : undefined,
                }
                : { urls: [{ url: "" }] }, onValuesChange: () => setHasChanges(true), children: [_jsx(Form.Item, { name: "title", label: "Summary", rules: [{ required: true, message: "Please enter the ticket summary!" }], children: _jsx(Input, { placeholder: "Enter ticket summary" }) }), _jsx(Form.Item, { name: "issueType", label: "Issue Type", rules: [{ required: true, message: "Please select the issue type!" }], children: _jsxs(Select, { children: [_jsx(Select.Option, { value: "Task", children: _jsxs(Space, { children: [getIssueTypeIcon("Task"), "Task"] }) }), _jsx(Select.Option, { value: "Bug", children: _jsxs(Space, { children: [getIssueTypeIcon("Bug"), "Bug"] }) }), _jsx(Select.Option, { value: "Story", children: _jsxs(Space, { children: [getIssueTypeIcon("Story"), "Story"] }) })] }) }), _jsx(Form.Item, { name: "priority", label: "Priority", rules: [{ required: true, message: "Please select the priority!" }], children: _jsxs(Select, { children: [_jsx(Select.Option, { value: "low", children: _jsxs(Space, { children: [getPriorityIcon("low"), "Low"] }) }), _jsx(Select.Option, { value: "medium", children: _jsxs(Space, { children: [getPriorityIcon("medium"), "Medium"] }) }), _jsx(Select.Option, { value: "high", children: _jsxs(Space, { children: [getPriorityIcon("high"), "High"] }) })] }) }), _jsx(Form.Item, { name: "deadline", label: "Deadline", rules: [{ required: true, message: "Please select the deadline!" }], children: _jsx(DatePicker, { showTime: true, format: "YYYY-MM-DD HH:mm", style: { width: "100%" }, getPopupContainer: (trigger) => trigger.parentElement }) }), _jsx(Form.Item, { name: "description", label: "Description", rules: [
                        { required: true, message: "Please enter the ticket description!" },
                    ], children: _jsx(Input.TextArea, { placeholder: "Enter ticket description", autoSize: { minRows: 4, maxRows: 6 } }) }), mode === "create" ? (_jsxs(_Fragment, { children: [createUrls.length > 0 && (_jsxs("div", { style: { marginBottom: 12 }, children: [_jsx("div", { style: { fontWeight: 500, marginBottom: 4 }, children: "Added URLs:" }), _jsx("div", { className: "flex flex-col gap-1", children: createUrls.map((u, idx) => {
                                        let isUrl = false;
                                        try {
                                            isUrl = !!u.url && /^https?:\/\//.test(u.url) && Boolean(new URL(u.url));
                                        }
                                        catch {
                                            isUrl = false;
                                        }
                                        return (_jsxs("div", { className: "flex items-center", children: [isUrl ? (_jsx("a", { href: u.url, target: "_blank", rel: "noopener noreferrer", className: "text-blue-600 hover:underline text-xs truncate", onClick: (e) => e.stopPropagation(), children: new URL(u.url).hostname })) : (_jsx("span", { className: "text-xs text-gray-700", children: u.url })), _jsx(Button, { icon: _jsx(DeleteOutlined, {}), size: "small", danger: true, style: { marginLeft: 8, background: '#ff4d4f', borderColor: '#ff4d4f', color: '#fff' }, onClick: () => setCreateUrls(urls => urls.filter((_, i) => i !== idx)) })] }, idx));
                                    }) })] })), _jsx(Form.Item, { label: "Add new URL", children: _jsx(Input.Search, { placeholder: "Enter a link or any text", enterButton: "Add", value: createUrlInput, onChange: e => setCreateUrlInput(e.target.value), onSearch: value => {
                                    if (!value)
                                        return;
                                    setCreateUrls(urls => [...urls, { url: value }]);
                                    setCreateUrlInput("");
                                } }) })] })) : (_jsxs(_Fragment, { children: [editUrls.length > 0 && (_jsxs("div", { style: { marginBottom: 12 }, children: [_jsx("div", { style: { fontWeight: 500, marginBottom: 4 }, children: "Saved URLs:" }), _jsx("div", { className: "flex flex-col gap-1", children: editUrls.map((u, idx) => {
                                        let isUrl = false;
                                        try {
                                            isUrl = !!u.url && /^https?:\/\//.test(u.url) && Boolean(new URL(u.url));
                                        }
                                        catch {
                                            isUrl = false;
                                        }
                                        return (_jsxs("div", { className: "flex items-center", children: [isUrl ? (_jsx("a", { href: u.url, target: "_blank", rel: "noopener noreferrer", className: "text-blue-600 hover:underline text-xs truncate", onClick: (e) => e.stopPropagation(), children: new URL(u.url).hostname })) : (_jsx("span", { className: "text-xs text-gray-700", children: u.url })), _jsx(Button, { icon: _jsx(DeleteOutlined, {}), size: "small", danger: true, style: { marginLeft: 8, background: '#ff4d4f', borderColor: '#ff4d4f', color: '#fff' }, onClick: () => setEditUrls(urls => urls.filter((_, i) => i !== idx)) })] }, idx));
                                    }) })] })), _jsx(Form.Item, { label: "Add new URL", children: _jsx(Input.Search, { placeholder: "Enter a link or any text", enterButton: "Add", value: editUrlInput, onChange: e => setEditUrlInput(e.target.value), onSearch: value => {
                                    if (!value)
                                        return;
                                    setEditUrls(urls => [...urls, { url: value }]);
                                    setEditUrlInput("");
                                } }) })] }))] }, isOpen + mode + (initialData?.title || "") + (initialData?.urls?.map(u => u.url).join(",") || "")) }));
};
export default CreateTicketModal;
