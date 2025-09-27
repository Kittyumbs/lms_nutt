import { useEffect } from 'react';

export default function Catalog() {
  useEffect(() => {
    document.title = 'Catalog';
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Catalog</h1>
      <p>Browse the course catalog.</p>
    </div>
  );
}
