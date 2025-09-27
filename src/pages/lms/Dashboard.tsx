import { useEffect } from 'react';

export default function Dashboard() {
  useEffect(() => {
    document.title = 'Dashboard';
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Dashboard</h1>
      <p>Your LMS dashboard.</p>
    </div>
  );
}
