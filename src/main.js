import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App'; // Import App component
import AppLayout from './components/Layout/AppLayout';
import LmsHome from './pages/LmsHome';
import './index.css';
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/taskmanage", replace: true }) }), _jsxs(Route, { path: "/", element: _jsx(AppLayout, {}), children: [_jsx(Route, { path: "/taskmanage", element: _jsx(App, {}) }), " ", _jsx(Route, { path: "/lms", element: _jsx(LmsHome, {}) })] })] }) }));
