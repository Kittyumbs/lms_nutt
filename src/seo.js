export function buildTitle(title) {
    const base = "TaskManage";
    return title ? `${title} · ${base}` : `${base} · Lịch & Kanban`;
}
export function setMeta({ title, desc, url }) {
    if (typeof document === "undefined")
        return;
    const d = document;
    const set = (sel, attr, val) => {
        let el = d.querySelector(sel);
        if (!el) {
            el = sel.startsWith('link')
                ? d.createElement('link')
                : d.createElement('meta');
            if (sel.startsWith('link'))
                el.setAttribute('rel', 'canonical');
            d.head.appendChild(el);
        }
        el.setAttribute(attr, val);
    };
    if (title) {
        d.title = buildTitle(title);
        set('meta[name="twitter:title"]', 'content', d.title);
        set('meta[property="og:title"]', 'content', d.title);
    }
    if (desc) {
        set('meta[name="description"]', 'content', desc);
        set('meta[name="twitter:description"]', 'content', desc);
        set('meta[property="og:description"]', 'content', desc);
    }
    if (url) {
        set('link[rel="canonical"]', 'href', url);
        set('meta[property="og:url"]', 'content', url);
    }
}
import { useEffect } from "react";
export function HomeSEO() {
    useEffect(() => {
        setMeta({
            title: "Trang chính",
            desc: "Quản lý công việc, Kanban và đồng bộ Google Calendar.",
            url: "https://lms-nuttency.vercel.app/"
        });
    }, []);
    return null;
}
