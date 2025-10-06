import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import useAuth from '../auth/useAuth';

export interface DashboardConfig {
  id: string;
  name: string;
  type: 'powerbi' | 'looker';
  embedUrl: string;
  accessToken?: string;
  reportId?: string;
  pageId?: string;
  width: string;
  height: string;
  filters?: string;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
  uid: string;
}

export const useDashboards = () => {
  const [dashboards, setDashboards] = useState<DashboardConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Load dashboards from Firestore
  useEffect(() => {
    if (!user) {
      setDashboards([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'dashboards'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const dashboardsData: DashboardConfig[] = [];
        snapshot.forEach((doc) => {
          dashboardsData.push({
            id: doc.id,
            ...doc.data()
          } as DashboardConfig);
        });
        setDashboards(dashboardsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error loading dashboards:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addDashboard = async (dashboardData: Omit<DashboardConfig, 'id' | 'createdAt' | 'updatedAt' | 'uid'>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const docRef = await addDoc(collection(db, 'dashboards'), {
        ...dashboardData,
        uid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      console.log('✅ Dashboard added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding dashboard:', error);
      throw error;
    }
  };

  const updateDashboard = async (id: string, dashboardData: Partial<DashboardConfig>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const dashboardRef = doc(db, 'dashboards', id);
      await updateDoc(dashboardRef, {
        ...dashboardData,
        updatedAt: serverTimestamp(),
      });
      
      console.log('✅ Dashboard updated:', id);
    } catch (error) {
      console.error('❌ Error updating dashboard:', error);
      throw error;
    }
  };

  const deleteDashboard = async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      await deleteDoc(doc(db, 'dashboards', id));
      console.log('✅ Dashboard deleted:', id);
    } catch (error) {
      console.error('❌ Error deleting dashboard:', error);
      throw error;
    }
  };

  const getDashboardsByType = (type: 'powerbi' | 'looker') => {
    return dashboards.filter(d => d.type === type);
  };

  return {
    dashboards,
    loading,
    error,
    addDashboard,
    updateDashboard,
    deleteDashboard,
    getDashboardsByType,
  };
};
