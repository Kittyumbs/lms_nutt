import { useEffect } from 'react';

export default function TaskManageHome() {
  useEffect(() => {
    document.title = 'TaskManage';
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>TaskManage Home (Stub)</h1>
      <p>This is a stub page for Task Management.</p>
    </div>
  );
}
