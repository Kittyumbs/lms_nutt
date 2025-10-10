import { collection, onSnapshot, addDoc, query, orderBy, where } from "firebase/firestore";
import { useState, useEffect, useCallback } from "react";

import useAuth from "../auth/useAuth";
import { db } from "../lib/firebase";

export interface Personnel {
  id: string;
  uid: string; // User ID who created this personnel
  name: string;
  createdAt: Date;
}

export const usePersonnel = () => {
  const { user } = useAuth();
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setPersonnel([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "personnel"), 
      where("uid", "==", user.uid),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedPersonnel: Personnel[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          
          // Add null checks for required fields
          if (!data.name || !data.createdAt || !data.uid) {
            console.warn(`Personnel ${doc.id} missing required fields:`, data);
            return null;
          }
          
          return {
            id: doc.id,
            uid: data.uid as string,
            name: data.name as string,
            createdAt: data.createdAt?.toDate?.() || new Date(),
          } as Personnel;
        }).filter((person): person is Personnel => person !== null);
        setPersonnel(fetchedPersonnel);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching personnel:", err);
        setError("Failed to load personnel.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const addPersonnel = useCallback(async (name: string) => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    try {
      const newPersonnel = {
        uid: user.uid,
        name,
        createdAt: new Date(),
      };
      await addDoc(collection(db, "personnel"), newPersonnel);
    } catch (err) {
      console.error("Error adding personnel:", err);
      throw new Error("Failed to add personnel.");
    }
  }, [user?.uid]);

  return { personnel, loading, error, addPersonnel };
};
