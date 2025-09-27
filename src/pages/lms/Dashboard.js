import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
export default function Dashboard() {
    useEffect(() => {
        document.title = 'Dashboard';
    }, []);
    return (_jsxs("div", { style: { padding: '20px' }, children: [_jsx("h1", { children: "Dashboard" }), _jsx("p", { children: "Your LMS dashboard." })] }));
}
