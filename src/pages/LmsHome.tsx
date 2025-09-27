import { useEffect } from 'react';

export default function LmsHome() {
  useEffect(() => {
    document.title = 'LMS';
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>LMS Home</h1>
      <p>Welcome to the Learning Management System page.</p>
    </div>
  );
}
