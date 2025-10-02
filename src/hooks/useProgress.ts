import { message } from 'antd';
import { collection, query, where, onSnapshot, setDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import React, { useState, useEffect, useCallback } from 'react';

import useAuth from '../auth/useAuth';
import { db } from '../lib/firebase';



export interface Progress {
  id: string;
  uid: string;
  courseId: string;
  lessonId: string;
  doneAt: number;
}

export function useProgress(courseId: string): {
  doneIds: string[];
  loading: boolean;
  markDone: (lessonId: string) => Promise<void>;
  unmarkDone: (lessonId: string) => Promise<void>;
} {
  const { user } = useAuth();
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !courseId) {
      setDoneIds([]);
      setLoading(false);
      return;
    }

    const progressQuery = query(
      collection(db, 'progress'),
      where('uid', '==', user.uid),
      where('courseId', '==', courseId)
    );

    const unsubscribe = onSnapshot(progressQuery, (querySnapshot) => {
      const doneLessonIds: string[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Progress;
        doneLessonIds.push(data.lessonId);
      });
      setDoneIds(doneLessonIds);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to progress:', error);
      setDoneIds([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, courseId]);

  const markDone = useCallback(async (lessonId: string) => {
    if (!user || !courseId) return;

    const progressId = `${user.uid}_${courseId}_${lessonId}`;

    try {
      const progressRef = doc(db, 'progress', progressId);
      const progressData: Omit<Progress, 'id'> = {
        uid: user.uid,
        courseId,
        lessonId,
        doneAt: Date.now(),
      };

      await setDoc(progressRef, {
        ...progressData,
        doneAt: serverTimestamp(),
      });

      message.success('Lesson marked as completed!');
    } catch (error) {
      console.error('Error marking lesson done:', error);
      message.error('Failed to mark lesson as done. Please try again.');
      throw error;
    }
  }, [user, courseId]);

  const unmarkDone = useCallback(async (lessonId: string) => {
    if (!user || !courseId) return;

    const progressId = `${user.uid}_${courseId}_${lessonId}`;

    try {
      const progressRef = doc(db, 'progress', progressId);
      await deleteDoc(progressRef);
      message.success('Lesson unmarked as completed.');
    } catch (error) {
      console.error('Error unmarking lesson done:', error);
      message.error('Failed to unmark lesson. Please try again.');
      throw error;
    }
  }, [user, courseId]);

  return {
    doneIds,
    loading,
    markDone,
    unmarkDone
  };
}
