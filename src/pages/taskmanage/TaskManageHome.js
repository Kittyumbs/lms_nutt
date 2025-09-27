import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
export default function TaskManageHome() {
    useEffect(() => {
        document.title = 'TaskManage';
    }, []);
    return (_jsxs("div", { style: { padding: '20px' }, children: [_jsx("h1", { children: "TaskManage Home (Stub)" }), _jsx("p", { children: "This is a stub page for Task Management." })] }));
}
