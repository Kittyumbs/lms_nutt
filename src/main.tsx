import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App'; // Import App component
import AppLayout from './components/Layout/AppLayout';
import LmsHome from './pages/lms/LmsHome';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/taskmanage" replace />} />
      <Route path="/" element={<AppLayout />}>
        <Route path="/taskmanage" element={<App />} /> {/* Render App component cho /taskmanage */}
        <Route path="/lms" element={<LmsHome />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
