export function buildTitle(title?: string) {
  const base = "TaskManage";
  return title ? `${title} · ${base}` : `${base} · Calendar & Kanban`;
}
export function setMeta({ title, desc, url }:{
  title?: string; desc?: string; url?: string;
}) {
  if (typeof document === "undefined") return;
  const d = document;
  const set = (sel: string, attr: string, val: string) => {
    let el = d.querySelector(sel);
    if (!el) {
      el = sel.startsWith('link')
        ? d.createElement('link')
        : d.createElement('meta');
      if (sel.startsWith('link')) el.setAttribute('rel','canonical');
      d.head.appendChild(el);
    }
    el.setAttribute(attr, val);
  };
  if (title) { d.title = buildTitle(title); set('meta[name="twitter:title"]','content', d.title); set('meta[property="og:title"]','content', d.title); }
  if (desc) { set('meta[name="description"]','content', desc); set('meta[name="twitter:description"]','content', desc); set('meta[property="og:description"]','content', desc); }
  if (url)  { set('link[rel="canonical"]','href', url); set('meta[property="og:url"]','content', url); }
}

import { useEffect } from "react";

interface PageSEOProps {
  title?: string;
  description?: string;
  url?: string;
}

export function PageSEO({ title, description, url }: PageSEOProps) {
  useEffect(() => {
    setMeta({
      title: title,
      desc: description || "Task management, Kanban board and Google Calendar sync.",
      url: url || "https://lms-nuttency.vercel.app/"
    });
  }, [title, description, url]);
  return null;
}
