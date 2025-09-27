import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
export default function LmsHome() {
    useEffect(() => {
        document.title = 'LMS';
    }, []);
    return (_jsxs("div", { style: { padding: '20px' }, children: [_jsx("h1", { children: "LMS Home" }), _jsx("p", { children: "Welcome to the Learning Management System page." })] }));
}
