import { useEffect } from 'react';

export default function Notes() {
  useEffect(() => {
    document.title = 'Notes';
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Notes</h1>
      <p>Your notes section.</p>
    </div>
  );
}
