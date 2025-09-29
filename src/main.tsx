import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/Layout/AppLayout';
import TaskManageHome from './pages/taskmanage/TaskManageHome';
import Catalog from './pages/lms/Catalog';
import Dashboard from './pages/lms/Dashboard';
import Notes from './pages/lms/Notes';
import CoursesPage from './pages/lms/CoursesPage';
import CourseDetailPage from './pages/lms/CourseDetailPage';
import LessonPlayerPage from './pages/lms/LessonPlayerPage';
import { ConfigProvider } from 'antd';
import { AuthProvider } from './auth/AuthProvider';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ConfigProvider
    theme={{
      token: {
        colorPrimary: '#1C6EA4', // Primary brand color (new mid-blue)
        borderRadius: 12, // Global border radius
      },
      components: {
        Segmented: {
          itemSelectedBg: '#77BEF0', // Accent color for selected segmented item (new light yellow)
        },
      },
    }}
  >
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/taskmanage" replace />} />
          <Route element={<AppLayout />}>
            <Route path="/taskmanage" element={<TaskManageHome />} />
            <Route path="/lms/courses" element={<CoursesPage />} />
            <Route path="/lms/course/:cid" element={<CourseDetailPage />} />
            <Route path="/lms/learn/:cid/:lid" element={<LessonPlayerPage />} />
            <Route path="/lms/catalog" element={<Catalog />} />
            <Route path="/lms/dashboard" element={<Dashboard />} />
            <Route path="/lms/notes" element={<Notes />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ConfigProvider>
);
