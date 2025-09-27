import { useState, useCallback, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import FloatingEdgeSwitcher from '../FloatingEdgeSwitcher';

export default function AppLayout() {
  const [transitioningClass, setTransitioningClass] = useState('');
  const outletRef = useRef<HTMLDivElement>(null);

  const startTransition = useCallback((cls: string, callback: () => void) => {
    if (outletRef.current) {
      outletRef.current.classList.add(cls);
    }
    setTimeout(() => {
      callback();
      setTimeout(() => {
        if (outletRef.current) {
          outletRef.current.classList.remove(cls);
        }
      }, 50); // Xóa class sau khi chuyển trang và render
    }, 220); // Thời gian animation
  }, []);

  return (
    <div id="page-wrapper">
      <div ref={outletRef} className={`fes-page-visible ${transitioningClass}`}>
        <Outlet />
      </div>
      <FloatingEdgeSwitcher startTransition={startTransition} />
    </div>
  );
}
