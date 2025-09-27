import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { CheckSquareOutlined, BookOutlined, AppstoreOutlined, BarChartOutlined, FileTextOutlined } from '@ant-design/icons';
const LS_KEY = 'sidebar-collapsed'; // 'true' = collapsed
function Item({ to, label, collapsed, icon }) {
    return (_jsx(NavLink, { to: to, className: ({ isActive }) => collapsed
            ? `flex justify-center items-center h-12 mx-1 rounded-lg text-xl transition-colors duration-200 ${isActive ? 'bg-[#057EC8] text-white shadow-sm' : 'text-[#333] hover:bg-[#f0f8ff] hover:text-[#057EC8]'}`
            : `flex items-center px-3 py-2 mx-2 rounded-lg text-sm transition-colors duration-200 ${isActive ? 'bg-[#057EC8] text-white font-semibold shadow-sm' : 'text-[#333] hover:bg-[#f0f8ff] hover:text-[#057EC8]'}`, title: label, end: true, children: collapsed ? icon : _jsx("span", { className: "font-medium", children: label }) }));
}
export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const { pathname } = useLocation();
    useEffect(() => {
        const raw = localStorage.getItem(LS_KEY);
        setCollapsed(raw === 'true');
    }, []);
    useEffect(() => {
        localStorage.setItem(LS_KEY, String(collapsed));
    }, [collapsed]);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    return (_jsxs(_Fragment, { children: [isMobile && !collapsed && (_jsx("div", { onClick: () => setCollapsed(true), style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 39 } })), _jsxs("aside", { style: {
                    width: collapsed ? 56 : 240,
                    transition: 'width .18s ease',
                    borderRight: '1px solid #eee',
                    background: '#fff',
                    position: 'sticky',
                    top: 0,
                    height: '100vh',
                    zIndex: 40,
                }, children: [_jsxs("div", { style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: collapsed ? 'center' : 'space-between',
                            padding: '16px 12px',
                            borderBottom: '1px solid #e5e7eb',
                            background: 'linear-gradient(135deg, #057EC8 0%, #0891b2 100%)',
                            color: 'white',
                        }, children: [!collapsed && _jsx("div", { style: { fontWeight: 700, fontSize: '18px', letterSpacing: '0.5px' }, children: "TaskManage" }), _jsx("button", { onClick: () => setCollapsed((v) => !v), "aria-label": "Toggle sidebar", title: "Toggle sidebar", style: {
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                    background: 'transparent',
                                    transition: 'all 0.2s ease',
                                }, children: "\u2630" })] }), _jsxs("nav", { style: { padding: 8 }, children: [_jsx("div", { style: { fontSize: 12, color: '#6b7280', padding: '6px 8px' }, children: collapsed ? 'M' : 'MAIN' }), _jsx(Item, { to: "/taskmanage", label: "TaskManage", collapsed: collapsed, icon: _jsx(CheckSquareOutlined, {}) }), _jsx("div", { style: { fontSize: 12, color: '#6b7280', padding: '10px 8px 6px' }, children: collapsed ? 'L' : 'LMS' }), _jsx(Item, { to: "/lms", label: "Courses", collapsed: collapsed, icon: _jsx(BookOutlined, {}) }), _jsx(Item, { to: "/lms/catalog", label: "Catalog", collapsed: collapsed, icon: _jsx(AppstoreOutlined, {}) }), _jsx(Item, { to: "/lms/dashboard", label: "Dashboard", collapsed: collapsed, icon: _jsx(BarChartOutlined, {}) }), _jsx(Item, { to: "/lms/notes", label: "Notes", collapsed: collapsed, icon: _jsx(FileTextOutlined, {}) })] })] })] }));
}
