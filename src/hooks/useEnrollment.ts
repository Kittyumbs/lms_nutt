import { message } from 'antd';
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp, deleteDoc } from 'firebase/firestore';
import React, { useState, useEffect, useCallback } from 'react';

import useAuth from '../auth/useAuth';
import { db } from '../lib/firebase';



export interface Enrollment {
  id: string;
  uid: string;
  courseId: string;
  status: 'active';
  createdAt: number;
}

export function useEnrollment(courseId: string): {
  enrolled: boolean;
  loading: boolean;
  enroll: () => Promise<void>;
  unenroll: () => Promise<void>;
} {
  const { user, signInWithGoogle } = useAuth();
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);

  const enrollmentId = user ? `${user.uid}_${courseId}` : null;

  useEffect(() => {
    if (!courseId || !enrollmentId) {
      setEnrolled(false);
      setLoading(false);
      return;
    }

    const enrollmentRef = doc(db, 'enrollments', enrollmentId);
    const unsubscribe = onSnapshot(enrollmentRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as Enrollment;
        setEnrolled(data.status === 'active');
      } else {
        setEnrolled(false);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error listening to enrollment:', error);
      setEnrolled(false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [courseId, enrollmentId]);

  const enroll = useCallback(async () => {
    if (!user) {
      await signInWithGoogle();
      return;
    }

    if (!enrollmentId) return;

    try {
      const enrollmentRef = doc(db, 'enrollments', enrollmentId);
      const enrollmentData: Omit<Enrollment, 'id'> = {
        uid: user.uid,
        courseId,
        status: 'active',
        createdAt: Date.now(),
      };

      await setDoc(enrollmentRef, {
        ...enrollmentData,
        createdAt: serverTimestamp(),
      });

      message.success('Successfully enrolled in course!');
    } catch (error) {
      console.error('Error enrolling:', error);
      message.error('Failed to enroll. Please try again.');
      throw error;
    }
  }, [user, courseId, enrollmentId, signInWithGoogle]);

  const unenroll = useCallback(async () => {
    if (!user || !enrollmentId) return;

    try {
      const enrollmentRef = doc(db, 'enrollments', enrollmentId);
      await deleteDoc(enrollmentRef);
      message.success('Successfully unenrolled from course.');
    } catch (error) {
      console.error('Error unenrolling:', error);
      message.error('Failed to unenroll. Please try again.');
      throw error;
    }
  }, [user, enrollmentId]);

  return {
    enrolled,
    loading,
    enroll,
    unenroll
  };
}
