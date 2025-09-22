import React, { useState, useCallback, useMemo } from "react";
import "./KanbanBoard.css";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DraggableProvided,
  DroppableProvided,
  DroppableStateSnapshot
} from "react-beautiful-dnd";
import {
  Button,
  Card,
  Avatar,
  Input,
  Select,
  Modal,
  message,
  Tag
} from "antd";
import {
  PlusOutlined,
  UserOutlined,
  CheckSquareOutlined,
  BugOutlined,
  BookOutlined,
  DeleteOutlined,
  LeftOutlined,
  RightOutlined,
  ExclamationCircleOutlined,
  FolderOutlined // Import FolderOutlined for archive icon
} from "@ant-design/icons";
import CreateTicketModal from "./CreateTicketModal";
import type { TicketFormData } from "./CreateTicketModal";
import dayjs from 'dayjs';
import { useKanbanBoard } from "../../hooks/useKanbanBoard"; // Import the hook
import { IssueType, Ticket } from "../../types/kanban"; // Import types from global definition
import PersonnelSelectionModal from "./PersonnelSelectionModal"; // Import PersonnelSelectionModal
import UsefulDocsDrawer from "../UsefulDocsDrawer"; // Import UsefulDocsDrawer


const getIssueTypeIcon = (issueType: IssueType) => {
  switch (issueType) {
    case "Task":
      return <CheckSquareOutlined className="issue-type-icon" style={{ color: "#4287f5" }} />;
    case "Bug":
      return <BugOutlined className="issue-type-icon" style={{ color: "#ff4d4f" }} />;
    case "Story":
      return <BookOutlined className="issue-type-icon" style={{ color: "#52c41a" }} />;
    default:
      return null;
  }
};

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case "high":
      return <div className="priority-icon" style={{ color: "#ff4d4f" }}>●</div>;
    case "medium":
      return <div className="priority-icon" style={{ color: "#faad14" }}>●</div>;
    case "low":
      return <div className="priority-icon" style={{ color: "#52c41a" }}>●</div>;
    default:
      return null;
  }
};

const KanbanBoard: React.FC = () => {
  const { columns, addTicket, updateTicket, deleteTicket, archiveTicket, moveTicket, handleDragEnd } = useKanbanBoard();

  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [personnelFilter, setPersonnelFilter] = useState<string | null>(null); // New state for personnel filter
  const [searchText, setSearchText] = useState("");
  const [activeModal, setActiveModal] = useState<'none' | 'personnel' | 'create' | 'edit'>('none'); // Single state for active modal
  const [selectedPersonnelForNewTicket, setSelectedPersonnelForNewTicket] = useState<string | null>(null); // New state to hold selected personnel
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);

  const [loadingStates, setLoadingStates] = useState({
    create: false,
    update: false,
    delete: false,
  });

  const [movingTicket, setMovingTicket] = useState<string | null>(null);
  const [highlightedColumn, setHighlightedColumn] = useState<string | null>(null);

  // useEffect(() => { // No longer needed as state is managed by useKanbanBoard and Firestore
  //   saveColumnsToStorage(columns);
  // }, [columns]);

  const onDragEnd = useCallback(async (result: DropResult) => {
    setLoadingStates((prev) => ({ ...prev, update: true }));
    try {
      await handleDragEnd(result); // Use the handleDragEnd from the hook
      message.success("Ticket moved successfully!");
    } catch (error) {
      console.error("Error moving ticket:", error);
      message.error("Failed to move ticket");
    } finally {
      setLoadingStates((prev) => ({ ...prev, update: false }));
    }
  }, [handleDragEnd]);

  const getListStyle = (isDraggingOver: boolean) => ({
    background: isDraggingOver ? '#f0f0f0' : 'transparent',
    padding: 8,
    width: '100%',
    minHeight: 500,
    transition: 'background-color 0.2s ease'
  });

  // generateUniqueTaskId is no longer needed as Firestore generates IDs
  // const generateUniqueTaskId = useCallback((existingIds: string[]): string => {
  //   const generateId = (): string => {
  //     const timestamp = Date.now();
  //     const randomNum = Math.floor(Math.random() * 1000);
  //     const id = `${timestamp % 10000}${randomNum.toString().padStart(3, '0')}`.slice(0, 4);
  //     return `ID Task: ${id}`;
  //   };

  //   let newId = generateId();
  //   while (existingIds.includes(newId)) {
  //     newId = generateId();
  //   }
  //   return newId;
  // }, []);

  const handleOpenCreateTicketFlow = useCallback(() => {
    setSelectedPersonnelForNewTicket(null); // Ensure no personnel is pre-selected
    setActiveModal('personnel'); // Open personnel selection modal
  }, []);

  const handlePersonnelSelected = useCallback((personnelName: string) => {
    setSelectedPersonnelForNewTicket(personnelName);
    setActiveModal('create'); // Open CreateTicketModal after personnel is selected
  }, []);

  const handleCreateTicket = useCallback(async (ticketData: TicketFormData) => {
    if (!selectedPersonnelForNewTicket) {
      message.error("Personnel not selected.");
      return;
    }
    setLoadingStates((prev) => ({ ...prev, create: true }));
    try {
      await addTicket({ ...ticketData, personnel: selectedPersonnelForNewTicket }); // Pass selected personnel
      setActiveModal('none'); // Close all modals
      setSelectedPersonnelForNewTicket(null); // Reset selected personnel
      message.success("Ticket created successfully!");
    } catch (error) {
      console.error("Error creating ticket:", error);
      message.error("Failed to create ticket");
    } finally {
      setLoadingStates((prev) => ({ ...prev, create: false }));
    }
  }, [addTicket, selectedPersonnelForNewTicket]);

  const handleUpdateTicket = useCallback(async (updatedTicketData: Partial<TicketFormData>) => { // Changed type to Partial<TicketFormData>
    if (!editingTicket) return;
  
    setLoadingStates(prev => ({ ...prev, update: true }));
  
    try {
      await updateTicket(editingTicket.id, updatedTicketData); // Use updateTicket from the hook
      setActiveModal('none'); // Close all modals after update
      setEditingTicket(null);
      message.success("Ticket updated successfully");
    } catch (error) {
      console.error("Error updating ticket:", error);
      message.error("Failed to update ticket");
    } finally {
      setLoadingStates(prev => ({ ...prev, update: false }));
    }
  }, [editingTicket, updateTicket]);

  const handleOpenEditModal = useCallback((ticket: Ticket) => {
    setEditingTicket({
      ...ticket,
    });
    setActiveModal('edit'); // Open edit modal
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setActiveModal('none'); // Close all modals
    setEditingTicket(null);
  }, []);

  const handleDeleteTicket = useCallback((ticketId: string) => {
    Modal.confirm({
      title: "Confirm Delete",
      content: "Are you sure you want to delete this ticket?",
      icon: <ExclamationCircleOutlined />,
      onOk: async () => {
        setLoadingStates(prev => ({ ...prev, delete: true }));
        try {
          await deleteTicket(ticketId); // Use deleteTicket from the hook
          message.success("Ticket deleted successfully!");
        } catch (error) {
          console.error("Error deleting ticket:", error);
          message.error("Failed to delete ticket");
        } finally {
          setLoadingStates(prev => ({ ...prev, delete: false }));
        }
      },
      onCancel: () => {
        message.info("Delete action was cancelled");
      },
    });
  }, [deleteTicket]);

  const handleArchiveTicket = useCallback(async (ticketId: string) => {
    setLoadingStates(prev => ({ ...prev, update: true })); // Use update loading state for archive
    try {
      await archiveTicket(ticketId);
      message.success("Ticket archived successfully!");
    } catch (error) {
      console.error("Error archiving ticket:", error);
      message.error("Failed to archive ticket");
    } finally {
      setLoadingStates(prev => ({ ...prev, update: false }));
    }
  }, [archiveTicket]);

  const handleMoveTicket = useCallback(async (ticketId: string, direction: 'left' | 'right') => {
    setMovingTicket(ticketId);
    
    const currentColumn = columns.find(col => 
      col.tickets.some(t => t.id === ticketId)
    );
    if (!currentColumn) return;

    const statusFlow = ['todo', 'inprogress', 'done'];
    const currentIndex = statusFlow.indexOf(currentColumn.id);
    const newIndex = direction === 'right' 
      ? Math.min(currentIndex + 1, statusFlow.length - 1)
      : Math.max(currentIndex - 1, 0);
    const newStatus = statusFlow[newIndex];

    // Highlight target column
    setHighlightedColumn(newStatus);
    
    // Remove highlight after animation
    setTimeout(async () => {
      setHighlightedColumn(null);
      setMovingTicket(null);
      setLoadingStates(prev => ({ ...prev, update: true }));
      try {
        await moveTicket(ticketId, newStatus); // Use moveTicket from the hook
        message.success("Ticket moved successfully!");
      } catch (error) {
        console.error("Error moving ticket:", error);
        message.error("Failed to move ticket");
      } finally {
        setLoadingStates(prev => ({ ...prev, update: false }));
      }
    }, 300);
  }, [columns, moveTicket]);

  const filterTickets = useCallback((tickets: Ticket[]) => {
    return tickets.filter(ticket => {
      if (priorityFilter && ticket.priority !== priorityFilter) return false;
      if (personnelFilter && ticket.personnel !== personnelFilter) return false; // New filter for personnel
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        return (
          ticket.title?.toLowerCase().includes(searchLower) || 
          ticket.description?.toLowerCase().includes(searchLower) ||
          ticket.personnel?.toLowerCase().includes(searchLower) // Search by personnel name
        );
      }
      return true;
    });
  }, [priorityFilter, personnelFilter, searchText]); // Add personnelFilter to dependencies

  const filteredColumns = useMemo(() => {
    return columns.map(column => ({
      ...column,
      tickets: filterTickets(column.tickets),
    }));
  }, [columns, filterTickets]);

  const personnelFilterOptions: { value: string; label: string }[] = useMemo(() => {
    const allPersonnel = columns.flatMap(col => col.tickets.map(ticket => ticket.personnel));
    const uniquePersonnel = Array.from(new Set(allPersonnel));
    return uniquePersonnel
      .filter((name): name is string => typeof name === 'string' && name !== '') // Simplified filter
      .map(personnelName => ({ value: personnelName, label: personnelName }));
  }, [columns]);

  return (
    <div className="p-4 bg-white h-full flex flex-col">
      {/* Header section */}
      <div className="mb-4 w-full flex justify-between items-center">
        <div className="flex gap-2">
          <Input.Search
            placeholder="Search ticket..."
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
          />

          <Select
            placeholder="Filter by priority"
            allowClear
            style={{ width: 200 }}
            onChange={setPriorityFilter}
            options={[
              { value: "low", label: <span style={{ color: '#52c41a' }}>🟢 Low</span> },
              { value: "medium", label: <span style={{ color: '#faad14' }}>🟡 Medium</span> },
              { value: "high", label: <span style={{ color: '#ff4d4f' }}>🔴 High</span> },
            ]}
          />

          {/* New filter for Implementation Personnel */}
          <Select
            placeholder="Filter by personnel"
            allowClear
            style={{ width: 200 }}
            onChange={setPersonnelFilter}
            options={personnelFilterOptions}
          />
        </div>

        <div className="flex gap-2">
          <UsefulDocsDrawer /> {/* Add the UsefulDocsDrawer component here */}
          {/* Open personnel selection modal first */}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreateTicketFlow}
            loading={loadingStates.create}
            disabled={loadingStates.create}
          >
            Add Ticket
          </Button>
        </div>
      </div>

      {/* Main board content */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
          {filteredColumns.map((column) => (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex flex-col flex-1 bg-gray-100 rounded-lg shadow ${
                    highlightedColumn === column.id ? 'column-highlight' : ''
                  }`}
                  style={getListStyle(snapshot.isDraggingOver)}
                >
                  <h2 className="text-sm font-semibold text-gray-600 p-3 border-b border-gray-200">
                    {column.title}
                    <span className="text-gray-400 font-normal ml-2">
                      ({column.tickets.length})
                    </span>
                  </h2>

                  <div className="flex-grow p-3 overflow-y-auto">
                    {column.tickets.length === 0 ? (
                      <div className="text-center py-4 text-gray-400">
                        {priorityFilter || searchText
                          ? "No matching tickets found."
                          : "No tickets available."}
                      </div>
                    ) : (
                      column.tickets.map((ticket, index) => (
                        <Draggable
                          key={ticket.id}
                          draggableId={ticket.id}
                          index={index}
                        >
                          {(provided: DraggableProvided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`mb-3 draggable-ticket ${
                                movingTicket === ticket.id ? 'ticket-exit' : ''
                              } ${
                                !movingTicket ? 'ticket-enter-active' : ''
                              }`}
                              onClick={() => handleOpenEditModal(ticket)}
                            >
                              <Card
                                size="small"
                                styles={{ 
                                  body: { 
                                    padding: 12,
                                    borderRadius: '8px',
                                    transition: 'all 0.2s ease',
                                    border: 'none',
                                  }
                                }}
                                className="kanban-card"
                                style={{
                                  cursor: 'grab',
                                  border: 'none',
                                  background: 'white',
                                  boxShadow: 'none'
                                }}
                              >
                                <div className="text-xs text-gray-500 mb-1">ID: {ticket.id}
                                </div>
                                <div className="text-sm font-medium mb-2">
                                  {ticket.title}
                                </div>
                                {ticket.urls?.map((u, idx) => {
                                  let isUrl = false;
                                  try {
                                    isUrl = !!u.url && /^https?:\/\//.test(u.url) && Boolean(new URL(u.url));
                                  } catch {
                                    isUrl = false;
                                  }
                                  return (
                                    <div key={idx}>
                                      {isUrl ? (
                                        <a
                                          href={u.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline text-xs truncate"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {new URL(u.url).hostname}
                                        </a>
                                      ) : (
                                        <span className="text-xs text-gray-700">{u.url}</span>
                                      )}
                                    </div>
                                  );
                                })}
                                <div className="flex justify-between items-center">
                                  <div className="icon-wrapper">
                                    {getIssueTypeIcon(ticket.issueType)}
                                    {getPriorityIcon(ticket.priority)}
                                    {ticket.status === 'done' && ticket.completedAt ? (
                                      <div className="mt-2">
                                        <Tag color="green">
                                          Complete: {dayjs(ticket.completedAt).format("YYYY-MM-DD")}
                                        </Tag>
                                      </div>
                                    ) : (
                                      ticket.deadline && (
                                        <div className="mt-2">
                                          <Tag
                                            color={
                                              dayjs(ticket.deadline).startOf('day').isBefore(dayjs().startOf('day')) 
                                                ? '#cc0000'
                                                : dayjs(ticket.deadline).startOf('day').isSame(dayjs().startOf('day'))
                                                ? 'red'
                                                : 'green'
                                            }
                                          >
                                            Deadline: {dayjs(ticket.deadline).format("YYYY-MM-DD")}
                                          </Tag>
                                        </div>
                                      )
                                    )}
                                  </div>
                                  {/* Display Implementation Personnel */}
                                  {ticket.personnel && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Personnel: {ticket.personnel}
                                    </div>
                                  )}
                                  <Avatar
                                    size={24}
                                    icon={<UserOutlined />}
                                    className="bg-gray-200"
                                  />
                                </div>
                                  <div className="action-buttons">
                                    {column.id !== 'todo' && (
                                      <Button
                                        type="text"
                                        className="action-button"
                                        icon={<LeftOutlined style={{ fontSize: '16px', color: '#1890ff' }} />}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMoveTicket(ticket.id, 'left');
                                        }}
                                      />
                                    )}
                                    {column.id === 'done' && ( // Only show archive button for 'done' tickets
                                      <Button
                                        type="text"
                                        className="action-button archive"
                                        icon={<FolderOutlined style={{ fontSize: '16px', color: '#faad14' }} />}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleArchiveTicket(ticket.id);
                                        }}
                                      />
                                    )}
                                    <Button
                                      type="text"
                                      className="action-button delete"
                                      icon={<DeleteOutlined style={{ fontSize: '16px', color: '#ff4d4f' }} />}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteTicket(ticket.id);
                                      }}
                                    />
                                    {column.id !== 'done' && (
                                      <Button
                                        type="text"
                                        className="action-button"
                                        icon={<RightOutlined style={{ fontSize: '16px', color: '#1890ff' }} />}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMoveTicket(ticket.id, 'right');
                                        }}
                                      />
                                    )}
                                  </div>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      <CreateTicketModal
        mode="create"
        isOpen={activeModal === 'create'}
        onClose={() => setActiveModal('none')}
        onCreateTicket={handleCreateTicket}
        loading={loadingStates.create}
      />

      {editingTicket && (
        <CreateTicketModal
          mode="edit"
          isOpen={activeModal === 'edit'}
          onClose={handleCloseEditModal}
          initialData={editingTicket}
          onUpdateTicket={handleUpdateTicket}
          loading={loadingStates.update}
        />
      )}

      <PersonnelSelectionModal
        isOpen={activeModal === 'personnel'}
        onClose={() => setActiveModal('none')}
        onSelectPersonnel={handlePersonnelSelected}
      />
    </div>
  );
};

export default KanbanBoard;
