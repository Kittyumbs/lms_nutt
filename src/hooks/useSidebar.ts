import { useState, useEffect } from 'react';

const LS_KEY = 'sidebar-collapsed';

export const useSidebar = () => {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(LS_KEY) === 'true';
  });

  useEffect(() => {
    const handleStorageChange = () => {
      setCollapsed(localStorage.getItem(LS_KEY) === 'true');
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    collapsed,
    isOpen: !collapsed
  };
};
