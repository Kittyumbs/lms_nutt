import React, { useState, useEffect, useCallback } from 'react';
import { 
  Drawer, 
  Input, 
  Select, 
  Button, 
  Space, 
  Typography, 
  Spin,
  Popconfirm,
  message,
  Tag,
  Divider
} from 'antd';
import { 
  BoldOutlined, 
  ItalicOutlined, 
  LinkOutlined, 
  UnorderedListOutlined,
  PushpinOutlined,
  PushpinFilled,
  DeleteOutlined,
  CloseOutlined,
  SaveOutlined,
  EyeOutlined
} from '@ant-design/icons';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDebounce } from 'use-debounce';

import type { Note } from '../../../hooks/useNotes';

const { TextArea } = Input;
const { Title, Text } = Typography;

// Simple ReactQuill component that works directly with Ant Design Form
const SimpleReactQuill: React.FC<{ value?: string; onChange?: (value: string) => void }> = ({ value, onChange }) => {
  const [isInitialized, setIsInitialized] = React.useState(false);
  
  // Set initialized after a short delay to prevent initial onChange
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  const handleChange = (newValue: string) => {
    // Only trigger onChange if it's not the initial render
    if (isInitialized && onChange) {
      onChange(newValue);
    }
  };
  
  const handleFocus = () => {
    if (!isInitialized) {
      setIsInitialized(true);
    }
  };
  
  return (
    <ReactQuill
      theme="snow"
      value={value || ''}
      onChange={handleChange}
      onFocus={handleFocus}
      style={{ height: '200px', marginBottom: '50px' }}
      modules={{
        toolbar: [
          [{ 'size': ['small', false, 'large', 'huge'] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'align': [] }],
          ['link'],
          ['clean']
        ],
        clipboard: {
          matchVisual: false,
          allowed: {
            tags: ['p', 'br', 'strong', 'em', 'u', 's', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'span'],
            attributes: ['href', 'target', 'style', 'class']
          }
        },
        history: {
          delay: 2000,
          maxStack: 500,
          userOnly: true
        }
      }}
      formats={[
        'size', 'bold', 'italic', 'underline', 'strike',
        'color', 'background', 'list', 'bullet', 'align', 'link'
      ]}
    />
  );
};

interface NotesEditorProps {
  isOpen: boolean;
  onClose: () => void;
  note?: Note | null;
  onSave: (note: Partial<Note> & { id?: string }) => Promise<Note>;
  onDelete?: (id: string) => Promise<void>;
  onTogglePin?: (id: string) => Promise<void>;
}

const NotesEditor: React.FC<NotesEditorProps> = ({
  isOpen,
  onClose,
  note,
  onSave,
  onDelete,
  onTogglePin
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Debounced content for autosave
  const [debouncedContent] = useDebounce(content, 500);
  const [debouncedTitle] = useDebounce(title, 500);
  const [debouncedTags] = useDebounce(tags, 500);

  // Initialize form when note changes
  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setContent(note.content || '');
      setTags(note.tags || []);
    } else {
      setTitle('');
      setContent('');
      setTags([]);
    }
    setLastSaved(null);
    setShowPreview(false);
  }, [note]);

  // Autosave effect
  useEffect(() => {
    if (isOpen && (debouncedContent || debouncedTitle || debouncedTags.length > 0)) {
      handleAutosave();
    }
  }, [debouncedContent, debouncedTitle, debouncedTags, isOpen]);

  const handleAutosave = useCallback(async () => {
    if (!isOpen) return;
    
    setIsSaving(true);
    try {
      const savedNote = await onSave({
        id: note?.id,
        title: debouncedTitle,
        content: debouncedContent,
        tags: debouncedTags
      });
      setLastSaved(new Date());
    } catch (error) {
      console.error('Autosave failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [isOpen, note?.id, debouncedTitle, debouncedContent, debouncedTags, onSave]);

  const handleDelete = useCallback(async () => {
    if (note?.id && onDelete) {
      try {
        await onDelete(note.id);
        onClose();
        message.success('Note deleted successfully');
      } catch (error) {
        console.error('Error deleting note:', error);
        message.error('Failed to delete note');
      }
    }
  }, [note?.id, onDelete, onClose]);

  const handleTogglePin = useCallback(async () => {
    if (note?.id && onTogglePin) {
      try {
        await onTogglePin(note.id);
      } catch (error) {
        console.error('Error toggling pin:', error);
        message.error('Failed to update note');
      }
    }
  }, [note?.id, onTogglePin]);


  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  return (
    <Drawer
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span>{note ? 'Edit Note' : 'New Note'}</span>
            {note && onTogglePin && (
              <Button
                type="text"
                size="small"
                icon={note.pinned ? <PushpinFilled /> : <PushpinOutlined />}
                onClick={handleTogglePin}
                title={note.pinned ? 'Unpin note' : 'Pin note'}
                style={{ color: note.pinned ? '#057EC8' : undefined }}
              />
            )}
          </div>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
          />
        </div>
      }
      placement="right"
      width={720}
      open={isOpen}
      onClose={onClose}
      styles={{
        body: { padding: 0 }
      }}
    >
      <div className="h-full flex flex-col">
        {/* Header Fields */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="mb-3">
            <Input
              placeholder="Note title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ fontSize: '16px', fontWeight: 500 }}
              size="large"
            />
          </div>
          <div>
            <Select
              mode="tags"
              placeholder="Add tags"
              value={tags}
              onChange={setTags}
              style={{ width: '100%' }}
              tokenSeparators={[',']}
              size="large"
            />
          </div>
        </div>

        {/* Preview Toggle */}
        <div className="p-3 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-end">
            <Button
              type={showPreview ? 'primary' : 'default'}
              icon={<EyeOutlined />}
              onClick={() => setShowPreview(!showPreview)}
              style={showPreview ? {
                backgroundColor: '#77BEF0',
                borderColor: '#77BEF0'
              } : {}}
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
          </div>
        </div>

        {/* Editor and Preview */}
        <div className="flex-1 flex">
          {/* Editor */}
          <div className={`${showPreview ? 'w-1/2' : 'w-full'} p-4 border-r border-gray-200`}>
            <div className="flex items-center justify-between mb-2">
              <Text type="secondary" className="text-sm">Editor</Text>
              <Text type="secondary" className="text-xs">
                {getWordCount(content)} words
              </Text>
            </div>
            <SimpleReactQuill
              value={content}
              onChange={setContent}
            />
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="w-1/2 p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <Text type="secondary" className="text-sm">Preview</Text>
                <Text type="secondary" className="text-xs">
                  {getWordCount(content)} words
                </Text>
              </div>
              <div className="prose prose-sm max-w-none overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                {content ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                      p: ({ children }) => <p className="mb-2 text-sm">{children}</p>,
                      ul: ({ children }) => <ul className="mb-2 text-sm">{children}</ul>,
                      ol: ({ children }) => <ol className="mb-2 text-sm">{children}</ol>,
                      li: ({ children }) => <li className="mb-1">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      a: ({ children, href }) => (
                        <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                          {children}
                        </a>
                      ),
                      code: ({ children }) => (
                        <code className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-gray-200 p-2 rounded text-xs font-mono overflow-x-auto">
                          {children}
                        </pre>
                      )
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                ) : (
                  <div className="text-gray-400 text-sm">Start typing to see preview...</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {isSaving ? (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Spin size="small" />
                  <span>Saving...</span>
                </div>
              ) : lastSaved ? (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <SaveOutlined />
                  <span>Saved • {formatTime(lastSaved)}</span>
                </div>
              ) : null}
              
              <div className="text-xs text-gray-400">
                {getWordCount(content)} words • {content.length} characters
              </div>
            </div>
            
            <Space>
              {note && onDelete && (
                <Popconfirm
                  title="Delete note?"
                  description="Are you sure you want to delete this note?"
                  onConfirm={handleDelete}
                  okText="Delete"
                  cancelText="Cancel"
                >
                  <Button danger icon={<DeleteOutlined />}>
                    Delete
                  </Button>
                </Popconfirm>
              )}
              <Button onClick={onClose}>
                Close
              </Button>
            </Space>
          </div>
        </div>
      </div>
    </Drawer>
  );
};

export default NotesEditor;