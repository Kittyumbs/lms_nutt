import { Outlet } from 'react-router-dom';

import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="app-shell" style={{ display: 'flex', minHeight: '100vh', background: '#fff' }}>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Topbar tùy chọn */}
        {/* <Topbar /> */}
        <Outlet />
      </div>
    </div>
  );
}
