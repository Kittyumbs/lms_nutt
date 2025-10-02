import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useState, useEffect, useCallback } from 'react';

import { db } from '../lib/firebase';

import useAuth from './useAuth';

export default function useRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<'learner' | 'instructor' | 'admin'>('learner');
  const [loadingRole, setLoadingRole] = useState(false);

  // Get role from email configuration
  const getRoleFromEmail = useCallback((email: string): 'learner' | 'instructor' | 'admin' => {
    const adminEmailsStr = import.meta.env.VITE_ADMIN_EMAILS as string | undefined;
    const instructorEmailsStr = import.meta.env.VITE_INSTRUCTOR_EMAILS as string | undefined;
    
    const adminEmails = adminEmailsStr?.split(',').map(e => e.trim()) || [];
    const instructorEmails = instructorEmailsStr?.split(',').map(e => e.trim()) || [];
    
    if (adminEmails.includes(email)) return 'admin';
    if (instructorEmails.includes(email)) return 'instructor';
    return 'learner';
  }, []);

  // Create user document in Firestore
  const createUserDocument = useCallback(async (userEmail: string, userRole: string, displayName: string) => {
    try {
      const userRef = doc(db, 'users', user!.uid);
      await setDoc(userRef, {
        email: userEmail,
        role: userRole,
        displayName: displayName,
        createdAt: new Date()
      }, { merge: true });
    } catch (error) {
      console.error('Error creating user document:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setRole('learner');
      setLoadingRole(false);
      return;
    }

    const userEmail = user.email || '';
    const emailBasedRole = getRoleFromEmail(userEmail);
    
    setLoadingRole(true);
    const userRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      try {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          const firestoreRole = userData?.role as 'learner' | 'instructor' | 'admin' | undefined;
          
          // Priority: email-based role > firestore role > learner
          const finalRole = emailBasedRole !== 'learner' ? emailBasedRole : (firestoreRole || 'learner');
          setRole(finalRole);
          
          // Update document if email-based role is higher priority
          if (emailBasedRole !== 'learner' && emailBasedRole !== firestoreRole) {
            void createUserDocument(userEmail, emailBasedRole, user.displayName || '');
          }
        } else {
          // Document doesn't exist, create it
          setRole(emailBasedRole);
          void createUserDocument(userEmail, emailBasedRole, user.displayName || '');
        }
      } catch (error) {
        console.error('Error in role snapshot:', error);
        setRole(emailBasedRole); // Fallback to email-based role
      } finally {
        setLoadingRole(false);
      }
    }, (error) => {
      console.error('Error fetching user role:', error);
      setRole(getRoleFromEmail(userEmail));
      setLoadingRole(false);
    });

    return () => unsubscribe();
  }, [user, getRoleFromEmail, createUserDocument]);

  return { role, loadingRole };
}
