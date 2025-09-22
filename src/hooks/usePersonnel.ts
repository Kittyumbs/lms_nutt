import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, addDoc, query, orderBy } from "firebase/firestore";

export interface Personnel {
  id: string;
  name: string;
  createdAt: Date;
}

export const usePersonnel = () => {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "personnel"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedPersonnel: Personnel[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            createdAt: data.createdAt.toDate(),
          };
        });
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
  }, []);

  const addPersonnel = useCallback(async (name: string) => {
    try {
      const newPersonnel = {
        name,
        createdAt: new Date(),
      };
      await addDoc(collection(db, "personnel"), newPersonnel);
    } catch (err) {
      console.error("Error adding personnel:", err);
      throw new Error("Failed to add personnel.");
    }
  }, []);

  return { personnel, loading, error, addPersonnel };
};
