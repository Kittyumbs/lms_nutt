import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { Button, Drawer, Form, Input, List, Avatar, Space, Popconfirm, message, Segmented } from 'antd';
import { PlusOutlined, LinkOutlined, DeleteOutlined } from '@ant-design/icons';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc, } from 'firebase/firestore';
import { db } from '../../firebase';
function toFavicon(url) {
    try {
        const u = new URL(url);
        return `${u.origin}/favicon.ico`;
    }
    catch {
        return undefined;
    }
}
function toHostname(url) {
    try {
        return new URL(url).hostname;
    }
    catch {
        return url;
    }
}
export default function UsefulDocsDrawer() {
    const [messageApi, contextHolder] = message.useMessage();
    const [open, setOpen] = useState(false);
    const [links, setLinks] = useState([]);
    const [filterDomain, setFilterDomain] = useState('ALL');
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    // Load realtime list
    useEffect(() => {
        const q = query(collection(db, 'usefulLinks'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            const items = [];
            snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
            setLinks(items);
        });
        return () => unsub();
    }, []);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);
    const displayTitle = (item) => item.userTitle?.trim() ||
        item.pageTitle?.trim() ||
        toHostname(item.url);
    const getDomain = (item) => {
        const host = item.domain || toHostname(item.url);
        return host.split('.')[0];
    };
    // domains pills (dynamic from data)
    const domainOptions = React.useMemo(() => {
        const set = new Set();
        links.forEach(l => set.add(getDomain(l)));
        return Array.from(set).sort();
    }, [links]);
    // filtered list
    const filteredLinks = React.useMemo(() => {
        if (filterDomain === 'ALL')
            return links;
        return links.filter(l => getDomain(l) === filterDomain);
    }, [links, filterDomain]);
    const onAdd = async () => {
        try {
            setLoading(true);
            const values = await form.validateFields();
            const url = values.url.trim();
            const userTitleRaw = values.title?.trim();
            const userTitle = userTitleRaw && userTitleRaw.length > 0 ? userTitleRaw : undefined;
            // basic URL check
            new URL(url);
            const faviconUrl = toFavicon(url); // may be undefined
            const pageTitle = ''; // optional for now
            const domain = new URL(url).hostname;
            // Build payload WITHOUT any undefined fields
            const docData = {
                url,
                domain,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                ...(userTitle ? { userTitle } : {}),
                ...(pageTitle ? { pageTitle } : {}),
                ...(faviconUrl ? { faviconUrl } : {}),
            };
            await addDoc(collection(db, 'usefulLinks'), docData);
            form.resetFields();
            messageApi.success('Đã thêm liên kết');
        }
        catch (err) {
            messageApi.error(err?.message || 'Không thể thêm liên kết');
        }
        finally {
            setLoading(false);
        }
    };
    const onDelete = async (id) => {
        if (!id)
            return;
        try {
            await deleteDoc(doc(db, 'usefulLinks', id));
            messageApi.success('Đã xoá');
        }
        catch (err) {
            messageApi.error(err?.message || 'Không thể xoá');
        }
    };
    return (_jsxs(_Fragment, { children: [contextHolder, _jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: handleOpen, children: "T\u00E0i li\u1EC7u th\u01B0\u1EDDng d\u00F9ng" }), _jsxs(Drawer, { title: "T\u00E0i li\u1EC7u th\u01B0\u1EDDng d\u00F9ng", placement: "right", width: "33vw", open: open, onClose: handleClose, children: [_jsxs(Form, { form: form, layout: "vertical", autoComplete: "off", children: [_jsx(Form.Item, { label: "Link (URL)", name: "url", rules: [
                                    { required: true, message: 'Vui lòng nhập URL' },
                                    {
                                        validator: (_, value) => {
                                            if (!value)
                                                return Promise.resolve();
                                            try {
                                                new URL(String(value));
                                                return Promise.resolve();
                                            }
                                            catch {
                                                return Promise.reject(new Error('URL không hợp lệ'));
                                            }
                                        },
                                    },
                                ], children: _jsx(Input, { placeholder: "https://example.com/tai-lieu", prefix: _jsx(LinkOutlined, {}) }) }), _jsx(Form.Item, { label: "Ti\u00EAu \u0111\u1EC1 (tu\u1EF3 ch\u1ECDn)", name: "title", children: _jsx(Input, { placeholder: "VD: Quy tr\u00ECnh x\u1EED l\u00FD \u0111\u01A1n Shopee" }) }), _jsxs(Space, { children: [_jsx(Button, { type: "primary", onClick: onAdd, loading: loading, children: "Th\u00EAm li\u00EAn k\u1EBFt" }), _jsx(Button, { onClick: () => form.resetFields(), children: "Xo\u00E1 nh\u1EADp" })] })] }), _jsx("div", { style: { marginTop: 24 } }), _jsx("div", { style: { marginBottom: 12 }, children: _jsx(Segmented, { value: filterDomain, onChange: (v) => setFilterDomain(String(v)), options: [
                                { label: 'Tất cả', value: 'ALL' },
                                ...domainOptions.map(d => ({ label: d, value: d })),
                            ], size: "large" }) }), _jsx(List, { itemLayout: "horizontal", dataSource: filteredLinks, renderItem: (item) => (_jsx(List.Item, { actions: [
                                _jsx(Popconfirm, { title: "Xo\u00E1 li\u00EAn k\u1EBFt?", okText: "Xo\u00E1", cancelText: "Hu\u1EF7", onConfirm: () => onDelete(item.id), children: _jsx(Button, { type: "text", danger: true, icon: _jsx(DeleteOutlined, {}) }) }, "del"),
                            ], children: _jsx(List.Item.Meta, { avatar: _jsx(Avatar, { src: item.faviconUrl, shape: "square" }), title: _jsx("a", { href: item.url, target: "_blank", rel: "noreferrer", children: displayTitle(item) }), description: item.url }) })) })] })] }));
}
