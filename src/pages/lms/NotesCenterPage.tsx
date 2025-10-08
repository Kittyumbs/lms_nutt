import React, { useState, useEffect, useCallback } from 'react';
import { 
  Input, 
  Select, 
  Button, 
  Card, 
  Space, 
  Typography, 
  Segmented,
  Empty,
  Popconfirm,
  message,
  Tag,
  Row,
  Col,
  Badge
} from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  PushpinOutlined,
  PushpinFilled,
  EditOutlined,
  DeleteOutlined,
  BookOutlined,
  TagsOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useDebounce } from 'use-debounce';

import { useNotes, type Note } from '../../hooks/useNotes';
import { useSidebar } from '../../hooks/useSidebar';
import NotesEditor from './components/NotesEditor';

const { Title, Text } = Typography;
const { Search } = Input;

type SortOption = 'newest' | 'oldest' | 'alphabetical';

const NotesCenterPage: React.FC = () => {
  const { list, upsert, remove, togglePin, getAllTags, getStats, clearAllNotes } = useNotes();
  const { isOpen: sidebarOpen } = useSidebar();
  
  // State
  const [searchText, setSearchText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Debounced search
  const [debouncedSearch] = useDebounce(searchText, 300);

  // Get filtered and sorted notes
  const getFilteredNotes = useCallback(() => {
    return list({
      search: debouncedSearch,
      onlyPinned: showPinnedOnly,
      sortBy
    });
  }, [list, debouncedSearch, showPinnedOnly, sortBy]);

  const filteredNotes = getFilteredNotes();
  const allTags = getAllTags();
  const stats = getStats();

  // Handlers
  const handleNewNote = useCallback(() => {
    setEditingNote(null);
    setIsEditorOpen(true);
  }, []);

  const handleEditNote = useCallback((note: Note) => {
    setEditingNote(note);
    setIsEditorOpen(true);
  }, []);

  const handleSaveNote = useCallback(async (noteData: Partial<Note> & { id?: string }) => {
    try {
      const savedNote = await upsert(noteData);
      setEditingNote(savedNote);
      message.success(noteData.id ? 'Note updated' : 'Note created');
      return savedNote;
    } catch (error) {
      console.error('Error saving note:', error);
      message.error('Failed to save note');
      throw error;
    }
  }, [upsert]);

  const handleDeleteNote = useCallback(async (id: string) => {
    try {
      await remove(id);
      message.success('Note deleted');
    } catch (error) {
      console.error('Error deleting note:', error);
      message.error('Failed to delete note');
    }
  }, [remove]);

  const handleTogglePin = useCallback(async (id: string) => {
    try {
      await togglePin(id);
    } catch (error) {
      console.error('Error toggling pin:', error);
      message.error('Failed to update note');
    }
  }, [togglePin]);

  const handleCloseEditor = useCallback(() => {
    setIsEditorOpen(false);
    setEditingNote(null);
  }, []);

  const handleTagFilter = useCallback((tag: string) => {
    setSelectedTag(selectedTag === tag ? undefined : tag);
    setSearchText(selectedTag === tag ? '' : tag);
  }, [selectedTag]);

  // Helper functions
  const getNoteTitle = (note: Note) => {
    if (note.title) return note.title;
    
    // Extract title from first line of content
    const firstLine = note.content.split('\n')[0];
    if (firstLine && firstLine.trim()) {
      return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
    }
    
    return 'Untitled';
  };

  const getNotePreview = (note: Note) => {
    // Remove markdown syntax for preview
    const cleanContent = note.content
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/^\s*[-*+]\s+/gm, '') // Remove bullet points
      .trim();
    
    return cleanContent.length > 120 ? cleanContent.substring(0, 120) + '...' : cleanContent;
  };

  const formatDate = (timestamp: number | any) => {
    // Handle both Firestore Timestamp and number
    let date: Date;
    if (timestamp && typeof timestamp.toDate === 'function') {
      // Firestore Timestamp
      date = timestamp.toDate();
    } else if (typeof timestamp === 'number') {
      // Regular timestamp
      date = new Date(timestamp);
    } else {
      // Fallback
      date = new Date();
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  return (
    <div className={`${sidebarOpen ? 'w-full px-6' : 'max-w-7xl mx-auto px-6'} py-4`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <Title level={2} className="!mb-1 flex items-center">
            <BookOutlined className="mr-2 text-[#057EC8]" />
            My Notes
          </Title>
          <Text type="secondary" className="text-sm">
            Personal notes and thoughts
          </Text>
        </div>
        <Space>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleNewNote}
            style={{ 
              backgroundColor: '#057EC8',
              borderColor: '#057EC8'
            }}
          >
            New Note
          </Button>
          <Popconfirm
            title="Clear all notes?"
            description="This will delete all notes from the database. Are you sure?"
            onConfirm={async () => {
              try {
                await clearAllNotes();
                message.success('All notes cleared successfully');
              } catch (error) {
                message.error('Failed to clear notes');
              }
            }}
            okText="Clear All"
            cancelText="Cancel"
          >
            <Button danger>
              Clear All Notes
            </Button>
          </Popconfirm>
        </Space>
      </div>

      {/* Compact Stats */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        <div className="flex items-center gap-1">
          <BookOutlined className="text-[#057EC8]" />
          <span className="font-medium">{stats.total}</span>
          <span className="text-gray-500">Total</span>
        </div>
        <div className="flex items-center gap-1">
          <PushpinFilled className="text-[#77BEF0]" />
          <span className="font-medium">{stats.pinned}</span>
          <span className="text-gray-500">Pinned</span>
        </div>
        <div className="flex items-center gap-1">
          <TagsOutlined className="text-[#D8EFF0]" />
          <span className="font-medium">{stats.withTags}</span>
          <span className="text-gray-500">With Tags</span>
        </div>
      </div>

      {/* Compact Filter Bar */}
      <div className="bg-[#33A1E0] p-3 rounded-xl mb-4 border border-black/10">
        <Space wrap>
          <Search
            placeholder="Search notes..."
            style={{ width: 280 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
            allowClear
          />
          <Select
            placeholder="Filter by tag"
            value={selectedTag}
            onChange={setSelectedTag}
            allowClear
            style={{ minWidth: 200 }}
            options={allTags.map(tag => ({
              label: tag,
              value: tag
            }))}
          />
          <Button
            type={showPinnedOnly ? 'primary' : 'default'}
            icon={<PushpinFilled />}
            onClick={() => setShowPinnedOnly(!showPinnedOnly)}
            style={showPinnedOnly ? {
              backgroundColor: '#77BEF0',
              borderColor: '#77BEF0'
            } : {}}
          >
            Pinned Only
          </Button>
          <Segmented
            value={sortBy}
            onChange={(value) => setSortBy(value as SortOption)}
            options={[
              { label: 'Newest', value: 'newest' },
              { label: 'Oldest', value: 'oldest' },
              { label: 'A-Z', value: 'alphabetical' }
            ]}
            className="[&_.ant-segmented-item-selected]:bg-[#77BEF0]"
          />
        </Space>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span>
              {searchText || selectedTag || showPinnedOnly
                ? 'No notes found' 
                : 'No notes yet'
              }
              {!searchText && !selectedTag && !showPinnedOnly && (
                <div className="mt-2">
                  <Button type="link" onClick={handleNewNote}>Create a new note</Button>
                </div>
              )}
            </span>
          }
        />
      ) : (
        <Row gutter={[16, 16]}>
          {filteredNotes.map((note) => (
            <Col xs={24} sm={12} lg={8} key={note.id}>
              <Card
                hoverable
                className="h-full transition-all duration-200 hover:shadow-lg mb-4"
                style={{
                  borderRadius: '8px',
                  border: note.pinned ? '2px solid #77BEF0' : '1px solid rgba(0,0,0,0.08)',
                  backgroundColor: '#FFFACD', // Light yellow background like a sticky note
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
                bodyStyle={{ padding: '16px' }}
                actions={[
                  <Button
                    key="edit"
                    type="text"
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditNote(note);
                    }}
                    title="Edit note"
                    size="small"
                  />,
                  <Button
                    key="pin"
                    type="text"
                    icon={note.pinned ? <PushpinFilled /> : <PushpinOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePin(note.id);
                    }}
                    title={note.pinned ? 'Unpin note' : 'Pin note'}
                    style={{ color: note.pinned ? '#057EC8' : undefined }}
                    size="small"
                  />,
                  <Popconfirm
                    key="delete"
                    title="Delete note?"
                    description="Are you sure you want to delete this note?"
                    onConfirm={() => handleDeleteNote(note.id)}
                    okText="Delete"
                    cancelText="Cancel"
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      title="Delete note"
                      size="small"
                    />
                  </Popconfirm>
                ]}
              >
                <div className="h-full flex flex-col">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <Title level={5} className="!mb-2 !text-sm line-clamp-2">
                        {getNoteTitle(note)}
                      </Title>
                    </div>
                    {note.pinned && (
                      <Badge 
                        count="PINNED" 
                        style={{ 
                          backgroundColor: '#77BEF0',
                          fontSize: '9px',
                          height: '14px',
                          lineHeight: '14px'
                        }}
                      />
                    )}
                  </div>

                  {/* Content Preview */}
                  <div className="flex-1 mb-2">
                    <div className="text-xs text-gray-600 line-clamp-2">
                      {getNotePreview(note) || (
                        <span className="text-gray-400 italic">Empty note</span>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {note.tags.slice(0, 2).map((tag, index) => (
                        <Tag 
                          key={index} 
                          color="#77BEF0"
                          className="cursor-pointer text-xs"
                          onClick={() => handleTagFilter(tag)}
                        >
                          {tag}
                        </Tag>
                      ))}
                      {note.tags.length > 2 && (
                        <Tag color="default" className="text-xs">
                          +{note.tags.length - 2}
                        </Tag>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Notes Editor */}
      <NotesEditor
        isOpen={isEditorOpen}
        onClose={handleCloseEditor}
        note={editingNote}
        onSave={handleSaveNote}
        onDelete={handleDeleteNote}
        onTogglePin={handleTogglePin}
      />
    </div>
  );
};

export default NotesCenterPage;
