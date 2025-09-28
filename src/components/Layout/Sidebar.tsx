import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { CheckSquareOutlined, BookOutlined, AppstoreOutlined, BarChartOutlined, FileTextOutlined, MenuOutlined } from '@ant-design/icons';

const LS_KEY = 'sidebar-collapsed'; // 'true' = collapsed

function Item({ to, label, collapsed, icon }: { to: string; label: string; collapsed: boolean; icon: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        collapsed
          ? `flex justify-center items-center h-12 mx-1 rounded-lg text-xl transition-colors duration-200 ${
              isActive ? 'bg-[#1C6EA4] text-white shadow-sm' : 'text-[#333] hover:bg-[#f0f8ff] hover:text-[#1C6EA4]' /* New active and hover colors */
            }`
          : `flex items-center px-3 py-2 mx-2 rounded-lg text-sm transition-colors duration-200 ${
              isActive ? 'bg-[#1C6EA4] text-white font-semibold shadow-sm' : 'text-[#333] hover:bg-[#f0f8ff] hover:text-[#1C6EA4]' /* New active and hover colors */
            }`
      }
      title={label}
      end
    >
      {collapsed ? icon : <span className="font-medium">{label}</span>}
    </NavLink>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY);
    setCollapsed(raw === 'true');
  }, []);
  useEffect(() => {
    localStorage.setItem(LS_KEY, String(collapsed));
  }, [collapsed]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <>
      {/* overlay mobile */}
      {isMobile && !collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 39 }}
        />
      )}

      <aside
        style={{
          width: collapsed ? 56 : 240,
          transition: 'width .18s ease',
          borderRight: '1px solid #eee',
          background: '#fff',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 40,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            padding: '16px 12px',
            borderBottom: '1px solid #e5e7eb',
            background: 'linear-gradient(135deg, #1C6EA4 0%, #33A1E0 100%)', /* New gradient colors */
            color: 'white',
          }}
        >
          {!collapsed && <div style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '0.5px' }}>Nuttency</div>}
          <button
            onClick={() => setCollapsed((v) => !v)}
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
            style={{
              color: 'white',
              cursor: 'pointer',
              fontSize: '18px',
              background: 'transparent',
              transition: 'all 0.2s ease',
            }}
          >
            ☰
          </button>
        </div>

        <nav style={{ padding: 8 }}>
          <div style={{ fontSize: 12, color: '#6b7280', padding: '6px 8px' }}>{collapsed ? 'M' : 'MAIN'}</div>
          <Item to="/taskmanage" label="TaskManage" collapsed={collapsed} icon={<CheckSquareOutlined />} />

          <div style={{ fontSize: 12, color: '#6b7280', padding: '10px 8px 6px' }}>{collapsed ? 'L' : 'LMS'}</div>
          <Item to="/lms/courses" label="Courses" collapsed={collapsed} icon={<BookOutlined />} />
          <Item to="/lms/catalog" label="Catalog" collapsed={collapsed} icon={<AppstoreOutlined />} />
          <Item to="/lms/dashboard" label="Dashboard" collapsed={collapsed} icon={<BarChartOutlined />} />
          <Item to="/lms/notes" label="Notes" collapsed={collapsed} icon={<FileTextOutlined />} />
        </nav>
      </aside>
    </>
  );
}
