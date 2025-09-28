import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/Layout/AppLayout';
import TaskManageHome from './pages/taskmanage/TaskManageHome';
import LmsHome from './pages/LmsHome';
import Catalog from './pages/lms/Catalog';
import Dashboard from './pages/lms/Dashboard';
import Notes from './pages/lms/Notes';
import CoursesPage from './pages/lms/CoursesPage'; // Import CoursesPage
import { ConfigProvider } from 'antd'; // Import ConfigProvider
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ConfigProvider
    theme={{
      token: {
        colorPrimary: '#057EC8', // Primary brand color
        borderRadius: 12, // Global border radius
      },
      components: {
        Segmented: {
          itemSelectedBg: '#D8EFF0', // Accent color for selected segmented item
        },
      },
    }}
  >
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/taskmanage" replace />} />
        <Route element={<AppLayout />}>
          <Route path="/taskmanage" element={<TaskManageHome />} />
          <Route path="/lms/courses" element={<CoursesPage />} /> {/* Add CoursesPage route */}
          <Route path="/lms/catalog" element={<Catalog />} />
          <Route path="/lms/dashboard" element={<Dashboard />} />
          <Route path="/lms/notes" element={<Notes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </ConfigProvider>
);
