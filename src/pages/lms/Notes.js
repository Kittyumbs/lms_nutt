import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
export default function Notes() {
    useEffect(() => {
        document.title = 'Notes';
    }, []);
    return (_jsxs("div", { style: { padding: '20px' }, children: [_jsx("h1", { children: "Notes" }), _jsx("p", { children: "Your notes section." })] }));
}
