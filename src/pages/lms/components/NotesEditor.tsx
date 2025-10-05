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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDebounce } from 'use-debounce';

import type { Note } from '../../../hooks/useNotes';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface NotesEditorProps {
  isOpen: boolean;
  onClose: () => void;
  note?: Note | null;
  onSave: (note: Partial<Note> & { id?: string }) => Note;
  onDelete?: (id: string) => void;
  onTogglePin?: (id: string) => void;
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
      const savedNote = onSave({
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

  const handleDelete = useCallback(() => {
    if (note?.id && onDelete) {
      onDelete(note.id);
      onClose();
      message.success('Note deleted successfully');
    }
  }, [note?.id, onDelete, onClose]);

  const handleTogglePin = useCallback(() => {
    if (note?.id && onTogglePin) {
      onTogglePin(note.id);
    }
  }, [note?.id, onTogglePin]);

  const insertMarkdown = useCallback((markdown: string) => {
    const textarea = document.querySelector('.notes-editor-textarea textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = content.substring(start, end);
      const newText = content.substring(0, start) + markdown + selectedText + content.substring(end);
      setContent(newText);
      
      // Focus back to textarea after a short delay
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + markdown.length, start + markdown.length + selectedText.length);
      }, 0);
    }
  }, [content]);

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

        {/* Toolbar */}
        <div className="p-3 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <Space.Compact>
              <Button
                type="text"
                icon={<BoldOutlined />}
                onClick={() => insertMarkdown('**')}
                title="Bold"
              />
              <Button
                type="text"
                icon={<ItalicOutlined />}
                onClick={() => insertMarkdown('*')}
                title="Italic"
              />
              <Button
                type="text"
                icon={<UnorderedListOutlined />}
                onClick={() => insertMarkdown('- ')}
                title="Bullet List"
              />
              <Button
                type="text"
                icon={<LinkOutlined />}
                onClick={() => insertMarkdown('[link](url)')}
                title="Link"
              />
              <Button
                type="text"
                onClick={() => insertMarkdown('# ')}
                title="Heading"
              >
                H1
              </Button>
            </Space.Compact>
            
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
            <TextArea
              className="notes-editor-textarea"
              placeholder="Start writing your note in Markdown..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              autoSize={{ minRows: 20 }}
              style={{
                border: 'none',
                boxShadow: 'none',
                fontSize: '14px',
                lineHeight: '1.6',
                resize: 'none'
              }}
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