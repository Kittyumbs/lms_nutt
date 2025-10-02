import { CheckSquareOutlined, BookOutlined, AppstoreOutlined, BarChartOutlined, FileTextOutlined, UserOutlined, SwapOutlined, GoogleOutlined, CalendarOutlined } from '@ant-design/icons';
import { Avatar, Button, Tag, Tooltip } from 'antd';
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';

import useAuth from '../../auth/useAuth';

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
  const [authError, setAuthError] = useState<string>('');
  // const { pathname } = useLocation();
  const { user, loading: isAuthLoading, isGoogleCalendarAuthed, signInWithGoogle, signInWithGoogleCalendar, signOut } = useAuth();

  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY);
    setCollapsed(raw === 'true');
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_KEY, String(collapsed));
  }, [collapsed]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  const handleSignIn = async () => {
    setAuthError('');
    try {
      await signInWithGoogle();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setAuthError(errorMessage);
    }
  };

  // const clearError = () => setAuthError('');

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

        {/* User Profile Section */}
        <div className="sidebar-user-profile" style={{
          position: 'absolute',
          bottom: 16,
          left: 0,
          right: 0,
          padding: '8px',
          borderTop: '1px solid #e5e7eb',
        }}>
          {isAuthLoading ? (
            <div className="flex justify-center items-center py-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1C6EA4]"></div>
            </div>
          ) : !user ? (
            <div className="w-full">
              {authError && (
                <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  ⚠️ {authError}
                </div>
              )}
              <Button
                type="primary"
                icon={<GoogleOutlined />}
                onClick={handleSignIn}
                loading={isAuthLoading}
                disabled={isAuthLoading}
                style={{
                  width: collapsed ? '32px' : '100%',
                  borderRadius: '8px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  padding: collapsed ? '4px' : undefined,
                }}
                title={collapsed ? 'Sign in with Google' : undefined}
              >
                {!collapsed && 'Sign in'}
              </Button>
            </div>
          ) : (
            <div className={`flex items-center p-2 bg-gray-50 rounded-lg ${collapsed ? 'justify-center' : ''}`}>
              <span title={collapsed ? 'Sign out' : user?.displayName || 'Google Account'}>
                <Avatar
                  size={32}
                  src={user?.photoURL}
                  icon={<UserOutlined />}
                  className="bg-[#1C6EA4] cursor-pointer"
                  onClick={signOut}
                />
              </span>
              {!collapsed && (
                <>
                  <div className="ml-2 flex-1 overflow-hidden">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {user?.displayName || 'Google Account'}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {user?.email || ''}
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      <Tooltip title={isGoogleCalendarAuthed ? 'Google Calendar đã kết nối' : 'Chưa kết nối Google Calendar'}>
                        <Tag 
                          icon={<CalendarOutlined />} 
                          color={isGoogleCalendarAuthed ? 'success' : 'default'}
                          style={{ fontSize: '10px', margin: 0 }}
                        >
                          Calendar
                        </Tag>
                      </Tooltip>
                      {!isGoogleCalendarAuthed && (
                        <Button
                          type="link"
                          size="small"
                          onClick={async () => {
                            try {
                              await signInWithGoogleCalendar();
                            } catch (err) {
                              const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
                              setAuthError(errorMessage);
                            }
                          }}
                          style={{ 
                            padding: '0 4px', 
                            height: 'auto', 
                            fontSize: '10px',
                            color: '#1890ff'
                          }}
                        >
                          Kết nối
                        </Button>
                      )}
                    </div>
                  </div>
                  <Button
                    type="text"
                    icon={<SwapOutlined />}
                    onClick={signOut}
                    size="small"
                    className="text-gray-500 hover:text-red-500"
                    title="Sign out"
                  />
                </>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
