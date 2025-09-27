import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback, useMemo } from "react";
import "./KanbanBoard.css";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Button, Card, Avatar, Input, Select, Modal, message, Tag } from "antd";
import { PlusOutlined, UserOutlined, CheckSquareOutlined, BugOutlined, BookOutlined, DeleteOutlined, LeftOutlined, RightOutlined, ExclamationCircleOutlined, FolderOutlined // Import FolderOutlined for archive icon
 } from "@ant-design/icons";
import CreateTicketModal from "./CreateTicketModal";
import dayjs from 'dayjs';
import { useKanbanBoard } from "../../hooks/useKanbanBoard"; // Import the hook
import PersonnelSelectionModal from "./PersonnelSelectionModal"; // Import PersonnelSelectionModal
import UsefulDocsDrawer from "../UsefulDocsDrawer"; // Import UsefulDocsDrawer
import CreateCalendarEventModal from "../CreateCalendarEventModal"; // Import CreateCalendarEventModal
import { CalendarOutlined, SwapOutlined } from "@ant-design/icons"; // Import CalendarOutlined, LogoutOutlined, and SwapOutlined icon
import { Dropdown } from 'antd'; // Import Dropdown
import CalendarEventsDrawer from "../CalendarEventsDrawer"; // Import CalendarEventsDrawer
import { useGoogleCalendar } from "../../hooks/useGoogleCalendar"; // Import useGoogleCalendar hook
const getIssueTypeIcon = (issueType) => {
    switch (issueType) {
        case "Task":
            return _jsx(CheckSquareOutlined, { className: "issue-type-icon", style: { color: "#4287f5" } });
        case "Bug":
            return _jsx(BugOutlined, { className: "issue-type-icon", style: { color: "#ff4d4f" } });
        case "Story":
            return _jsx(BookOutlined, { className: "issue-type-icon", style: { color: "#52c41a" } });
        default:
            return null;
    }
};
const getPriorityIcon = (priority) => {
    switch (priority) {
        case "high":
            return _jsx("div", { className: "priority-icon", style: { color: "#ff4d4f" }, children: "\u25CF" });
        case "medium":
            return _jsx("div", { className: "priority-icon", style: { color: "#faad14" }, children: "\u25CF" });
        case "low":
            return _jsx("div", { className: "priority-icon", style: { color: "#52c41a" }, children: "\u25CF" });
        default:
            return null;
    }
};
const KanbanBoard = () => {
    const { columns, addTicket, updateTicket, deleteTicket, archiveTicket, moveTicket, handleDragEnd } = useKanbanBoard();
    const { isSignedIn, handleAuthClick, signOut } = useGoogleCalendar(); // Lấy trạng thái và hàm từ hook
    console.log("KanbanBoard - isSignedIn:", isSignedIn); // Debugging line
    const [priorityFilter, setPriorityFilter] = useState(null);
    const [personnelFilter, setPersonnelFilter] = useState(null); // New state for personnel filter
    const [searchText, setSearchText] = useState("");
    const [activeModal, setActiveModal] = useState('none'); // Single state for active modal, updated for calendar
    const [selectedPersonnelForNewTicket, setSelectedPersonnelForNewTicket] = useState(null); // New state to hold selected personnel
    const [editingTicket, setEditingTicket] = useState(null);
    const [loadingStates, setLoadingStates] = useState({
        create: false,
        update: false,
        delete: false,
    });
    const [movingTicket, setMovingTicket] = useState(null);
    const [highlightedColumn, setHighlightedColumn] = useState(null);
    // useEffect(() => { // No longer needed as state is managed by useKanbanBoard and Firestore
    //   saveColumnsToStorage(columns);
    // }, [columns]);
    const onDragEnd = useCallback(async (result) => {
        setLoadingStates((prev) => ({ ...prev, update: true }));
        try {
            await handleDragEnd(result); // Use the handleDragEnd from the hook
            message.success("Ticket moved successfully!");
        }
        catch (error) {
            console.error("Error moving ticket:", error);
            message.error("Failed to move ticket");
        }
        finally {
            setLoadingStates((prev) => ({ ...prev, update: false }));
        }
    }, [handleDragEnd]);
    const getListStyle = (isDraggingOver) => ({
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
    const handlePersonnelSelected = useCallback((personnelName) => {
        setSelectedPersonnelForNewTicket(personnelName);
        setActiveModal('create'); // Open CreateTicketModal after personnel is selected
    }, []);
    const handleCreateTicket = useCallback(async (ticketData) => {
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
        }
        catch (error) {
            console.error("Error creating ticket:", error);
            message.error("Failed to create ticket");
        }
        finally {
            setLoadingStates((prev) => ({ ...prev, create: false }));
        }
    }, [addTicket, selectedPersonnelForNewTicket]);
    const handleUpdateTicket = useCallback(async (updatedTicketData) => {
        if (!editingTicket)
            return;
        setLoadingStates(prev => ({ ...prev, update: true }));
        try {
            await updateTicket(editingTicket.id, updatedTicketData); // Use updateTicket from the hook
            setActiveModal('none'); // Close all modals after update
            setEditingTicket(null);
            message.success("Ticket updated successfully");
        }
        catch (error) {
            console.error("Error updating ticket:", error);
            message.error("Failed to update ticket");
        }
        finally {
            setLoadingStates(prev => ({ ...prev, update: false }));
        }
    }, [editingTicket, updateTicket]);
    const handleOpenEditModal = useCallback((ticket) => {
        setEditingTicket({
            ...ticket,
        });
        setActiveModal('edit'); // Open edit modal
    }, []);
    const handleCloseEditModal = useCallback(() => {
        setActiveModal('none'); // Close all modals
        setEditingTicket(null);
    }, []);
    const handleDeleteTicket = useCallback((ticketId) => {
        Modal.confirm({
            title: "Confirm Delete",
            content: "Are you sure you want to delete this ticket?",
            icon: _jsx(ExclamationCircleOutlined, {}),
            onOk: async () => {
                setLoadingStates(prev => ({ ...prev, delete: true }));
                try {
                    await deleteTicket(ticketId); // Use deleteTicket from the hook
                    message.success("Ticket deleted successfully!");
                }
                catch (error) {
                    console.error("Error deleting ticket:", error);
                    message.error("Failed to delete ticket");
                }
                finally {
                    setLoadingStates(prev => ({ ...prev, delete: false }));
                }
            },
            onCancel: () => {
                message.info("Delete action was cancelled");
            },
        });
    }, [deleteTicket]);
    const handleArchiveTicket = useCallback(async (ticketId) => {
        setLoadingStates(prev => ({ ...prev, update: true })); // Use update loading state for archive
        try {
            await archiveTicket(ticketId);
            message.success("Ticket archived successfully!");
        }
        catch (error) {
            console.error("Error archiving ticket:", error);
            message.error("Failed to archive ticket");
        }
        finally {
            setLoadingStates(prev => ({ ...prev, update: false }));
        }
    }, [archiveTicket]);
    const handleMoveTicket = useCallback(async (ticketId, direction) => {
        setMovingTicket(ticketId);
        const currentColumn = columns.find(col => col.tickets.some(t => t.id === ticketId));
        if (!currentColumn)
            return;
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
            }
            catch (error) {
                console.error("Error moving ticket:", error);
                message.error("Failed to move ticket");
            }
            finally {
                setLoadingStates(prev => ({ ...prev, update: false }));
            }
        }, 300);
    }, [columns, moveTicket]);
    const filterTickets = useCallback((tickets) => {
        return tickets.filter(ticket => {
            if (priorityFilter && ticket.priority !== priorityFilter)
                return false;
            if (personnelFilter && ticket.personnel !== personnelFilter)
                return false; // New filter for personnel
            if (searchText) {
                const searchLower = searchText.toLowerCase();
                return (ticket.title?.toLowerCase().includes(searchLower) ||
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
    const personnelFilterOptions = useMemo(() => {
        const allPersonnel = columns.flatMap(col => col.tickets.map(ticket => ticket.personnel));
        const uniquePersonnel = Array.from(new Set(allPersonnel));
        return uniquePersonnel
            .filter((name) => typeof name === 'string' && name !== '') // Simplified filter
            .map(personnelName => ({ value: personnelName, label: personnelName }));
    }, [columns]);
    return (_jsxs("div", { className: "p-4 bg-white h-full flex flex-col", children: [_jsxs("div", { className: "mb-4 w-full flex justify-between items-center", children: [_jsxs("div", { className: "flex gap-2", children: [_jsx(Input.Search, { placeholder: "Search ticket...", allowClear: true, onChange: (e) => setSearchText(e.target.value), style: { width: 250 } }), _jsx(Select, { placeholder: "Filter by priority", allowClear: true, style: { width: 200 }, onChange: setPriorityFilter, options: [
                                    { value: "low", label: _jsx("span", { style: { color: '#52c41a' }, children: "\uD83D\uDFE2 Low" }) },
                                    { value: "medium", label: _jsx("span", { style: { color: '#faad14' }, children: "\uD83D\uDFE1 Medium" }) },
                                    { value: "high", label: _jsx("span", { style: { color: '#ff4d4f' }, children: "\uD83D\uDD34 High" }) },
                                ] }), _jsx(Select, { placeholder: "Filter by personnel", allowClear: true, style: { width: 200 }, onChange: setPersonnelFilter, options: personnelFilterOptions })] }), _jsxs("div", { className: "flex gap-2", children: [isSignedIn && (_jsx(Button, { type: "text", icon: _jsx(SwapOutlined, { style: { fontSize: '20px', color: '#ff4d4f' } }), onClick: signOut, className: "ant-btn-icon-only", style: { marginRight: '8px' }, title: `Thoát tài khoản Google` })), _jsx(Dropdown, { menu: {
                                    items: [
                                        {
                                            key: 'create',
                                            label: 'Tạo lịch hẹn',
                                            onClick: () => {
                                                if (!isSignedIn) {
                                                    handleAuthClick();
                                                }
                                                else {
                                                    setActiveModal('createCalendar');
                                                }
                                            },
                                        },
                                        {
                                            key: 'view',
                                            label: 'Xem sự kiện lịch',
                                            onClick: () => {
                                                if (!isSignedIn) {
                                                    handleAuthClick();
                                                }
                                                else {
                                                    setActiveModal('viewCalendarEvents');
                                                }
                                            },
                                        },
                                    ],
                                }, trigger: ['hover'], children: _jsx(Button, { type: "text", icon: _jsx(CalendarOutlined, { style: { fontSize: '20px', color: '#595959' } }), className: "ant-btn-icon-only", style: { marginRight: '8px' }, title: "L\u1ECBch Google" }) }), _jsx(UsefulDocsDrawer, {}), " ", _jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: handleOpenCreateTicketFlow, loading: loadingStates.create, disabled: loadingStates.create, children: "Add Ticket" })] })] }), _jsx(DragDropContext, { onDragEnd: onDragEnd, children: _jsx("div", { className: "flex gap-4 flex-1 min-h-0 overflow-hidden", children: filteredColumns.map((column) => (_jsx(Droppable, { droppableId: column.id, children: (provided, snapshot) => (_jsxs("div", { ref: provided.innerRef, ...provided.droppableProps, className: `flex flex-col flex-1 bg-gray-100 rounded-lg shadow ${highlightedColumn === column.id ? 'column-highlight' : ''}`, style: getListStyle(snapshot.isDraggingOver), children: [_jsxs("h2", { className: "text-sm font-semibold text-gray-600 p-3 border-b border-gray-200", children: [column.title, _jsxs("span", { className: "text-gray-400 font-normal ml-2", children: ["(", column.tickets.length, ")"] })] }), _jsxs("div", { className: "flex-grow p-3 overflow-y-auto", children: [column.tickets.length === 0 ? (_jsx("div", { className: "text-center py-4 text-gray-400", children: priorityFilter || searchText
                                                ? "No matching tickets found."
                                                : "No tickets available." })) : (column.tickets.map((ticket, index) => (_jsx(Draggable, { draggableId: ticket.id, index: index, children: (provided) => (_jsx("div", { ref: provided.innerRef, ...provided.draggableProps, ...provided.dragHandleProps, className: `mb-3 draggable-ticket ${movingTicket === ticket.id ? 'ticket-exit' : ''} ${!movingTicket ? 'ticket-enter-active' : ''}`, onClick: () => handleOpenEditModal(ticket), children: _jsxs(Card, { size: "small", styles: {
                                                        body: {
                                                            padding: 12,
                                                            borderRadius: '8px',
                                                            transition: 'all 0.2s ease',
                                                            border: 'none',
                                                        }
                                                    }, className: "kanban-card", style: {
                                                        cursor: 'grab',
                                                        border: 'none',
                                                        background: 'white',
                                                        boxShadow: 'none'
                                                    }, children: [_jsxs("div", { className: "text-xs text-gray-500 mb-1", children: ["ID: ", ticket.id] }), _jsx("div", { className: "text-sm font-medium mb-2", children: ticket.title }), ticket.urls?.map((u, idx) => {
                                                            let isUrl = false;
                                                            try {
                                                                isUrl = !!u.url && /^https?:\/\//.test(u.url) && Boolean(new URL(u.url));
                                                            }
                                                            catch {
                                                                isUrl = false;
                                                            }
                                                            return (_jsx("div", { children: isUrl ? (_jsx("a", { href: u.url, target: "_blank", rel: "noopener noreferrer", className: "text-blue-600 hover:underline text-xs truncate", onClick: (e) => e.stopPropagation(), children: new URL(u.url).hostname })) : (_jsx("span", { className: "text-xs text-gray-700", children: u.url })) }, idx));
                                                        }), _jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { className: "icon-wrapper", children: [getIssueTypeIcon(ticket.issueType), getPriorityIcon(ticket.priority), ticket.status === 'done' && ticket.completedAt ? (_jsx("div", { className: "mt-2", children: _jsxs(Tag, { color: "green", children: ["Complete: ", dayjs(ticket.completedAt).format("YYYY-MM-DD")] }) })) : (ticket.deadline && (_jsx("div", { className: "mt-2", children: _jsxs(Tag, { color: dayjs(ticket.deadline).startOf('day').isBefore(dayjs().startOf('day'))
                                                                                    ? '#cc0000'
                                                                                    : dayjs(ticket.deadline).startOf('day').isSame(dayjs().startOf('day'))
                                                                                        ? 'red'
                                                                                        : 'green', children: ["Deadline: ", dayjs(ticket.deadline).format("YYYY-MM-DD")] }) })))] }), ticket.personnel && (_jsxs("div", { className: "text-xs text-gray-500 mt-1", children: ["Personnel: ", ticket.personnel] })), _jsx(Avatar, { size: 24, icon: _jsx(UserOutlined, {}), className: "bg-gray-200" })] }), _jsxs("div", { className: "action-buttons", children: [column.id !== 'todo' && (_jsx(Button, { type: "text", className: "action-button", icon: _jsx(LeftOutlined, { style: { fontSize: '16px', color: '#1890ff' } }), onClick: (e) => {
                                                                        e.stopPropagation();
                                                                        handleMoveTicket(ticket.id, 'left');
                                                                    } })), column.id === 'done' && ( // Only show archive button for 'done' tickets
                                                                _jsx(Button, { type: "text", className: "action-button archive", icon: _jsx(FolderOutlined, { style: { fontSize: '16px', color: '#faad14' } }), onClick: (e) => {
                                                                        e.stopPropagation();
                                                                        handleArchiveTicket(ticket.id);
                                                                    } })), _jsx(Button, { type: "text", className: "action-button delete", icon: _jsx(DeleteOutlined, { style: { fontSize: '16px', color: '#ff4d4f' } }), onClick: (e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteTicket(ticket.id);
                                                                    } }), column.id !== 'done' && (_jsx(Button, { type: "text", className: "action-button", icon: _jsx(RightOutlined, { style: { fontSize: '16px', color: '#1890ff' } }), onClick: (e) => {
                                                                        e.stopPropagation();
                                                                        handleMoveTicket(ticket.id, 'right');
                                                                    } }))] })] }) })) }, ticket.id)))), provided.placeholder] })] })) }, column.id))) }) }), _jsx(CreateTicketModal, { mode: "create", isOpen: activeModal === 'create', onClose: () => setActiveModal('none'), onCreateTicket: handleCreateTicket, loading: loadingStates.create }), editingTicket && (_jsx(CreateTicketModal, { mode: "edit", isOpen: activeModal === 'edit', onClose: handleCloseEditModal, initialData: editingTicket, onUpdateTicket: handleUpdateTicket, loading: loadingStates.update })), _jsx(PersonnelSelectionModal, { isOpen: activeModal === 'personnel', onClose: () => setActiveModal('none'), onSelectPersonnel: handlePersonnelSelected }), _jsx(CreateCalendarEventModal, { isOpen: activeModal === 'createCalendar', onClose: () => setActiveModal('none'), isSignedIn: isSignedIn, handleAuthClick: handleAuthClick }), _jsx(CalendarEventsDrawer, { isOpen: activeModal === 'viewCalendarEvents', onClose: () => setActiveModal('none') })] }));
};
export default KanbanBoard;
