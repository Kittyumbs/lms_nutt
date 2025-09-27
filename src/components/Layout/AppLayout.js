import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
export default function AppLayout() {
    return (_jsxs("div", { className: "app-shell", style: { display: 'flex', minHeight: '100vh', background: '#fff' }, children: [_jsx(Sidebar, {}), _jsx("div", { style: { flex: 1, minWidth: 0 }, children: _jsx(Outlet, {}) })] }));
}
