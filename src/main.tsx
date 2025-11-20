import { ConfigProvider } from 'antd';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './auth/AuthProvider';
import { initializeFirebase } from './lib/firebase';
import AppLayout from './components/Layout/AppLayout';
import CourseDetailPage from './pages/lms/CourseDetailPage';
import CourseEditorPage from './pages/lms/CourseEditorPage';
import CoursesPage from './pages/lms/CoursesPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import DashboardViewerPage from './pages/dashboard/DashboardViewerPage';
import LessonPlayerPage from './pages/lms/LessonPlayerPage';
import NotesCenterPage from './pages/lms/NotesCenterPage';
import TaskManageHome from './pages/taskmanage/TaskManageHome';
import './index.css';

const renderApp = () => {
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
              <Route path="/lms/course/:cid/edit" element={<CourseEditorPage />} />
              <Route path="/lms/course/learn/:cid/:lid" element={<LessonPlayerPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/dashboard/view/:id" element={<DashboardViewerPage />} />
              <Route path="/lms/notes" element={<NotesCenterPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
};

// Initialize Firebase and then render the app
initializeFirebase().then(() => {
  renderApp();
});
