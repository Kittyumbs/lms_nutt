import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import useAuth from './useAuth';

export default function useRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<'learner' | 'instructor' | 'admin'>('learner');
  const [loadingRole, setLoadingRole] = useState(false);

  useEffect(() => {
    if (!user) {
      setRole('learner');
      setLoadingRole(false);
      return;
    }

    // First check instructor emails from environment variables
    const instructorEmails = import.meta.env.VITE_INSTRUCTOR_EMAILS?.split(',') || [];
    if (instructorEmails.includes(user.email || '')) {
      setRole('instructor');
      setLoadingRole(false);
      return;
    }

    // Then check Firestore for more specific roles
    setLoadingRole(true);
    const userRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        setRole(userData?.role || 'learner');
      } else {
        setRole('learner'); // Default role
      }
      setLoadingRole(false);
    }, (error) => {
      console.error('Error fetching user role:', error);
      setRole('learner'); // Fallback
      setLoadingRole(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { role, loadingRole };
}
