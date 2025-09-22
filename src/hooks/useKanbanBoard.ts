import { useState, useRef, useCallback, useEffect } from "react";
import { Column, Ticket, TicketFormData } from "../types/kanban";
import { initialColumns } from "../utils/constants";
import { db } from "../firebase";
import { collection, onSnapshot, updateDoc, deleteDoc, doc, query, orderBy, setDoc, getDocs, where, documentId, deleteField, serverTimestamp, type UpdateData } from "firebase/firestore"; // Import deleteField
export const useKanbanBoard = () => {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const existingTicketIds = useRef<Set<string>>(new Set()); // Store existing 5-digit IDs

  useEffect(() => {
    // Query to fetch tickets that are not archived, ordered by creation date
    const q = query(
      collection(db, "tickets"),
      where("archived", "==", false), // Filter out archived tickets
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tickets: Ticket[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          description: data.description,
          priority: data.priority,
          issueType: data.issueType,
          status: data.status,
          createdAt: data.createdAt.toDate(),
          urls: data.urls || [],
          deadline: data.deadline ? data.deadline.toDate() : undefined,
          personnel: data.personnel || undefined, // Include personnel field
          completedAt: data.completedAt ? data.completedAt.toDate() : undefined, // Include completedAt field
        };
      });

      const updatedColumns = initialColumns.map(col => ({
        ...col,
        tickets: tickets.filter(ticket => ticket.status === col.id),
      }));
      setColumns(updatedColumns);

      // Update existingTicketIds
      existingTicketIds.current = new Set(tickets.map(ticket => ticket.id));
    });

    return () => unsubscribe();
  }, []);

  // Function to generate a unique 5-digit ID
  const generateUnique5DigitId = useCallback(async (): Promise<string> => {
    let newId: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loops

    while (!isUnique && attempts < maxAttempts) {
      newId = String(Math.floor(10000 + Math.random() * 90000)); // Generate a random 5-digit number
      if (!existingTicketIds.current.has(newId)) {
        // Double-check against Firestore directly to be absolutely sure, especially on initial load
        const q = query(collection(db, "tickets"), where(documentId(), "==", newId)); // Correct usage of where and documentId
        const docSnap = await getDocs(q);
        if (docSnap.empty) {
          isUnique = true;
          existingTicketIds.current.add(newId); // Add to local set
          return newId;
        }
      }
      attempts++;
    }
    throw new Error("Failed to generate a unique 5-digit ID after multiple attempts.");
  }, []);

  const addTicket = useCallback(async (ticketData: TicketFormData) => {
    const newId = await generateUnique5DigitId(); // Generate custom unique ID

    const newTicket: Ticket = { // Change Omit<Ticket, "id"> to Ticket
      id: newId, // Assign the custom ID
      ...ticketData,
      createdAt: new Date(),
      urls: ticketData.urls || [],
      deadline: ticketData.deadline ? new Date(ticketData.deadline) : undefined,
      status: "todo",
      personnel: ticketData.personnel || undefined, // Include personnel field
      archived: false, // New tickets are not archived by default
    };

    await setDoc(doc(db, "tickets", newId), newTicket); // Use setDoc with custom ID
  }, [generateUnique5DigitId]);

  const updateTicket = useCallback(async (ticketId: string, updatedData: Partial<Ticket>) => {
    const ticketRef = doc(db, "tickets", ticketId);
    await updateDoc(ticketRef, updatedData);
  }, []);

  const deleteTicket = useCallback(async (ticketId: string) => {
    const ticketRef = doc(db, "tickets", ticketId);
    await deleteDoc(ticketRef);
  }, []);

  const archiveTicket = useCallback(async (ticketId: string) => {
    const ticketRef = doc(db, "tickets", ticketId);
    await updateDoc(ticketRef, { archived: true });
  }, []);

  const moveTicket = useCallback(async (ticketId: string, newStatus: Ticket['status']) => {
    const ref = doc(db, 'tickets', ticketId);

    const base: UpdateData<Ticket> = { status: newStatus };

    const patch: UpdateData<Ticket> =
      newStatus === 'done'
        ? { ...base, completedAt: serverTimestamp() }
        : { ...base, completedAt: deleteField() };

    await updateDoc(ref, patch);
  }, []);

  const handleDragEnd = useCallback(async (result: any) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    if (source.droppableId === destination.droppableId) {
      // Reordering within the same column (not directly supported by Firestore for simple reorder)
      // For now, we'll just update the status if it's a move between columns
      // A more complex solution would involve adding an 'order' field to tickets
    } else {
      // Moving between columns
      const ticketRef = doc(db, "tickets", draggableId);
      await updateDoc(ticketRef, { status: destination.droppableId });
    }
  }, []);

  return {
    columns,
    addTicket,
    updateTicket,
    deleteTicket,
    archiveTicket, // Return the new archiveTicket function
    moveTicket,
    handleDragEnd,
    setColumns, // setColumns is still returned for potential local state manipulation if needed, but primary updates will be via Firestore
  };
};
