import React, { useState, useEffect } from 'react';
import useAuth from '../auth/useAuth';
import useRole from '../auth/useRole';

const DebugAuth: React.FC = () => {
  const { user, loading, isGoogleCalendarAuthed } = useAuth();
  const { role, loadingRole } = useRole();
  const [logs, setLogs] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Capture console logs
  useEffect(() => {
    if (!autoRefresh) return;

    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      if (message.includes('AUTH') || message.includes('DEBUG') || message.includes('ERROR')) {
        setLogs(prev => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${message}`]);
      }
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      setLogs(prev => [...prev.slice(-50), `🚨 [${new Date().toLocaleTimeString()}] ERROR: ${message}`]);
      originalError.apply(console, args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, [autoRefresh]);

  const clearLogs = () => setLogs([]);
  const downloadLogs = () => {
    const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auth-debug-${new Date().toISOString()}.txt`;
    a.click();
  };

  if (!import.meta.env.DEV) {
    return null; // Ẩn trong production nếu không muốn hiển thị
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.9)',
      color: 'white',
      padding: '10px',
      fontSize: '12px',
      fontFamily: 'monospace',
      maxWidth: '500px',
      maxHeight: '300px',
      overflow: 'auto',
      zIndex: 9999,
      border: '2px solid red'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <strong>🔍 AUTH DEBUG</strong>
        <div>
          <button onClick={() => setAutoRefresh(!autoRefresh)} style={{ marginRight: '5px', fontSize: '10px' }}>
            {autoRefresh ? '⏸️' : '▶️'}
          </button>
          <button onClick={clearLogs} style={{ marginRight: '5px', fontSize: '10px' }}>🧹</button>
          <button onClick={downloadLogs} style={{ fontSize: '10px' }}>📥</button>
        </div>
      </div>

      <div style={{ marginBottom: '5px' }}>
        <div>👤 User: {user ? `${user.email}` : 'null'}</div>
        <div>🔄 Auth Loading: {loading ? 'true' : 'false'}</div>
        <div>🎯 Role: {role}</div>
        <div>📅 Calendar: {isGoogleCalendarAuthed ? '✅' : '❌'}</div>
        <div>🕒 Last Update: {new Date().toLocaleTimeString()}</div>
      </div>

      <div style={{ borderTop: '1px solid #555', margin: '5px 0', paddingTop: '5px' }}>
        <strong>Logs ({logs.length}):</strong>
        <div style={{ maxHeight: '150px', overflow: 'auto', fontSize: '10px' }}>
          {logs.slice(-10).map((log, index) => (
            <div key={index} style={{
              color: log.includes('ERROR') ? 'red' : log.includes('AUTH') ? 'yellow' : 'white',
              borderBottom: '1px solid #333',
              padding: '2px 0'
            }}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DebugAuth;
