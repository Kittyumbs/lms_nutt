import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/edge-switcher.css';
export default function FloatingEdgeSwitcher({ startTransition }) {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const activeEdge = pathname.startsWith('/lms') ? 'left' : 'right';
    const [nearEdge, setNearEdge] = useState(null);
    const [sbw, setSbw] = useState(0);
    const hideTo = useRef(null);
    const label = pathname.startsWith('/lms') ? 'TASK' : 'LMS';
    const target = pathname.startsWith('/lms') ? '/taskmanage' : '/lms';
    const outCls = pathname.startsWith('/lms') ? 'fes-out-right' : 'fes-out-left';
    const getScrollbarWidth = () => window.innerWidth - document.documentElement.clientWidth;
    useEffect(() => {
        setSbw(getScrollbarWidth());
        const onRez = () => setSbw(getScrollbarWidth());
        const onMove = (e) => {
            const EDGE_PX = 1;
            const docW = document.documentElement.clientWidth; // content width, no scrollbar
            const nearLeft = e.clientX <= EDGE_PX;
            const nearRight = (docW - e.clientX) <= EDGE_PX;
            const cand = activeEdge === 'left' && nearLeft ? 'left' :
                activeEdge === 'right' && nearRight ? 'right' : null;
            setNearEdge(cand);
            if (!cand) {
                if (hideTo.current)
                    window.clearTimeout(hideTo.current);
                hideTo.current = window.setTimeout(() => setNearEdge(null), 500);
            }
        };
        window.addEventListener('mousemove', onMove, { passive: true });
        window.addEventListener('resize', onRez);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('resize', onRez);
        };
    }, [activeEdge]);
    const go = () => {
        startTransition(outCls, () => navigate(target));
        setNearEdge(null);
    };
    const show = nearEdge !== null;
    return (_jsxs(_Fragment, { children: [show && (_jsx("div", { onClick: go, title: `Chuyển sang ${label}`, style: { position: 'fixed', inset: 0, background: 'transparent', cursor: 'pointer', zIndex: 40 } })), _jsx("div", { "aria-hidden": true, className: "fixed top-1/2 -translate-y-1/2", style: {
                    zIndex: 41,
                    right: activeEdge === 'right' ? (sbw + 4) : undefined,
                    left: activeEdge === 'left' ? 4 : undefined,
                    position: 'fixed',
                }, children: _jsx("div", { className: `fes-circle ${show ? 'show' : ''} fes-pulse`, style: { position: 'relative' }, children: label }) })] }));
}
