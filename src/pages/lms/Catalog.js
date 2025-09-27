import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
export default function Catalog() {
    useEffect(() => {
        document.title = 'Catalog';
    }, []);
    return (_jsxs("div", { style: { padding: '20px' }, children: [_jsx("h1", { children: "Catalog" }), _jsx("p", { children: "Browse the course catalog." })] }));
}
