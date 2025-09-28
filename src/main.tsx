import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/Layout/AppLayout';
import TaskManageHome from './pages/taskmanage/TaskManageHome';
import LmsHome from './pages/LmsHome';
import Catalog from './pages/lms/Catalog';
import Dashboard from './pages/lms/Dashboard';
import Notes from './pages/lms/Notes';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/taskmanage" replace />} />
      <Route element={<AppLayout />}>
        <Route path="/taskmanage" element={<TaskManageHome />} />
        <Route path="/lms/courses" element={<LmsHome />} />
        <Route path="/lms/catalog" element={<Catalog />} />
        <Route path="/lms/dashboard" element={<Dashboard />} />
        <Route path="/lms/notes" element={<Notes />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
