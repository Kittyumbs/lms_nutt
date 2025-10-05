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
  Col
} from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  PushpinOutlined,
  PushpinFilled,
  EditOutlined,
  DeleteOutlined,
  BookOutlined
} from '@ant-design/icons';
import { useDebounce } from 'use-debounce';
import ReactMarkdown from 'react-markdown';

import { useNotes, type Note } from '../../hooks/useNotes';
import NotesEditor from './components/NotesEditor';

const { Title } = Typography;
const { Search } = Input;

type SortOption = 'newest' | 'oldest' | 'pinned';

const NotesCenterPage: React.FC = () => {
  const { list, upsert, remove, togglePin, allCourses, allLessons } = useNotes();
  
  // State
  const [searchText, setSearchText] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string | undefined>();
  const [selectedLesson, setSelectedLesson] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Debounced search
  const [debouncedSearch] = useDebounce(searchText, 300);

  // Get filtered and sorted notes
  const getFilteredNotes = useCallback(() => {
    let filteredNotes = list({
      search: debouncedSearch,
      courseId: selectedCourse,
      lessonId: selectedLesson
    });

    // Apply sorting
    if (sortBy === 'pinned') {
      filteredNotes = filteredNotes.filter(note => note.pinned);
    } else if (sortBy === 'oldest') {
      filteredNotes = filteredNotes.sort((a, b) => a.updatedAt - b.updatedAt);
    }
    // 'newest' is default sorting from list()

    return filteredNotes;
  }, [list, debouncedSearch, selectedCourse, selectedLesson, sortBy]);

  const filteredNotes = getFilteredNotes();

  // Get course and lesson options
  const courseOptions = allCourses();
  const lessonOptions = allLessons(selectedCourse);

  // Reset lesson when course changes
  useEffect(() => {
    setSelectedLesson(undefined);
  }, [selectedCourse]);

  // Handlers
  const handleNewNote = useCallback(() => {
    setEditingNote(null);
    setIsEditorOpen(true);
  }, []);

  const handleEditNote = useCallback((note: Note) => {
    setEditingNote(note);
    setIsEditorOpen(true);
  }, []);

  const handleSaveNote = useCallback((noteData: Partial<Note> & { id?: string }) => {
    const savedNote = upsert(noteData);
    setEditingNote(savedNote);
    message.success(noteData.id ? 'Note updated' : 'Note created');
    return savedNote;
  }, [upsert]);

  const handleDeleteNote = useCallback((id: string) => {
    remove(id);
    message.success('Note deleted');
  }, [remove]);

  const handleTogglePin = useCallback((id: string) => {
    togglePin(id);
  }, [togglePin]);

  const handleCloseEditor = useCallback(() => {
    setIsEditorOpen(false);
    setEditingNote(null);
  }, []);

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
    
    return cleanContent.length > 150 ? cleanContent.substring(0, 150) + '...' : cleanContent;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
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
    <div className="max-w-7xl mx-auto px-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Title level={2} className="!mb-0 flex items-center">
          <BookOutlined className="mr-3 text-[#057EC8]" />
          My Notes
        </Title>
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
      </div>

      {/* Filter Bar */}
      <Card 
        className="mb-6" 
        style={{ 
          backgroundColor: '#D8EFF0',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: '12px'
        }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Search
              placeholder="Search notes..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="All Courses"
              value={selectedCourse}
              onChange={setSelectedCourse}
              allowClear
              style={{ width: '100%' }}
              options={courseOptions.map(course => ({
                label: course.name,
                value: course.courseId
              }))}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="All Lessons"
              value={selectedLesson}
              onChange={setSelectedLesson}
              allowClear
              disabled={!selectedCourse}
              style={{ width: '100%' }}
              options={lessonOptions.map(lesson => ({
                label: lesson.name,
                value: lesson.lessonId
              }))}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Segmented
              value={sortBy}
              onChange={(value) => setSortBy(value as SortOption)}
              options={[
                { label: 'Newest', value: 'newest' },
                { label: 'Oldest', value: 'oldest' },
                { label: 'Pinned', value: 'pinned' }
              ]}
              style={{ 
                width: '100%',
                backgroundColor: 'white'
              }}
            />
          </Col>
        </Row>
      </Card>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <Card className="text-center py-12">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <div className="text-lg font-medium mb-2">
                  {searchText || selectedCourse || selectedLesson 
                    ? 'No notes found' 
                    : 'No notes yet'
                  }
                </div>
                <div className="text-gray-500 mb-4">
                  {searchText || selectedCourse || selectedLesson
                    ? 'Try adjusting your search or filters'
                    : 'Create your first note to get started'
                  }
                </div>
                {!searchText && !selectedCourse && !selectedLesson && (
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={handleNewNote}
                    style={{ 
                      backgroundColor: '#057EC8',
                      borderColor: '#057EC8'
                    }}
                  >
                    Create First Note
                  </Button>
                )}
              </div>
            }
          />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredNotes.map((note) => (
            <Col xs={24} sm={12} lg={8} key={note.id}>
              <Card
                hoverable
                className="h-full"
                style={{
                  borderRadius: '12px',
                  border: '1px solid rgba(0,0,0,0.08)',
                  transition: 'all 0.2s ease'
                }}
                bodyStyle={{ padding: '16px' }}
                actions={[
                  <Button
                    key="edit"
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => handleEditNote(note)}
                    title="Edit note"
                  />,
                  <Button
                    key="pin"
                    type="text"
                    icon={note.pinned ? <PushpinFilled /> : <PushpinOutlined />}
                    onClick={() => handleTogglePin(note.id)}
                    title={note.pinned ? 'Unpin note' : 'Pin note'}
                    style={{ color: note.pinned ? '#057EC8' : undefined }}
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
                    />
                  </Popconfirm>
                ]}
              >
                <div className="h-full flex flex-col">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <Title level={5} className="!mb-1 !text-base">
                        {getNoteTitle(note)}
                      </Title>
                      <div className="text-xs text-gray-500">
                        {formatDate(note.updatedAt)}
                      </div>
                    </div>
                    {note.pinned && (
                      <Tag 
                        color="#77BEF0" 
                        className="ml-2 text-xs"
                        icon={<PushpinFilled />}
                      >
                        Pinned
                      </Tag>
                    )}
                  </div>

                  {/* Content Preview */}
                  <div className="flex-1 mb-3">
                    <div className="text-sm text-gray-600 line-clamp-3">
                      {getNotePreview(note) || (
                        <span className="text-gray-400 italic">Empty note</span>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {note.tags.slice(0, 3).map((tag, index) => (
                        <Tag key={index} color="#77BEF0">
                          {tag}
                        </Tag>
                      ))}
                      {note.tags.length > 3 && (
                        <Tag color="default">
                          +{note.tags.length - 3}
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
