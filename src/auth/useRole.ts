import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import useAuth from './useAuth';

import { setDoc } from 'firebase/firestore';

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

    // Check admin emails first (highest priority)
    const adminEmails = import.meta.env.VITE_ADMIN_EMAILS?.split(',') || [];
    const isAdminEmail = adminEmails.includes(user.email || '');

    // Check instructor emails
    const instructorEmails = import.meta.env.VITE_INSTRUCTOR_EMAILS?.split(',') || [];
    const isInstructorEmail = instructorEmails.includes(user.email || '');

    // Set role based on email priority: admin > instructor > learner
    const assignedRole = isAdminEmail ? 'admin' : (isInstructorEmail ? 'instructor' : 'learner');

    if (isAdminEmail || isInstructorEmail) {
      // Auto-create user document if admin/instructor email
      const createUserDoc = async () => {
        try {
          const userRef = doc(db, 'users', user.uid);
          await setDoc(userRef, {
            email: user.email,
            role: assignedRole,
            displayName: user.displayName,
            createdAt: new Date()
          }, { merge: true }); // merge: true to not overwrite existing fields
        } catch (error) {
          console.error('Error creating user doc:', error);
        }
      };
      createUserDoc();
    }

    // Check Firestore for user role
    setLoadingRole(true);
    const userRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        // Priority: admin email > instructor email > firestore role > learner
        const firestoreRole = userData?.role;
        const finalRole = assignedRole !== 'learner' ? assignedRole : (firestoreRole || 'learner');
        setRole(finalRole);
      } else {
        // Auto-create document for new users with email-based role
        const finalRole = assignedRole;
        setRole(finalRole);
        if (isAdminEmail || isInstructorEmail) {
          setDoc(userRef, {
            email: user.email,
            role: finalRole,
            displayName: user.displayName,
            createdAt: new Date()
          }).catch(error => console.error('Error creating user doc:', error));
        }
      }
      setLoadingRole(false);
    }, (error) => {
      console.error('Error fetching user role:', error);
      setRole(assignedRole); // Fallback with env check
      setLoadingRole(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { role, loadingRole };
}
