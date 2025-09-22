import { Column } from "../types/kanban";

export const moveTicketBetweenColumns = (
  columns: Column[],
  ticketId: string,
  newStatus: string
): Column[] => {
  const currentColumn = columns.find(col => 
    col.tickets.some(t => t.id === ticketId)
  );
  
  if (!currentColumn) return columns;

  return columns.map(column => {
    // Remove from current column
    if (column.id === currentColumn.id) {
      return {
        ...column,
        tickets: column.tickets.filter(t => t.id !== ticketId)
      };
    }
    // Add to new column
    else if (column.id === newStatus) {
      const movedTicket = currentColumn.tickets.find(t => t.id === ticketId);
      if (movedTicket) {
        return {
          ...column,
          tickets: [...column.tickets, { 
            ...movedTicket, 
            status: newStatus 
          }]
        };
      }
    }
    return column;
  });
};

export const reorderColumnsOnDragEnd = (
  columns: Column[],
  source: { droppableId: string; index: number },
  destination: { droppableId: string; index: number }
): Column[] => {
  const newColumns = [...columns];
  const sourceCol = newColumns.find(col => col.id === source.droppableId);
  const destCol = newColumns.find(col => col.id === destination.droppableId);

  if (!sourceCol || !destCol) return columns;

  const [movedTicket] = sourceCol.tickets.splice(source.index, 1);
  movedTicket.status = destination.droppableId;
  destCol.tickets.splice(destination.index, 0, movedTicket);

  return newColumns;
};