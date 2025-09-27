import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import FloatingEdgeSwitcher from '../FloatingEdgeSwitcher';
export default function AppLayout() {
    const [transitioningClass, setTransitioningClass] = useState('');
    const outletRef = useRef(null);
    const startTransition = useCallback((cls, callback) => {
        if (outletRef.current) {
            outletRef.current.classList.add(cls);
        }
        setTimeout(() => {
            callback();
            setTimeout(() => {
                if (outletRef.current) {
                    outletRef.current.classList.remove(cls);
                }
            }, 50); // Xóa class sau khi chuyển trang và render
        }, 220); // Thời gian animation
    }, []);
    return (_jsxs("div", { id: "page-wrapper", children: [_jsx("div", { ref: outletRef, className: `fes-page-visible ${transitioningClass}`, children: _jsx(Outlet, {}) }), _jsx(FloatingEdgeSwitcher, { startTransition: startTransition })] }));
}
